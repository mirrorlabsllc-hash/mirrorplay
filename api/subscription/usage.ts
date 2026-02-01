import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { getDailyLimit, getDailyUsage, getSubscriptionTier } from "../../lib/subscriptionLimits.js";
import { type ReqLike, type ResLike } from "../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const tier = await getSubscriptionTier(user.id);
    const dailyLimit = getDailyLimit(tier);
    const usedToday = await getDailyUsage(user.id);
    const remainingToday = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - usedToday);
    const allowed = dailyLimit === Infinity || usedToday < dailyLimit;

    res.status(200).json({
      tier,
      dailyLimit: dailyLimit === Infinity ? "unlimited" : dailyLimit,
      usedToday,
      remainingToday: remainingToday === Infinity ? "unlimited" : remainingToday,
      allowed,
      remaining: remainingToday === Infinity ? Infinity : remainingToday,
      limit: dailyLimit === Infinity ? Infinity : dailyLimit,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching subscription usage:", error);
    res.status(500).json({ message: "Failed to fetch subscription usage" });
  }
}

