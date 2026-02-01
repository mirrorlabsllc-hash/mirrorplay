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
    const progress = await storage.getProgress(user.id);

    if (!progress) {
      return res.status(200).json({
        currentStreak: 0,
        bestStreak: 0,
        lastPracticeDate: null,
        streakBonus: 0,
      });
    }

    const currentStreak = progress.currentStreak || 0;
    const streakBonus = Math.min(currentStreak * 5, 50);

    res.status(200).json({
      currentStreak,
      bestStreak: progress.bestStreak || 0,
      lastPracticeDate: progress.lastCheckIn,
      streakBonus,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching streak:", error);
    res.status(500).json({ message: "Failed to fetch streak" });
  }
}

