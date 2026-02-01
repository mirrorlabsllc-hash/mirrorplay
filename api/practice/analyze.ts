import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { requireOpenAI, handleOpenAIError } from "../../server/services/openaiClient";
import { canAnalyze } from "../../server/subscriptionLimits";
import { updateStreak, checkAndAwardBadges } from "../../server/badgeService";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  return 1;
}

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
    const category = body?.category as string | undefined;
    const quickMode = body?.quickMode === true;

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

    const systemPrompt = quickMode
      ? `You are a voice-first communication coach. Deliver spoken-friendly, presence-first analysis. Never ask questions. No theory lectures. Keep it calm, precise, human.

Category voice (adapt your wording):
- relationships: safety, attunement, emotional impact; warm and connecting; avoid corporate jargon.
- workplace: clarity, ownership, outcomes; professional and steady; avoid therapy language.
- boundaries: self-respect, calm limits, firmness without edge.
- conflict/difficult: restraint, tone control, de-escalation under pressure.

Difficulty voice (if not provided, assume intermediate):
- beginner: softer, validating, light on critique.
- intermediate: balanced reflection + refinement.
- advanced: sharper, precise, higher expectation of control.

Output fields:
- tone: primary tone label.
- score: 0-100.
- tip: 2-3 short sentences in this order: presence reflection (what they conveyed emotionally), performance insight (how it landed), optional forward cue (tiny adjustment). No questions. No bullet lists. Natural to speak aloud.

JSON only:
{
  "tone": "string",
  "score": number,
  "tip": "string"
}`
      : `You are a voice-first communication coach. Deliver presence (emotional awareness) plus performance (communication effectiveness). Never ask questions. No theory or meta commentary. Calm, precise, human.

Category voice:
- relationships: safety, attunement, emotional impact; warm and connecting.
- workplace: clarity, professionalism, boundaries, outcomes.
- boundaries: firm, calm limits; self-respect without edge.
- conflict/difficult: regulation under pressure; restraint and de-escalation.

Difficulty voice (if not provided, assume intermediate):
- beginner: softer, validating, light critique.
- intermediate: balanced reflection + refinement.
- advanced: sharp, concise, expects control.

Produce concise, spoken-friendly strings (no bullets, no lists in text fields). For any text fields below, avoid questions.

Fields to return:
- tone: primary tone label
- secondaryTone: secondary tone label or null
- score: 0-100
- energy: "low" | "medium" | "high"
- pace: "slow" | "moderate" | "fast"
- emotionalClarity: 0-100 clarity
- strengths: 2-3 short observation sentences (presence/performance focus)
- areasToImprove: 2-3 short observation sentences (action-oriented, no questions)
- coachingInsight: 2-3 sentences in order: presence reflection, performance insight, forward cue. Spoken-friendly, no questions.
- exampleResponses: 3 concise alternative phrasings (one sentence each; no questions)
- whyItMatters: 1-2 short sentences linking their delivery to impact
- bodyLanguageTip: 1 short line on delivery/pace/voice/stance

JSON only:
{
  "tone": "string",
  "secondaryTone": "string or null",
  "score": number,
  "energy": "low" | "medium" | "high",
  "pace": "slow" | "moderate" | "fast",
  "emotionalClarity": number,
  "strengths": ["string"],
  "areasToImprove": ["string"],
  "coachingInsight": "string",
  "exampleResponses": ["string", "string", "string"],
  "whyItMatters": "string",
  "bodyLanguageTip": "string"
}`;

    const analysis = await requireOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: `Category: ${category || "general"}\nScenario: ${prompt}\nUser's Response: ${responseText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(analysis.choices[0].message.content || "{}");

    const score = result.score || 50;
    const xpMultiplier = quickMode ? 0.5 : 1;
    const baseXp = Math.floor((10 + (score / 100) * 20) * xpMultiplier);
    const ppEarned = Math.floor((5 + (score / 100) * 10) * xpMultiplier);

    const { streakBonus, currentStreak } = await updateStreak(user.id);
    const multiplier = getStreakMultiplier(currentStreak);
    const xpEarned = Math.floor(baseXp * multiplier) + streakBonus;

    const session = await storage.createPracticeSession({
      userId: user.id,
      prompt,
      response: responseText,
      category,
      mode: quickMode ? "quick" : "text",
      tone: result.tone,
      score,
      tips: quickMode ? (result.tip ? [result.tip] : []) : result.tips,
      exampleResponses: quickMode ? [] : result.exampleResponses,
      xpEarned,
      ppEarned,
    });

    let bestMomentCreated = false;
    if (score >= 85) {
      try {
        const insightResponse = await requireOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an expert communication coach. Analyze this excellent response and explain what made it exceptional. Generate a short title (5-8 words), extract a key excerpt (1-2 sentences from the response that showcase the best part), provide an AI insight (2-3 sentences explaining what made it great), and suggest 2-3 relevant tags.
                
Respond in JSON format:
{
  "title": "string",
  "excerpt": "string",
  "aiInsight": "string",
  "tags": ["tag1", "tag2"]
}`,
            },
            {
              role: "user",
              content: `Scenario: ${prompt}\n\nResponse (score: ${score}): ${responseText}\nTone: ${result.tone}\nCategory: ${category || "general"}`,
            },
          ],
          response_format: { type: "json_object" },
        });

        const insightResult = JSON.parse(
          insightResponse.choices[0].message.content || "{}"
        );

        await storage.createBestMoment({
          userId: user.id,
          sessionId: session.id,
          title: insightResult.title || `Excellent ${result.tone} Response`,
          excerpt: insightResult.excerpt || responseText.substring(0, 150),
          category: category || "general",
          score,
          aiInsight: insightResult.aiInsight,
          tags: insightResult.tags,
          isPublic: false,
        });
        bestMomentCreated = true;
      } catch (momentError) {
        console.error("Error creating best moment:", momentError);
      }
    }

    const progress = await storage.getProgress(user.id);
    if (progress) {
      const oldLevel = progress.level || 1;
      const newTotalXp = (progress.totalXp || 0) + xpEarned;
      const newLevel = Math.floor(newTotalXp / 100) + 1;
      await storage.updateProgress(user.id, {
        totalXp: newTotalXp,
        totalPp: (progress.totalPp || 0) + ppEarned,
        practiceCount: (progress.practiceCount || 0) + 1,
        level: newLevel,
      });

      if (newLevel > oldLevel) {
        try {
          await storage.createCommunityPost({
            userId: user.id,
            type: "milestone",
            content: `Reached Level ${newLevel}!`,
            metadata: {
              level: newLevel,
              previousLevel: oldLevel,
              autoShared: true,
            },
          });
        } catch (postError) {
          console.error("Failed to auto-share level-up:", postError);
        }
      }
    }

    const newBadges = await checkAndAwardBadges({
      userId: user.id,
      eventType: "practice",
      score,
      mode: "text",
    });

    if (quickMode) {
      res.status(200).json({
        tone: result.tone,
        score,
        tip: result.tip || (result.tips ? result.tips[0] : "Keep practicing!"),
        xpEarned,
        ppEarned,
        currentStreak,
        quickMode: true,
      });
    } else {
      res.status(200).json({
        ...result,
        xpEarned,
        ppEarned,
        streakBonus,
        currentStreak,
        streakMultiplier: multiplier,
        bestMomentCreated,
        newBadges: newBadges.map((b) => ({
          name: b.name,
          icon: b.icon,
          description: b.description,
        })),
      });
    }
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error analyzing practice:", error);
    res.status(500).json({ message: "Failed to analyze response" });
  }
}
