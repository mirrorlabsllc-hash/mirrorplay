import { storage } from "../../server/storage";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";
import { checkAndAwardBadges } from "../../server/badgeService";
import { type ReqLike, type ResLike } from "../../server/apiUtils";

function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  return 1;
}

async function ensureLoginRewardsSeeded() {
  const rewards = await storage.getDailyLoginRewards();
  if (rewards.length > 0) return rewards;

  const loginRewards = [
    { day: 1, rewardType: "xp", rewardValue: 10, description: "Day 1: 10 XP" },
    { day: 2, rewardType: "xp", rewardValue: 15, description: "Day 2: 15 XP" },
    { day: 3, rewardType: "pp", rewardValue: 5, description: "Day 3: 5 Peace Points" },
    { day: 4, rewardType: "xp", rewardValue: 25, description: "Day 4: 25 XP" },
    { day: 5, rewardType: "pp", rewardValue: 10, description: "Day 5: 10 Peace Points" },
    { day: 6, rewardType: "xp", rewardValue: 50, description: "Day 6: 50 XP" },
    { day: 7, rewardType: "pp", rewardValue: 25, description: "Day 7: 25 PP + Special Badge" },
  ];

  for (const reward of loginRewards) {
    await storage.createDailyLoginReward(reward);
  }

  return storage.getDailyLoginRewards();
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    const rewards = await ensureLoginRewardsSeeded();
    const latestClaim = await storage.getLatestUserLoginReward(user.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let cycleStartDate: Date;
    let currentDay: number;

    if (!latestClaim) {
      cycleStartDate = today;
      currentDay = 1;
    } else {
      const lastClaimDate = new Date(latestClaim.claimedAt!);
      lastClaimDate.setHours(0, 0, 0, 0);
      const cycleStart = new Date(latestClaim.cycleStartDate);
      cycleStart.setHours(0, 0, 0, 0);

      const daysSinceLastClaim = Math.floor(
        (today.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysSinceLastClaim === 0) {
        return res.status(400).json({ message: "Already claimed today's reward" });
      }

      if (latestClaim.claimedDay === 7 || daysSinceLastClaim > 1) {
        cycleStartDate = today;
        currentDay = 1;
      } else {
        cycleStartDate = cycleStart;
        currentDay = latestClaim.claimedDay + 1;
      }
    }

    const reward = rewards.find((r) => r.day === currentDay);
    if (!reward) {
      return res.status(500).json({ message: "Reward not found for day" });
    }

    const claim = await storage.claimLoginReward({
      userId: user.id,
      claimedDay: currentDay,
      cycleStartDate,
    });

    const progress = await storage.getProgress(user.id);
    if (progress) {
      const updates: any = { updatedAt: new Date() };

      if (reward.rewardType === "xp") {
        const multiplier = getStreakMultiplier(progress.currentStreak || 0);
        const actualXp = Math.floor(reward.rewardValue * multiplier);
        updates.totalXp = (progress.totalXp || 0) + actualXp;
        const newLevel = Math.floor(updates.totalXp / 100) + 1;
        if (newLevel > (progress.level || 1)) {
          updates.level = newLevel;
        }
      } else if (reward.rewardType === "pp") {
        updates.totalPp = (progress.totalPp || 0) + reward.rewardValue;
      }

      await storage.updateProgress(user.id, updates);
    }

    if (currentDay === 7) {
      await checkAndAwardBadges({ userId: user.id, eventType: "streak_update" });
    }

    const cycleClaims = await storage.getUserLoginRewardsForCycle(
      user.id,
      cycleStartDate
    );
    const claimedDays = cycleClaims.map((c) => c.claimedDay);

    return res.status(200).json({
      success: true,
      claim,
      reward,
      currentDay,
      claimedDays,
      canClaimToday: false,
      cycleStartDate: cycleStartDate.toISOString(),
      streakCount: claimedDays.length,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error claiming login reward:", error);
    return res.status(500).json({ message: "Failed to claim login reward" });
  }
}
