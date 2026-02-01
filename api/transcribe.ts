import { requireSupabaseUser, SupabaseAuthError } from "../server/supabaseServer";
import { requireOpenAI, handleOpenAIError } from "../server/services/openaiClient";
import { getJsonBody, type ReqLike, type ResLike } from "../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const audioBase64 = body?.audioBase64 as string | undefined;

    if (!audioBase64) {
      return res.status(400).json({ message: "Audio data is required" });
    }

    const audioBuffer = Buffer.from(audioBase64, "base64");
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    const transcription = await requireOpenAI().audio.transcriptions.create({
      file: audioFile,
      model: "whisper-1",
    });

    const text = transcription.text;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        message: "Could not transcribe audio. Please try speaking more clearly.",
      });
    }

    res.status(200).json({ text });
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error transcribing audio:", error);
    res.status(500).json({ message: "Failed to transcribe audio" });
  }
}
