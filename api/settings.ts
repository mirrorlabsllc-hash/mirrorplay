import { storage } from "../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../server/supabaseServer";
import { getJsonBody, type ReqLike, type ResLike } from "../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "PATCH") {
    res.setHeader("Allow", "PATCH");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const textInputEnabled = body?.textInputEnabled === true;

    let progress = await storage.getProgress(user.id);
    if (!progress) {
      progress = await storage.createProgress({ userId: user.id });
    }

    const updated = await storage.updateProgress(user.id, {
      textInputEnabled,
    });

    res.status(200).json(updated);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Failed to update settings" });
  }
}
