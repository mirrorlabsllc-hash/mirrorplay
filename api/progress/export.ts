import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { type ReqLike, type ResLike } from "../../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const userRecord = await storage.getUser(user.id);
    const progress = await storage.getProgress(user.id);
    const badges = await storage.getUserBadges(user.id);
    const subscription = await storage.getSubscription(user.id);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = await storage.getPracticeSessionsInDateRange(
      user.id,
      thirtyDaysAgo,
      new Date()
    );

    const categoryStats: Record<
      string,
      { totalScore: number; count: number; avgScore: number }
    > = {};
    let textSessionCount = 0;
    let voiceSessionCount = 0;
    let totalVoiceDuration = 0;
    let totalFillerWords = 0;

    for (const session of recentSessions) {
      const cat = session.category || "general";
      if (!categoryStats[cat]) {
        categoryStats[cat] = { totalScore: 0, count: 0, avgScore: 0 };
      }
      categoryStats[cat].totalScore += session.score || 0;
      categoryStats[cat].count += 1;

      if (session.mode === "voice") {
        voiceSessionCount++;
        totalVoiceDuration += session.audioDuration || 0;
        totalFillerWords += session.fillerWordCount || 0;
      } else {
        textSessionCount++;
      }
    }

    for (const cat of Object.keys(categoryStats)) {
      if (categoryStats[cat].count > 0) {
        categoryStats[cat].avgScore = Math.round(
          categoryStats[cat].totalScore / categoryStats[cat].count
        );
      }
    }

    const formattedSessions = recentSessions.map((s) => ({
      date: s.createdAt,
      category: s.category || "general",
      mode: s.mode,
      score: s.score,
      tone: s.tone,
      prompt: s.prompt?.substring(0, 100) + (s.prompt && s.prompt.length > 100 ? "..." : ""),
      xpEarned: s.xpEarned,
      ppEarned: s.ppEarned,
    }));

    const formattedBadges = badges.map((b) => ({
      name: b.badge.name,
      description: b.badge.description,
      icon: b.badge.icon,
      earnedAt: b.earnedAt,
    }));

    const timeline = [
      ...formattedBadges.map((b) => ({
        type: "badge" as const,
        title: `Earned: ${b.name}`,
        date: b.earnedAt,
        icon: b.icon,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const report = {
      exportedAt: new Date().toISOString(),
      user: {
        name: userRecord?.firstName
          ? `${userRecord.firstName} ${userRecord.lastName || ""}`.trim()
          : "User",
        email: userRecord?.email || "",
        joinedAt: userRecord?.createdAt,
        subscriptionTier: subscription?.tier || "free",
      },
      stats: {
        level: progress?.level || 1,
        totalXp: progress?.totalXp || 0,
        xpToNextLevel: 100 - ((progress?.totalXp || 0) % 100),
        peacePoints: progress?.totalPp || 0,
        currentStreak: progress?.currentStreak || 0,
        bestStreak: progress?.bestStreak || 0,
        totalPracticeSessions: progress?.practiceCount || 0,
        lastPracticeDate: progress?.lastCheckIn,
      },
      categoryPerformance: Object.entries(categoryStats).map(
        ([category, stats]) => ({
          category,
          sessionCount: stats.count,
          averageScore: stats.avgScore,
        })
      ),
      voiceStats:
        voiceSessionCount > 0
          ? {
              totalVoiceSessions: voiceSessionCount,
              totalDurationMinutes: Math.round(totalVoiceDuration / 60),
              averageFillerWordsPerSession: Math.round(
                totalFillerWords / voiceSessionCount
              ),
            }
          : null,
      badges: formattedBadges,
      recentSessions: formattedSessions,
      timeline: timeline.slice(0, 20),
      summary: {
        textSessions: textSessionCount,
        voiceSessions: voiceSessionCount,
        totalRecentSessions: recentSessions.length,
        periodDays: 30,
      },
    };

    res.status(200).json(report);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error exporting progress:", error);
    res.status(500).json({ message: "Failed to export progress" });
  }
}
