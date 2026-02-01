import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { type ReqLike, type ResLike } from "../../lib/apiUtils.js";

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

