import { storage } from "../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../server/supabaseServer";
import { textToSpeech, isElevenLabsAvailable, type TtsSection } from "../server/elevenLabsClient";
import { getJsonBody, type ReqLike, type ResLike } from "../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const text = body?.text as string | undefined;
    const voiceId = body?.voiceId as string | undefined;
    const section = body?.section as TtsSection | string | undefined;
    const difficulty = body?.difficulty as
      | "beginner"
      | "intermediate"
      | "advanced"
      | string
      | undefined;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ message: "Text is required" });
    }

    if (!isElevenLabsAvailable()) {
      return res.status(503).json({ message: "TTS not available" });
    }

    const prefs = await storage.getUserVoicePreferences(user.id);
    const selectedVoiceId = voiceId || prefs?.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM";

    const allowedSections: TtsSection[] = [
      "general",
      "scenario",
      "analysis-what",
      "analysis-how",
      "analysis-reframe",
    ];
    const sectionHint: TtsSection = allowedSections.includes(section as TtsSection)
      ? (section as TtsSection)
      : "general";

    const difficultyHint =
      difficulty === "beginner" || difficulty === "advanced"
        ? difficulty
        : "intermediate";

    const audioBuffer = await textToSpeech(text.slice(0, 500), selectedVoiceId, {
      section: sectionHint,
      difficulty: difficultyHint,
    });

    if (!audioBuffer) {
      return res.status(500).json({ message: "Failed to generate speech" });
    }

    const audioBase64 = audioBuffer.toString("base64");
    res.status(200).json({ audio: audioBase64 });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error generating TTS:", error);
    res.status(500).json({ message: "Failed to generate speech" });
  }
}
