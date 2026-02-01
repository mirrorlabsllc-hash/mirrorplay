import { storage } from "./storage.js";
import type { Badge, UserProgress, PracticeSession } from "../shared/schema.js";

export interface BadgeCheckResult {
  newBadges: Badge[];
  streakBonus: number;
  streakUpdated: boolean;
  newStreak: number;
}

export interface BadgeCheckContext {
  userId: string;
  eventType: "practice" | "voice_practice" | "level_up" | "streak_update" | "gift_sent" | "subscription";
  score?: number;
  mode?: "text" | "voice";
}

export async function updateStreak(userId: string): Promise<{ streakBonus: number; currentStreak: number; wasUpdated: boolean }> {
  const progress = await storage.getProgress(userId);
  if (!progress) {
    return { streakBonus: 0, currentStreak: 0, wasUpdated: false };
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const lastPractice = progress.lastCheckIn ? new Date(progress.lastCheckIn) : null;
  
  let currentStreak = progress.currentStreak || 0;
  let bestStreak = progress.bestStreak || 0;
  let wasUpdated = false;

  if (lastPractice) {
    const lastPracticeDate = new Date(lastPractice.getFullYear(), lastPractice.getMonth(), lastPractice.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const diffTime = today.getTime() - lastPracticeDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      wasUpdated = false;
    } else if (diffDays === 1) {
      currentStreak += 1;
      wasUpdated = true;
    } else {
      currentStreak = 1;
      wasUpdated = true;
    }
  } else {
    currentStreak = 1;
    wasUpdated = true;
  }

  if (currentStreak > bestStreak) {
    bestStreak = currentStreak;
  }

  if (wasUpdated || !progress.lastCheckIn) {
    await storage.updateProgress(userId, {
      currentStreak,
      bestStreak,
      lastCheckIn: now,
    });
  }

  const streakBonus = Math.min(currentStreak * 5, 50);

  return { streakBonus, currentStreak, wasUpdated };
}

export async function checkAndAwardBadges(context: BadgeCheckContext): Promise<Badge[]> {
  const { userId, eventType, score, mode } = context;
  
  const [allBadges, userBadgeData, progress, sessions] = await Promise.all([
    storage.getBadges(),
    storage.getUserBadges(userId),
    storage.getProgress(userId),
    storage.getPracticeSessions(userId, 1000),
  ]);

  const earnedBadgeIds = new Set(userBadgeData.map(ub => ub.badge.id));
  const newBadges: Badge[] = [];

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const requirement = badge.requirement as any;
    if (!requirement) continue;

    const shouldAward = checkBadgeRequirement(requirement, {
      eventType,
      score,
      mode,
      progress,
      sessions,
    });

    if (shouldAward) {
      await storage.awardBadge({ userId, badgeId: badge.id });
      newBadges.push(badge);

      if (badge.xpReward || badge.ppReward) {
        const currentXp = progress?.totalXp || 0;
        const currentPp = progress?.totalPp || 0;
        await storage.updateProgress(userId, {
          totalXp: currentXp + (badge.xpReward || 0),
          totalPp: currentPp + (badge.ppReward || 0),
        });
      }

      // Auto-share achievement to community feed
      try {
        await storage.createCommunityPost({
          userId,
          type: "achievement",
          content: `Earned the "${badge.name}" badge!`,
          metadata: {
            badgeId: badge.id,
            badgeName: badge.name,
            badgeIcon: badge.icon,
            badgeDescription: badge.description,
            autoShared: true,
          },
        });
      } catch (error) {
        console.error("Failed to auto-share badge achievement:", error);
        // Don't fail the badge award if sharing fails
      }
    }
  }

  return newBadges;
}

function checkBadgeRequirement(
  requirement: any,
  context: {
    eventType: string;
    score?: number;
    mode?: string;
    progress: UserProgress | undefined;
    sessions: PracticeSession[];
  }
): boolean {
  const { eventType, score, mode, progress, sessions } = context;
  const type = requirement.type;

  switch (type) {
    case "practice_count": {
      const count = progress?.practiceCount || 0;
      return count >= requirement.count;
    }

    case "streak": {
      const streak = progress?.currentStreak || 0;
      return streak >= requirement.days;
    }

    case "perfect_score": {
      return eventType === "practice" && score === 100;
    }

    case "average_score": {
      if (sessions.length < 5) return false;
      const recentSessions = sessions.slice(0, 20);
      const avgScore = recentSessions.reduce((sum, s) => sum + (s.score || 0), 0) / recentSessions.length;
      return avgScore >= requirement.minAverage;
    }

    case "level": {
      const level = progress?.level || 1;
      return level >= requirement.level;
    }

    case "voice_practice_count": {
      const voiceSessions = sessions.filter(s => s.mode === "voice");
      return voiceSessions.length >= requirement.count;
    }

    case "first_voice_practice": {
      return eventType === "voice_practice" && mode === "voice" && sessions.filter(s => s.mode === "voice").length === 1;
    }

    case "gift_sent_count": {
      return false;
    }

    case "subscription": {
      return eventType === "subscription";
    }

    case "early_adopter": {
      if (!progress?.createdAt) return false;
      const createdAt = new Date(progress.createdAt);
      const earlyAdopterDeadline = new Date("2026-03-01");
      return createdAt < earlyAdopterDeadline;
    }

    default:
      return false;
  }
}

export async function checkGiftBadges(userId: string): Promise<Badge[]> {
  const [allBadges, userBadgeData, sentGifts] = await Promise.all([
    storage.getBadges(),
    storage.getUserBadges(userId),
    storage.getSentGifts(userId),
  ]);

  const earnedBadgeIds = new Set(userBadgeData.map(ub => ub.badge.id));
  const newBadges: Badge[] = [];
  const progress = await storage.getProgress(userId);

  for (const badge of allBadges) {
    if (earnedBadgeIds.has(badge.id)) continue;

    const requirement = badge.requirement as any;
    if (!requirement || requirement.type !== "gift_sent_count") continue;

    if (sentGifts.length >= requirement.count) {
      await storage.awardBadge({ userId, badgeId: badge.id });
      newBadges.push(badge);

      if (badge.xpReward || badge.ppReward) {
        const currentXp = progress?.totalXp || 0;
        const currentPp = progress?.totalPp || 0;
        await storage.updateProgress(userId, {
          totalXp: currentXp + (badge.xpReward || 0),
          totalPp: currentPp + (badge.ppReward || 0),
        });
      }
    }
  }

  return newBadges;
}
