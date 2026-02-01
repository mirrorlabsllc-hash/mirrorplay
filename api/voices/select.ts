import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { getJsonBody, type ReqLike, type ResLike } from "../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const voiceId = body?.voiceId as string | undefined;
    const ttsEnabled = body?.ttsEnabled;

    if (!voiceId) {
      return res.status(400).json({ message: "Voice ID is required" });
    }

    const prefs = await storage.upsertUserVoicePreferences(user.id, {
      selectedVoiceId: voiceId,
      ttsEnabled: ttsEnabled !== false,
    });

    res.status(200).json({ success: true, preferences: prefs });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error saving voice selection:", error);
    res.status(500).json({ message: "Failed to save voice selection" });
  }
}

