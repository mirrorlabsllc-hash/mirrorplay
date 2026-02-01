import { DEFAULT_VOICES, isElevenLabsAvailable } from "../../server/elevenLabsClient";
import { type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  res.status(200).json({
    voices: DEFAULT_VOICES,
    ttsAvailable: isElevenLabsAvailable(),
  });
}
