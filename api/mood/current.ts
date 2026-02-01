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
    const checkin = await storage.getLatestMoodCheckin(user.id);

    if (!checkin) {
      return res.status(200).json({ mood: null, weatherEffect: "clouds" });
    }

    res.status(200).json({
      mood: checkin.mood,
      intensity: checkin.intensity,
      weatherEffect: checkin.weatherEffect || "clouds",
      checkedAt: checkin.createdAt,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching current mood:", error);
    res.status(500).json({ message: "Failed to fetch current mood" });
  }
}
