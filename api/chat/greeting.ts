import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { requireOpenAI, handleOpenAIError } from "../../server/services/openaiClient";
import { isElevenLabsAvailable, textToSpeech } from "../../server/elevenLabsClient";
import { getJsonBody, type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const body = getJsonBody(req);
    const includeTts = body?.includeTts === true;
    const voiceId = body?.voiceId as string | undefined;

    const [userRecord, progress, badges, subscription, recentSessions] = await Promise.all([
      storage.getUser(user.id),
      storage.getProgress(user.id),
      storage.getUserBadges(user.id),
      storage.getSubscription(user.id),
      storage.getPracticeSessions(user.id, 5),
    ]);

    const userName = userRecord?.firstName || "friend";
    const level = progress?.level || 1;
    const currentStreak = progress?.currentStreak || 0;
    const totalSessions = progress?.practiceCount || 0;
    const recentBadges = badges.slice(0, 3).map((b) => b.badge.name);

    const categoryCount: Record<string, number> = {};
    for (const session of recentSessions) {
      const cat = session.category || "general";
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    }
    const topCategories = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([cat]) => cat);

    let contextInfo = "";
    if (totalSessions === 0) {
      contextInfo = "This is their first time using the app.";
    } else {
      contextInfo = `They are level ${level}. `;
      if (currentStreak > 0) {
        contextInfo += `They have a ${currentStreak}-day streak. `;
      }
      if (recentBadges.length > 0) {
        contextInfo += `Recent badges: ${recentBadges.join(", ")}. `;
      }
      if (topCategories.length > 0) {
        contextInfo += `They often practice: ${topCategories.join(", ")}.`;
      }
    }

    const greetingResponse = await requireOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Mirror AI, a warm and supportive emotional intelligence coach. 
Generate a SHORT personalized greeting (1-2 sentences max) for the user.
Be warm, encouraging, and acknowledge their progress if applicable.
Don't be overly formal - be friendly and conversational.
If they're new, welcome them warmly and make them feel comfortable.
If they have progress, briefly acknowledge it in an encouraging way.`,
        },
        {
          role: "user",
          content: `Generate a greeting for ${userName}. ${contextInfo}`,
        },
      ],
      max_tokens: 100,
    });

    const greetingText =
      greetingResponse.choices[0].message.content ||
      `Hi ${userName}! I'm here to help you grow. What's on your mind today?`;

    const conversation = await storage.createConversation({
      userId: user.id,
      messages: [{ role: "assistant", content: greetingText }],
      emotionState: "warm",
    });

    let audioBase64: string | null = null;
    if (includeTts && isElevenLabsAvailable()) {
      const prefs = await storage.getUserVoicePreferences(user.id);
      const selectedVoiceId = voiceId || prefs?.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM";

      const audioBuffer = await textToSpeech(greetingText, selectedVoiceId, {
        section: "scenario",
      });
      if (audioBuffer) {
        audioBase64 = audioBuffer.toString("base64");
      }
    }

    res.status(200).json({
      greeting: greetingText,
      audio: audioBase64,
      conversationId: conversation.id,
      context: {
        isNewUser: totalSessions === 0,
        level,
        currentStreak,
        topCategories,
        recentBadges,
        hasRecentSessions: recentSessions.length > 0,
        lastSessionCategory: recentSessions[0]?.category,
      },
      ttsAvailable: isElevenLabsAvailable(),
    });
  } catch (error: any) {
    if (error?.name === "OpenAIUnavailableError") {
      return handleOpenAIError(res, error);
    }

    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error generating greeting:", error);
    res.status(500).json({ message: "Failed to generate greeting" });
  }
}
