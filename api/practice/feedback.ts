import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { requireOpenAI, handleOpenAIError } from "../../server/services/openaiClient";
import { canAnalyze } from "../../server/subscriptionLimits";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const prompt = body?.prompt as string | undefined;
    const responseText = body?.response as string | undefined;

    if (!prompt || !responseText) {
      return res.status(400).json({ message: "Prompt and response are required" });
    }

    const usageCheck = await canAnalyze(user.id);
    if (!usageCheck.allowed) {
      return res.status(402).json({
        message: "Daily analysis limit reached. Upgrade your subscription for more analyses.",
        tier: usageCheck.tier,
        limit: usageCheck.limit,
        usedToday: usageCheck.usedToday,
        upgradeRequired: true,
      });
    }

    const systemPrompt = `You are Mirror AI, an emotional-intelligence coach.

The user has written a response to a difficult real-life conversation prompt.

Your job is NOT to reply as the other person.
Your job is NOT to continue a conversation.
Your job is to analyze the user's response and give constructive feedback.

Analyze the response across these dimensions:
- Clarity
- Emotional awareness
- Tone
- Needs & boundaries
- Emotional impact on the other person

Respond in this exact JSON structure:
{
  "overallRead": "One short paragraph summarizing how the message comes across.",
  "whatsWorking": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "whatCouldBeStronger": ["Specific actionable suggestion 1", "Specific actionable suggestion 2"],
  "optionalRewrite": "A revised version that preserves the user's voice but improves clarity and tone. Optional - include only if significant improvements can be made."
}

Guidelines:
- Be supportive and practical
- No shaming
- No over-therapizing
- Be concise and human
- Focus on actionable improvements`;

    const analysis = await requireOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Scenario: ${prompt}\n\nUser's Response: "${responseText}"` },
      ],
      response_format: { type: "json_object" },
    });

    const feedback = JSON.parse(analysis.choices[0].message.content || "{}");

    const xpEarned = 15;
    const ppEarned = 5;

    const progress = await storage.getProgress(user.id);
    if (progress) {
      await storage.updateProgress(user.id, {
        totalXp: (progress.totalXp || 0) + xpEarned,
        totalPp: (progress.totalPp || 0) + ppEarned,
        practiceCount: (progress.practiceCount || 0) + 1,
      });
    }

    res.status(200).json({
      feedback,
      xpEarned,
      ppEarned,
    });
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error generating practice feedback:", error);
    res.status(500).json({ message: "Failed to generate feedback" });
  }
}
