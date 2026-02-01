import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { getRequestUrl, type ReqLike, type ResLike } from "../../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const url = getRequestUrl(req);
    const daysParam = url.searchParams.get("days");
    const parsedDays = daysParam ? parseInt(daysParam, 10) : NaN;
    const days = Number.isFinite(parsedDays) && parsedDays > 0 ? parsedDays : 7;

    const history = await storage.getMoodHistory(user.id, days);
    res.status(200).json(history);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching mood history:", error);
    res.status(500).json({ message: "Failed to fetch mood history" });
  }
}

