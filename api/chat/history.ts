import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { getQueryParam, type ReqLike, type ResLike } from "../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const limitParam = getQueryParam(req, "limit");
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const allConversations = await storage.getAllConversations(
      user.id,
      Number.isFinite(limit) && limit > 0 ? limit : 50
    );

    res.status(200).json(allConversations);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching conversation history:", error);
    res.status(500).json({ message: "Failed to fetch conversation history" });
  }
}

