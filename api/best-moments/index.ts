import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { type ReqLike, type ResLike } from "../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const moments = await storage.getUserBestMoments(user.id);
    res.status(200).json(moments);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching best moments:", error);
    res.status(500).json({ message: "Failed to fetch best moments" });
  }
}

