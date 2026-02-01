import { storage } from "../../../lib/storage.js";
import { getLastPathSegment, getQueryParam, type ReqLike, type ResLike } from "../../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const userId = getQueryParam(req, "userId") || getLastPathSegment(req);

    if (!userId) {
      return res.status(400).json({ message: "Missing user id" });
    }

    const moments = await storage.getPublicBestMoments(userId);
    for (const moment of moments) {
      await storage.incrementBestMomentViewCount(moment.id);
    }

    res.status(200).json(moments);
  } catch (error) {
    console.error("Error fetching public best moments:", error);
    res.status(500).json({ message: "Failed to fetch public best moments" });
  }
}
