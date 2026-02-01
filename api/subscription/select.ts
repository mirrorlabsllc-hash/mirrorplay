import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const allowManual =
      process.env.ALLOW_MANUAL_SUBSCRIPTION === "true" ||
      process.env.NODE_ENV !== "production";

    if (!allowManual) {
      return res.status(403).json({ message: "Manual subscription selection is disabled" });
    }

    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const tier = body?.tier as string | undefined;
    const allowedTiers = ["free", "peace_plus", "pro_mind"];

    if (!tier || !allowedTiers.includes(tier)) {
      return res.status(400).json({ message: "Invalid subscription tier" });
    }

    let subscription = await storage.getSubscription(user.id);
    if (!subscription) {
      subscription = await storage.createSubscription({
        userId: user.id,
        tier,
        status: "active",
      });
    } else {
      subscription = await storage.updateSubscription(user.id, {
        tier,
        status: "active",
      });
    }

    return res.status(200).json(subscription);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error selecting subscription tier:", error);
    return res.status(500).json({ message: "Failed to update subscription" });
  }
}
