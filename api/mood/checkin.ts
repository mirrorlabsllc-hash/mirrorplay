import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

const MOOD_TO_WEATHER: Record<string, string> = {
  calm: "mist",
  happy: "sun",
  anxious: "wind",
  frustrated: "storm",
  sad: "rain",
  energized: "sun",
  tired: "clouds",
  hopeful: "rainbow",
};

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const mood = body?.mood as string | undefined;
    const intensity = body?.intensity as number | undefined;
    const note = body?.note as string | undefined;

    if (!mood) {
      return res.status(400).json({ message: "Mood is required" });
    }

    const weatherEffect = MOOD_TO_WEATHER[mood] || "clouds";
    const checkin = await storage.createMoodCheckin(
      user.id,
      mood,
      intensity || 5,
      note || null,
      weatherEffect
    );

    res.status(200).json({ checkin, weatherEffect });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error creating mood check-in:", error);
    res.status(500).json({ message: "Failed to create mood check-in" });
  }
}
