import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { isElevenLabsAvailable } from "../../server/elevenLabsClient";
import { type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const prefs = await storage.getUserVoicePreferences(user.id);
    const voiceClones = await storage.getUserVoiceClones(user.id);

    res.status(200).json({
      preferences: prefs || { selectedVoiceId: "21m00Tcm4TlvDq8ikWAM", ttsEnabled: true },
      voiceClones,
      ttsAvailable: isElevenLabsAvailable(),
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching user voice settings:", error);
    res.status(500).json({ message: "Failed to fetch voice settings" });
  }
}
