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
    const checkIn = await storage.getTodayMoodCheckIn(user.id);
    res.status(200).json(checkIn || null);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching today's mood:", error);
    res.status(500).json({ message: "Failed to fetch mood check-in" });
  }
}
