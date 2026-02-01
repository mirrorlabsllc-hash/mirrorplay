import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";
import { type ReqLike, type ResLike } from "../../lib/apiUtils.js";

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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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
    let claimedDays: number[] = [];
    let canClaimToday = false;

    if (!latestClaim) {
      cycleStartDate = today;
      currentDay = 1;
      canClaimToday = true;
    } else {
      const lastClaimDate = new Date(latestClaim.claimedAt!);
      lastClaimDate.setHours(0, 0, 0, 0);
      const cycleStart = new Date(latestClaim.cycleStartDate);
      cycleStart.setHours(0, 0, 0, 0);

      const daysSinceLastClaim = Math.floor(
        (today.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (latestClaim.claimedDay === 7 && daysSinceLastClaim >= 1) {
        cycleStartDate = today;
        currentDay = 1;
        canClaimToday = true;
      } else if (daysSinceLastClaim === 0) {
        cycleStartDate = cycleStart;
        currentDay = latestClaim.claimedDay;
        canClaimToday = false;
      } else if (daysSinceLastClaim === 1) {
        cycleStartDate = cycleStart;
        currentDay = latestClaim.claimedDay + 1;
        canClaimToday = true;
      } else {
        cycleStartDate = today;
        currentDay = 1;
        canClaimToday = true;
      }

      if (cycleStartDate.getTime() === cycleStart.getTime()) {
        const cycleClaims = await storage.getUserLoginRewardsForCycle(
          user.id,
          cycleStart
        );
        claimedDays = cycleClaims.map((c) => c.claimedDay);
      }
    }

    return res.status(200).json({
      rewards,
      currentDay,
      claimedDays,
      canClaimToday,
      cycleStartDate: cycleStartDate.toISOString(),
      streakCount: claimedDays.length,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching login rewards:", error);
    return res.status(500).json({ message: "Failed to fetch login rewards" });
  }
}

