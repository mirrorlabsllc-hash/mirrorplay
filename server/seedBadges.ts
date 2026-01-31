import { db } from "./db";
import { badges } from "@shared/schema";

const badgeDefinitions = [
  {
    name: "First Steps",
    description: "Complete your first practice session",
    icon: "Star",
    requirement: { type: "practice_count", count: 1 },
    xpReward: 25,
    ppReward: 10,
  },
  {
    name: "Getting Started",
    description: "Complete 10 practice sessions",
    icon: "Flame",
    requirement: { type: "practice_count", count: 10 },
    xpReward: 50,
    ppReward: 25,
  },
  {
    name: "Dedicated Learner",
    description: "Complete 50 practice sessions",
    icon: "Award",
    requirement: { type: "practice_count", count: 50 },
    xpReward: 100,
    ppReward: 50,
  },
  {
    name: "Practice Master",
    description: "Complete 100 practice sessions",
    icon: "Trophy",
    requirement: { type: "practice_count", count: 100 },
    xpReward: 200,
    ppReward: 100,
  },
  {
    name: "Communication Legend",
    description: "Complete 500 practice sessions",
    icon: "Crown",
    requirement: { type: "practice_count", count: 500 },
    xpReward: 500,
    ppReward: 250,
  },

  {
    name: "Warming Up",
    description: "Achieve a 3-day streak",
    icon: "Flame",
    requirement: { type: "streak", days: 3 },
    xpReward: 30,
    ppReward: 15,
  },
  {
    name: "Weekly Warrior",
    description: "Achieve a 7-day streak",
    icon: "Calendar",
    requirement: { type: "streak", days: 7 },
    xpReward: 75,
    ppReward: 40,
  },
  {
    name: "Fortnight Focus",
    description: "Achieve a 14-day streak",
    icon: "Zap",
    requirement: { type: "streak", days: 14 },
    xpReward: 150,
    ppReward: 75,
  },
  {
    name: "Monthly Master",
    description: "Achieve a 30-day streak",
    icon: "Medal",
    requirement: { type: "streak", days: 30 },
    xpReward: 300,
    ppReward: 150,
  },
  {
    name: "Unstoppable",
    description: "Achieve a 100-day streak",
    icon: "Crown",
    requirement: { type: "streak", days: 100 },
    xpReward: 1000,
    ppReward: 500,
  },

  {
    name: "Perfect Response",
    description: "Achieve a perfect score of 100",
    icon: "Target",
    requirement: { type: "perfect_score" },
    xpReward: 50,
    ppReward: 25,
  },
  {
    name: "Consistent Excellence",
    description: "Maintain an average score of 80+",
    icon: "TrendingUp",
    requirement: { type: "average_score", minAverage: 80 },
    xpReward: 100,
    ppReward: 50,
  },
  {
    name: "Elite Communicator",
    description: "Maintain an average score of 90+",
    icon: "Star",
    requirement: { type: "average_score", minAverage: 90 },
    xpReward: 200,
    ppReward: 100,
  },

  {
    name: "Rising Star",
    description: "Reach Level 10",
    icon: "Sparkles",
    requirement: { type: "level", level: 10 },
    xpReward: 100,
    ppReward: 50,
  },
  {
    name: "Experienced",
    description: "Reach Level 25",
    icon: "Shield",
    requirement: { type: "level", level: 25 },
    xpReward: 250,
    ppReward: 125,
  },
  {
    name: "Master Level",
    description: "Reach Level 50",
    icon: "Award",
    requirement: { type: "level", level: 50 },
    xpReward: 500,
    ppReward: 250,
  },
  {
    name: "Legendary Status",
    description: "Reach Level 100",
    icon: "Crown",
    requirement: { type: "level", level: 100 },
    xpReward: 1000,
    ppReward: 500,
  },

  {
    name: "Voice Debut",
    description: "Complete your first voice practice",
    icon: "Mic",
    requirement: { type: "first_voice_practice" },
    xpReward: 25,
    ppReward: 15,
  },
  {
    name: "Voice Veteran",
    description: "Complete 50 voice practice sessions",
    icon: "Volume2",
    requirement: { type: "voice_practice_count", count: 50 },
    xpReward: 150,
    ppReward: 75,
  },

  {
    name: "Generous Soul",
    description: "Send your first gift",
    icon: "Gift",
    requirement: { type: "gift_sent_count", count: 1 },
    xpReward: 25,
    ppReward: 15,
  },
  {
    name: "Gift Giver",
    description: "Send 10 gifts to friends",
    icon: "Heart",
    requirement: { type: "gift_sent_count", count: 10 },
    xpReward: 100,
    ppReward: 50,
  },

  {
    name: "Early Adopter",
    description: "Joined Mirror Play in its early days",
    icon: "Sparkles",
    requirement: { type: "early_adopter" },
    xpReward: 100,
    ppReward: 100,
  },
  {
    name: "Pro Subscriber",
    description: "Subscribed to Mirror Play Pro",
    icon: "Crown",
    requirement: { type: "subscription" },
    xpReward: 50,
    ppReward: 50,
  },
];

export async function seedBadges() {
  console.log("Seeding badges...");
  
  for (const badge of badgeDefinitions) {
    try {
      await db.insert(badges).values({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        requirement: badge.requirement,
        xpReward: badge.xpReward,
        ppReward: badge.ppReward,
      }).onConflictDoNothing();
    } catch (error) {
      console.log(`Badge "${badge.name}" may already exist, skipping...`);
    }
  }
  
  console.log(`Seeded ${badgeDefinitions.length} badges`);
}

import { fileURLToPath } from 'url';

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (isMainModule) {
  seedBadges()
    .then(() => {
      console.log("Badge seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Error seeding badges:", error);
      process.exit(1);
    });
}
