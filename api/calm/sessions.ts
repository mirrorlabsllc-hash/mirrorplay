import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);

    if (req.method === "GET") {
      const sessions = await storage.getCalmSessions(user.id);
      return res.status(200).json(sessions);
    }

    const body = getJsonBody(req);
    const exerciseType = body?.exerciseType as string | undefined;
    const duration = body?.duration as number | undefined;
    const completedCycles = body?.completedCycles as number | undefined;

    if (!exerciseType || typeof duration !== "number" || typeof completedCycles !== "number") {
      return res.status(400).json({ message: "Invalid session payload" });
    }

    const session = await storage.createCalmSession({
      userId: user.id,
      exerciseType,
      duration,
      completedCycles,
    });

    return res.status(200).json(session);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error handling calm sessions:", error);
    return res.status(500).json({ message: "Failed to handle calm sessions" });
  }
}
