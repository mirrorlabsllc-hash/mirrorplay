import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { getJsonBody, type ReqLike, type ResLike } from "../../lib/apiUtils.js";

const VALID_MOODS = [
  "calm",
  "happy",
  "anxious",
  "frustrated",
  "sad",
  "energized",
  "tired",
  "hopeful",
];

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const mood = body?.mood as string | undefined;
    const note = body?.note as string | undefined;

    if (!mood || !VALID_MOODS.includes(mood)) {
      return res.status(400).json({
        message: `Invalid mood. Must be one of: ${VALID_MOODS.join(", ")}`,
      });
    }

    const checkIn = await storage.createMoodCheckIn({
      userId: user.id,
      mood,
      note: note || null,
      checkInDate: new Date(),
    });

    res.status(200).json(checkIn);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error saving mood check-in:", error);
    res.status(500).json({ message: "Failed to save mood check-in" });
  }
}

