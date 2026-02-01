import { storage } from "../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../lib/supabaseServer.js";
import { type ReqLike, type ResLike } from "../lib/apiUtils.js";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const progress = await storage.getProgress(user.id);

    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(now.getDate() - 7);
    thisWeekStart.setHours(0, 0, 0, 0);

    const lastWeekStart = new Date(thisWeekStart);
    lastWeekStart.setDate(thisWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(thisWeekStart);
    lastWeekEnd.setMilliseconds(-1);

    const thisWeekSessions = await storage.getPracticeSessionsInDateRange(
      user.id,
      thisWeekStart,
      now
    );
    const lastWeekSessions = await storage.getPracticeSessionsInDateRange(
      user.id,
      lastWeekStart,
      lastWeekEnd
    );

    let thisWeekTotalScore = 0;
    let thisWeekTotalXp = 0;
    let thisWeekTotalPp = 0;
    const thisWeekCategories = new Set<string>();
    let thisWeekBestSession: { score: number; prompt: string; category: string } | null = null;

    for (const session of thisWeekSessions) {
      thisWeekTotalScore += session.score || 0;
      thisWeekTotalXp += session.xpEarned || 0;
      thisWeekTotalPp += session.ppEarned || 0;
      if (session.category) thisWeekCategories.add(session.category);

      if (!thisWeekBestSession || (session.score || 0) > thisWeekBestSession.score) {
        thisWeekBestSession = {
          score: session.score || 0,
          prompt: session.prompt,
          category: session.category || "general",
        };
      }
    }

    let lastWeekTotalScore = 0;
    let lastWeekTotalXp = 0;
    let lastWeekTotalPp = 0;

    for (const session of lastWeekSessions) {
      lastWeekTotalScore += session.score || 0;
      lastWeekTotalXp += session.xpEarned || 0;
      lastWeekTotalPp += session.ppEarned || 0;
    }

    const thisWeekAvgScore = thisWeekSessions.length > 0
      ? Math.round(thisWeekTotalScore / thisWeekSessions.length)
      : 0;
    const lastWeekAvgScore = lastWeekSessions.length > 0
      ? Math.round(lastWeekTotalScore / lastWeekSessions.length)
      : 0;

    const allBadges = await storage.getUserBadges(user.id);
    const thisWeekBadges = allBadges.filter((b) => {
      const earnedAt = new Date(b.earnedAt);
      return earnedAt >= thisWeekStart && earnedAt <= now;
    });

    const bestMoments = await storage.getUserBestMoments(user.id, 1);
    const thisWeekBestMoment = bestMoments.find((m) => {
      const createdAt = new Date(m.createdAt!);
      return createdAt >= thisWeekStart && createdAt <= now;
    });

    const sessionCountTrend = thisWeekSessions.length - lastWeekSessions.length;
    const scoreTrend = thisWeekAvgScore - lastWeekAvgScore;
    const xpTrend = thisWeekTotalXp - lastWeekTotalXp;
    const ppTrend = thisWeekTotalPp - lastWeekTotalPp;

    let encouragingMessage = "Keep practicing to build your weekly stats!";
    if (thisWeekSessions.length > 0) {
      if (scoreTrend > 5) {
        encouragingMessage = "Amazing progress! Your scores are improving significantly!";
      } else if (scoreTrend > 0) {
        encouragingMessage = "Great work! You're showing steady improvement!";
      } else if (sessionCountTrend > 0) {
        encouragingMessage = "Fantastic consistency! You practiced more this week!";
      } else if (thisWeekAvgScore >= 80) {
        encouragingMessage = "Excellent performance! You're mastering communication!";
      } else if (thisWeekAvgScore >= 60) {
        encouragingMessage = "Good effort this week! Keep pushing forward!";
      } else {
        encouragingMessage = "Every practice session makes you stronger. Keep going!";
      }
    }

    res.status(200).json({
      weekStart: thisWeekStart.toISOString(),
      weekEnd: now.toISOString(),
      totalSessions: thisWeekSessions.length,
      averageScore: thisWeekAvgScore,
      totalXpEarned: thisWeekTotalXp,
      totalPpEarned: thisWeekTotalPp,
      currentStreak: progress?.currentStreak || 0,
      bestStreak: progress?.bestStreak || 0,
      categoriesPracticed: Array.from(thisWeekCategories),
      bestSession: thisWeekBestSession,
      bestMoment: thisWeekBestMoment
        ? {
            id: thisWeekBestMoment.id,
            title: thisWeekBestMoment.title,
            score: thisWeekBestMoment.score,
            category: thisWeekBestMoment.category,
            excerpt: thisWeekBestMoment.excerpt,
          }
        : null,
      badgesEarned: thisWeekBadges.map((b) => ({
        id: b.badge.id,
        name: b.badge.name,
        icon: b.badge.icon,
        earnedAt: b.earnedAt,
      })),
      trends: {
        sessions: sessionCountTrend,
        score: scoreTrend,
        xp: xpTrend,
        pp: ppTrend,
      },
      lastWeekStats: {
        totalSessions: lastWeekSessions.length,
        averageScore: lastWeekAvgScore,
        totalXpEarned: lastWeekTotalXp,
        totalPpEarned: lastWeekTotalPp,
      },
      encouragingMessage,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching weekly recap:", error);
    res.status(500).json({ message: "Failed to fetch weekly recap" });
  }
}

