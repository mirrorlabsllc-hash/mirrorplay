export interface NormalizedReward {
  day: number;
  type: "xp" | "pp" | "cosmetic" | "unknown";
  value: number;
  description: string;
  id?: string;
}

export interface RawDatabaseReward {
  id?: string;
  day: number;
  rewardType?: string;
  rewardValue?: number;
  description?: string | null;
  createdAt?: string | Date | null;
}

export function normalizeReward(raw: RawDatabaseReward | null | undefined): NormalizedReward | null {
  if (!raw || typeof raw.day !== 'number') {
    return null;
  }

  const typeMap: Record<string, NormalizedReward["type"]> = {
    xp: "xp",
    pp: "pp",
    cosmetic: "cosmetic",
  };

  return {
    id: raw.id,
    day: raw.day,
    type: typeMap[raw.rewardType?.toLowerCase() ?? ""] ?? "unknown",
    value: raw.rewardValue ?? 0,
    description: raw.description ?? "Reward",
  };
}

export function isValidReward(raw: RawDatabaseReward | null | undefined): raw is RawDatabaseReward {
  return raw !== null && raw !== undefined && typeof raw.day === 'number';
}

export function formatRewardLabel(reward: NormalizedReward | null | undefined): string {
  if (!reward) return "Reward";
  
  if (reward.type === "cosmetic" && reward.description) {
    return reward.description;
  }
  
  const typeLabels: Record<NormalizedReward["type"], string> = {
    xp: "XP",
    pp: "PP",
    cosmetic: "COSMETIC",
    unknown: "REWARD",
  };

  return `+${reward.value} ${typeLabels[reward.type]}`;
}

export function formatRewardType(type: NormalizedReward["type"] | string | null | undefined): string {
  if (!type) return "REWARD";
  
  const labels: Record<string, string> = {
    xp: "XP",
    pp: "PP",
    cosmetic: "COSMETIC",
  };

  return labels[type.toLowerCase()] ?? "REWARD";
}

export function getRewardValue(reward: NormalizedReward | null | undefined): number {
  return reward?.value ?? 0;
}
