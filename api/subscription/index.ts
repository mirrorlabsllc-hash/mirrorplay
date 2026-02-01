import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    let subscription = await storage.getSubscription(user.id);

    if (!subscription) {
      subscription = await storage.createSubscription({
        userId: user.id,
        tier: "free",
        status: "active",
      });
    }

    return res.status(200).json(subscription);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching subscription:", error);
    return res.status(500).json({ message: "Failed to fetch subscription" });
  }
}
