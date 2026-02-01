import { storage } from "../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../lib/supabaseServer.js";
import { PRACTICE_HANDOFFS, DEFAULT_HANDOFF_LINE } from "@shared/promptBank";
import { type ReqLike, type ResLike } from "../lib/apiUtils.js";

const CATEGORIES = ["workplace", "relationships", "family", "social", "self-advocacy"];

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const today = new Date();

    let capsule = await storage.getDailyCapsule(user.id, today);

    if (!capsule) {
      const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
      const questions = Array.from({ length: 3 }, () => {
        const prompt = PRACTICE_HANDOFFS[Math.floor(Math.random() * PRACTICE_HANDOFFS.length)];
        return prompt?.line ?? DEFAULT_HANDOFF_LINE;
      });

      capsule = await storage.createDailyCapsule({
        userId: user.id,
        category,
        questions,
        selectedQuestionIndex: 0,
        completed: false,
        capsuleDate: today,
      });
    }

    res.status(200).json(capsule);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching daily capsule:", error);
    res.status(500).json({ message: "Failed to fetch daily capsule" });
  }
}

