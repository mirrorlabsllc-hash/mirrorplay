import { isElevenLabsAvailable, textToSpeech } from "../../../server/elevenLabsClient";
import { getLastPathSegment, getQueryParam, type ReqLike, type ResLike } from "../../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const voiceId = getQueryParam(req, "voiceId") || getLastPathSegment(req);

    if (!voiceId) {
      return res.status(400).json({ message: "Voice ID is required" });
    }

    if (!isElevenLabsAvailable()) {
      return res.status(503).json({ message: "TTS not available" });
    }

    const audioBuffer = await textToSpeech(
      "Hello, I'm your AI companion. How can I help you today?",
      voiceId,
      { section: "general" }
    );

    if (!audioBuffer) {
      return res.status(500).json({ message: "Failed to generate sample" });
    }

    res.setHeader("Content-Type", "audio/mpeg");
    if (res.end) {
      res.status(200);
      return res.end(audioBuffer);
    }

    if (res.send) {
      res.status(200);
      return res.send(audioBuffer);
    }

    res.status(200).json({ audio: audioBuffer.toString("base64") });
  } catch (error) {
    console.error("Error generating voice sample:", error);
    res.status(500).json({ message: "Failed to generate sample" });
  }
}
