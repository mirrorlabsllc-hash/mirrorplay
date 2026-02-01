import { storage } from "../server/storage";
import { insertUserFeedbackSchema, type InsertPrototypeFeedback } from "@shared/schema";
import { requireSupabaseUser, SupabaseAuthError } from "../server/supabaseServer";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function getJsonBody(req: ReqLike): Record<string, any> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return req.body as Record<string, any>;
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    let userId: string | null = null;
    try {
      const user = await requireSupabaseUser(req);
      userId = user.id;
    } catch (error) {
      if (!(error instanceof SupabaseAuthError) || error.status !== 401) {
        throw error;
      }
    }

    const body = getJsonBody(req);
    const { type, message, consent_public, context, platform, tags, category, difficulty, scenario_id, app_version } = body;

    const feedbackData = {
      ...body,
      userId,
      status: "new",
    };

    const parseResult = insertUserFeedbackSchema.safeParse(feedbackData);
    if (parseResult.success) {
      await storage.createUserFeedback(parseResult.data);
    }

    try {
      const protoEntry = {
        platform: platform || "web",
        feedbackText: message || body.message || "",
        tags: tags || [],
        category: (context && context.category) || category || null,
        difficulty: (context && context.difficulty) || difficulty || null,
        scenarioId: (context && context.scenario_id) || scenario_id || null,
        appVersion: app_version || body.app_version || null,
        anonymousUserId: userId ? null : (body.anonymousUserId || null),
        type: type || body.type || null,
        consentPublic: !!consent_public,
      } as InsertPrototypeFeedback;

      const created = await storage.createPrototypeFeedback(protoEntry);
      return res.status(200).json(created);
    } catch (err) {
      console.error("Failed to write prototype feedback:", err);
      return res.status(500).json({ message: "Failed to submit feedback" });
    }
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error submitting feedback:", error);
    res.status(500).json({ message: "Failed to submit feedback" });
  }
}
