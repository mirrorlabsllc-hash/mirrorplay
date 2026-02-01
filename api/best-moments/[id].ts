import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { getJsonBody, getLastPathSegment, getQueryParam, type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const id = getQueryParam(req, "id") || getLastPathSegment(req);

    if (!id) {
      return res.status(400).json({ message: "Missing best moment id" });
    }

    const body = getJsonBody(req);
    const isPublic = body?.isPublic;

    if (typeof isPublic !== "boolean") {
      return res.status(400).json({ message: "isPublic must be a boolean" });
    }

    const moment = await storage.getBestMoment(id);
    if (!moment) {
      return res.status(404).json({ message: "Moment not found" });
    }

    if (moment.userId !== user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const updated = await storage.updateBestMomentVisibility(id, isPublic);
    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error updating best moment:", error);
    res.status(500).json({ message: "Failed to update best moment" });
  }
}
