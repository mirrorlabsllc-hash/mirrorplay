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
    const audioBase64 = body?.audioBase64 as string | undefined;
    const duration = body?.duration as number | undefined;
    const prompt = body?.prompt as string | undefined;
    const category = body?.category as string | undefined;
    const textResponse = body?.response as string | undefined;

    if (!prompt) {
      return res.status(400).json({ message: "Prompt is required" });
    }

    if (!audioBase64 && !textResponse) {
      return res.status(400).json({ message: "Either audio data or text response is required" });
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

    const audioDuration = duration || 0;
    let transcribedText = textResponse;

    if (audioBase64 && !textResponse) {
      const audioBuffer = Buffer.from(audioBase64, "base64");
      const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

      const transcription = await requireOpenAI().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      transcribedText = transcription.text;
    }

    if (!transcribedText || transcribedText.trim().length === 0) {
      return res.status(400).json({
        message: "No response provided. Please try speaking or typing.",
      });
    }

    const wordCount = transcribedText.split(/\s+/).filter((w: string) => w.length > 0).length;
    const wordsPerMinute = audioDuration > 0 ? Math.round((wordCount / audioDuration) * 60) : 0;

    const fillerWords = [
      "um",
      "uh",
      "like",
      "you know",
      "basically",
      "actually",
      "literally",
      "so",
      "well",
      "right",
      "i mean",
      "kind of",
      "sort of",
    ];
    const lowerText = transcribedText.toLowerCase();
    let fillerWordCount = 0;
    const detectedFillers: string[] = [];

    for (const filler of fillerWords) {
      const regex = new RegExp(`\\b${filler}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) {
        fillerWordCount += matches.length;
        if (!detectedFillers.includes(filler)) {
          detectedFillers.push(filler);
        }
      }
    }

    const analysis = await requireOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a voice-first communication coach. Deliver presence (emotional awareness) plus performance (communication effectiveness). Never ask questions. No theory or meta commentary. Calm, precise, human.
            
Category voice:
- relationships: safety, attunement, emotional impact; warm and connecting.
- workplace: clarity, professionalism, boundaries, outcomes.
- boundaries: firm, calm limits; self-respect without edge.
- conflict/difficult: regulation under pressure; restraint and de-escalation.

Difficulty voice (if not provided, assume intermediate):
- beginner: softer, validating, light critique.
- intermediate: balanced reflection + refinement.
- advanced: sharp, concise, expects control.

Produce concise, spoken-friendly strings (no bullets, no lists in text fields). Avoid questions in any text field.

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
}`,
        },
        {
          role: "user",
          content: `Category: ${category || "general"}\nScenario: ${prompt}\nUser's Spoken Response (transcribed): ${transcribedText}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(analysis.choices[0].message.content || "{}");

    const score = result.score || 50;
    const baseXp = Math.floor(15 + (score / 100) * 25);
    const ppEarned = Math.floor(8 + (score / 100) * 12);

    const { streakBonus, currentStreak } = await updateStreak(user.id);
    const multiplier = getStreakMultiplier(currentStreak);
    const xpEarned = Math.floor(baseXp * multiplier) + streakBonus;

    let paceFeedback = "Good pace";
    if (wordsPerMinute < 100) {
      paceFeedback = "Speaking slowly - try to increase pace slightly";
    } else if (wordsPerMinute > 170) {
      paceFeedback = "Speaking quickly - try to slow down for clarity";
    } else if (wordsPerMinute >= 120 && wordsPerMinute <= 150) {
      paceFeedback = "Excellent speaking pace";
    }

    const session = await storage.createPracticeSession({
      userId: user.id,
      prompt,
      response: transcribedText,
      category,
      mode: "voice",
      tone: result.tone,
      score,
      tips: result.coachingInsight
        ? [result.coachingInsight]
        : result.tip
          ? [result.tip]
          : [],
      exampleResponses: result.exampleResponses || result.alternatives || [],
      audioDuration,
      wordsPerMinute,
      fillerWordCount,
      transcription: transcribedText,
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
              content: `You are an expert communication and voice coach. Analyze this excellent spoken response and explain what made it exceptional. Generate a short title (5-8 words), extract a key excerpt (1-2 sentences from the transcription that showcase the best part), provide an AI insight (2-3 sentences explaining what made it great including any notable vocal delivery aspects), and suggest 2-3 relevant tags.
                
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
              content: `Scenario: ${prompt}\n\nSpoken Response (score: ${score}): ${transcribedText}\nTone: ${result.tone}\nCategory: ${category || "general"}\nWords Per Minute: ${wordsPerMinute}`,
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
          excerpt: insightResult.excerpt || transcribedText.substring(0, 150),
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
      eventType: "voice_practice",
      score,
      mode: "voice",
    });

    res.status(200).json({
      ...result,
      transcription: transcribedText,
      wordCount,
      wordsPerMinute,
      paceFeedback,
      fillerWordCount,
      detectedFillers,
      audioDuration,
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
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error analyzing voice practice:", error);
    res.status(500).json({ message: "Failed to analyze voice response" });
  }
}
