import { storage } from "../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../server/supabaseServer";
import { type ReqLike, type ResLike } from "../server/apiUtils";

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const sessions = await storage.getPracticeSessions(user.id, 1000);

    const canonicalTones = [
      "calm",
      "assertive",
      "empathetic",
      "confident",
      "defensive",
      "anxious",
      "aggressive",
      "passive",
    ];

    const toneAliases: Record<string, string> = {
      empathic: "empathetic",
      confidence: "confident",
      assertion: "assertive",
      "defensive behaviour": "defensive",
    };

    const normalizeTone = (tone: string): string | null => {
      const normalized = tone.trim().toLowerCase();
      if (toneAliases[normalized]) return toneAliases[normalized];
      if (canonicalTones.includes(normalized)) return normalized;
      for (const canonical of canonicalTones) {
        if (normalized.includes(canonical)) return canonical;
      }
      return null;
    };

    const toneStats: Map<
      string,
      { scores: number[]; bestScore: number; recentScores: number[] }
    > = new Map();

    for (const session of sessions) {
      if (session.tone && session.score !== null && session.score !== undefined) {
        const toneLower = normalizeTone(session.tone);
        if (!toneLower) continue;
        if (!toneStats.has(toneLower)) {
          toneStats.set(toneLower, { scores: [], bestScore: 0, recentScores: [] });
        }
        const stats = toneStats.get(toneLower)!;
        stats.scores.push(session.score);
        if (session.score > stats.bestScore) {
          stats.bestScore = session.score;
        }
      }
    }

    const sortedSessions = sessions
      .filter((s) => s.tone && s.score !== null)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());

    for (const session of sortedSessions.slice(0, 20)) {
      if (session.tone) {
        const toneLower = normalizeTone(session.tone);
        if (!toneLower) continue;
        const stats = toneStats.get(toneLower);
        if (stats && stats.recentScores.length < 5) {
          stats.recentScores.push(session.score!);
        }
      }
    }

    const performances = Array.from(toneStats.entries()).map(([tone, stats]) => {
      const avg = Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length);
      const recentAvg =
        stats.recentScores.length > 0
          ? stats.recentScores.reduce((a, b) => a + b, 0) / stats.recentScores.length
          : avg;
      const olderAvg =
        stats.scores.length > stats.recentScores.length
          ? (stats.scores.reduce((a, b) => a + b, 0) -
              stats.recentScores.reduce((a, b) => a + b, 0)) /
            (stats.scores.length - stats.recentScores.length)
          : avg;

      let trend: "up" | "down" | "stable" = "stable";
      if (recentAvg > olderAvg + 5) trend = "up";
      else if (recentAvg < olderAvg - 5) trend = "down";

      return {
        tone: tone.charAt(0).toUpperCase() + tone.slice(1),
        averageScore: avg,
        totalSessions: stats.scores.length,
        bestScore: stats.bestScore,
        recentTrend: trend,
      };
    });

    const sortedByScore = [...performances].sort((a, b) => b.averageScore - a.averageScore);
    const strengths = sortedByScore.filter((p) => p.averageScore >= 70).slice(0, 3);
    const areasToImprove = sortedByScore
      .filter((p) => p.averageScore < 70)
      .slice(-3)
      .reverse();

    return res.status(200).json({
      performances,
      strengths,
      areasToImprove,
      overallProgress:
        performances.length > 0
          ? Math.round(performances.reduce((sum, p) => sum + p.averageScore, 0) / performances.length)
          : 0,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching tone journey data:", error);
    return res.status(500).json({ message: "Failed to fetch tone journey data" });
  }
}
