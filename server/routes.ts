import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { getOpenAI, requireOpenAI, handleOpenAIError, isOpenAIAvailable } from "./services/openaiClient";
import { PRACTICE_HANDOFFS, DEFAULT_HANDOFF_LINE } from "@shared/promptBank";
import { getScenarioById, scenarios as builtInScenarios, getDuoScenarios, getDuoScenarioById } from "@shared/scenarios";
import { getUncachableStripeClient, getStripePublishableKey } from "./stripeClient";
import { updateStreak, checkAndAwardBadges, checkGiftBadges } from "./badgeService";
import { canAnalyze, getSubscriptionTier, getDailyLimit, getDailyUsage } from "./subscriptionLimits";
import { isElevenLabsAvailable, textToSpeech, createVoiceClone as createVoiceCloneEL, deleteVoiceClone as deleteElevenLabsVoice } from "./elevenLabsClient";
import { insertUserAvatarSettingsSchema, insertAvatarPresetSchema, insertTestimonialSchema, insertUserFeedbackSchema, type InsertPrototypeFeedback } from "@shared/schema";

/**
 * Get the XP multiplier based on current streak days
 * @param streakDays - Current streak in days
 * @returns Multiplier value (1x, 2x, 3x, or 5x)
 */
export function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  return 1;
}

/**
 * Get info about the next multiplier milestone
 * @param streakDays - Current streak in days
 * @returns Object with days until next milestone and the next multiplier
 */
export function getNextMultiplierMilestone(streakDays: number): { daysUntil: number; nextMultiplier: number } | null {
  if (streakDays >= 30) return null; // Already at max
  if (streakDays >= 14) return { daysUntil: 30 - streakDays, nextMultiplier: 5 };
  if (streakDays >= 7) return { daysUntil: 14 - streakDays, nextMultiplier: 3 };
  return { daysUntil: 7 - streakDays, nextMultiplier: 2 };
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Setup authentication
  await setupAuth(app);

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Update user avatar URL
  app.patch("/api/user/avatar", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { avatarUrl } = req.body;

      if (!avatarUrl || typeof avatarUrl !== "string") {
        return res.status(400).json({ message: "Avatar URL is required" });
      }

      // Validate that it's a Ready Player Me URL
      if (!avatarUrl.includes("readyplayer.me") && !avatarUrl.includes("models.readyplayer.me")) {
        return res.status(400).json({ message: "Invalid avatar URL format" });
      }

      const user = await storage.updateUser(userId, { rpmAvatarUrl: avatarUrl });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      console.error("Error updating avatar:", error);
      res.status(500).json({ message: "Failed to update avatar" });
    }
  });

  // User settings routes
  app.patch("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { textInputEnabled } = req.body;

      let progress = await storage.getProgress(userId);
      if (!progress) {
        progress = await storage.createProgress({ userId });
      }

      // Update the textInputEnabled setting
      const updated = await storage.updateProgress(userId, {
        textInputEnabled: textInputEnabled === true,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating settings:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // User search route
  app.get("/api/users/search", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const query = (req.query.q as string || "").trim().toLowerCase();

      if (query.length < 2) {
        return res.json({ users: [] });
      }

      const allUsers = await storage.getAllUsers();
      
      const matchingUsers = await Promise.all(
        allUsers
          .filter((user: any) => {
            if (user.id === currentUserId) return false;
            const username = (user.username || "").toLowerCase();
            const firstName = (user.firstName || "").toLowerCase();
            const lastName = (user.lastName || "").toLowerCase();
            return username.includes(query) || 
                   firstName.includes(query) || 
                   lastName.includes(query);
          })
          .slice(0, 20)
          .map(async (user: any) => {
            const progress = await storage.getProgress(user.id);
            return {
              id: user.id,
              username: user.username,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImageUrl: user.profileImageUrl,
              level: progress?.level || 1,
            };
          })
      );

      res.json({ users: matchingUsers });
    } catch (error) {
      console.error("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Public user profile route
  app.get("/api/users/:id", isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.id;
      const targetUserId = req.params.id;

      const user = await storage.getUser(targetUserId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const progress = await storage.getProgress(targetUserId);
      const userBadges = await storage.getUserBadges(targetUserId);

      // Check friendship status
      const friendsData = await storage.getFriends(currentUserId);
      const friendship = friendsData.find(
        (f) => f.friend.id === targetUserId
      )?.friendship;

      const isFriend = friendship?.status === "accepted";
      const friendshipStatus = friendship?.status || null;

      // Return sanitized public profile
      res.json({
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
        progress: progress ? {
          level: progress.level,
          totalXp: progress.totalXp,
          currentStreak: progress.currentStreak,
          practiceCount: progress.practiceCount,
        } : null,
        badges: userBadges,
        isFriend,
        friendshipStatus,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Energy purchase route
  app.post("/api/energy/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { packageId } = req.body;

      const packages: Record<string, { energy: number; cost: number }> = {
        small: { energy: 25, cost: 50 },
        medium: { energy: 60, cost: 100 },
        large: { energy: 100, cost: 150 },
      };

      const pkg = packages[packageId];
      if (!pkg) {
        return res.status(400).json({ message: "Invalid package" });
      }

      let progress = await storage.getProgress(userId);
      if (!progress) {
        progress = await storage.createProgress({ userId });
      }

      const currentPp = progress.totalPp || 0;
      if (currentPp < pkg.cost) {
        return res.status(400).json({ message: "Not enough Peace Points" });
      }

      const currentEnergy = progress.dailyEnergy || 0;
      const maxEnergy = progress.maxEnergy || 100;
      const newEnergy = Math.min(currentEnergy + pkg.energy, maxEnergy);

      const updated = await storage.updateProgress(userId, {
        totalPp: currentPp - pkg.cost,
        dailyEnergy: newEnergy,
      });

      res.json({ success: true, newEnergy, ppSpent: pkg.cost });
    } catch (error) {
      console.error("Error purchasing energy:", error);
      res.status(500).json({ message: "Failed to purchase energy" });
    }
  });

  // Progress routes
  app.get("/api/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let progress = await storage.getProgress(userId);
      
      if (!progress) {
        progress = await storage.createProgress({ userId });
      }
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Streak stats endpoint
  app.get("/api/progress/streak", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getProgress(userId);
      
      if (!progress) {
        return res.json({
          currentStreak: 0,
          bestStreak: 0,
          lastPracticeDate: null,
          streakBonus: 0,
        });
      }
      
      const currentStreak = progress.currentStreak || 0;
      const streakBonus = Math.min(currentStreak * 5, 50);
      
      res.json({
        currentStreak,
        bestStreak: progress.bestStreak || 0,
        lastPracticeDate: progress.lastCheckIn,
        streakBonus,
      });
    } catch (error) {
      console.error("Error fetching streak:", error);
      res.status(500).json({ message: "Failed to fetch streak" });
    }
  });

  // Mood check-in routes
  app.get("/api/mood/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const checkIn = await storage.getTodayMoodCheckIn(userId);
      res.json(checkIn || null);
    } catch (error) {
      console.error("Error fetching today's mood:", error);
      res.status(500).json({ message: "Failed to fetch mood check-in" });
    }
  });

  app.post("/api/mood/check-in", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { mood, note } = req.body;

      const validMoods = ["calm", "happy", "anxious", "frustrated", "sad", "energized", "tired", "hopeful"];
      if (!mood || !validMoods.includes(mood)) {
        return res.status(400).json({ message: "Invalid mood. Must be one of: " + validMoods.join(", ") });
      }

      const checkIn = await storage.createMoodCheckIn({
        userId,
        mood,
        note: note || null,
        checkInDate: new Date(),
      });

      res.json(checkIn);
    } catch (error) {
      console.error("Error saving mood check-in:", error);
      res.status(500).json({ message: "Failed to save mood check-in" });
    }
  });

  app.get("/api/mood/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const days = parseInt(req.query.days as string) || 7;
      const history = await storage.getMoodHistory(userId, days);
      res.json(history);
    } catch (error) {
      console.error("Error fetching mood history:", error);
      res.status(500).json({ message: "Failed to fetch mood history" });
    }
  });

  // Progress export endpoint - generates comprehensive progress report
  app.get("/api/progress/export", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);
      const progress = await storage.getProgress(userId);
      const badges = await storage.getUserBadges(userId);
      const subscription = await storage.getSubscription(userId);
      
      // Get practice sessions from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSessions = await storage.getPracticeSessionsInDateRange(userId, thirtyDaysAgo, new Date());
      
      // Calculate category performance
      const categoryStats: Record<string, { totalScore: number; count: number; avgScore: number }> = {};
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
      
      // Calculate averages
      for (const cat of Object.keys(categoryStats)) {
        if (categoryStats[cat].count > 0) {
          categoryStats[cat].avgScore = Math.round(categoryStats[cat].totalScore / categoryStats[cat].count);
        }
      }
      
      // Format sessions for export
      const formattedSessions = recentSessions.map(s => ({
        date: s.createdAt,
        category: s.category || "general",
        mode: s.mode,
        score: s.score,
        tone: s.tone,
        prompt: s.prompt?.substring(0, 100) + (s.prompt && s.prompt.length > 100 ? "..." : ""),
        xpEarned: s.xpEarned,
        ppEarned: s.ppEarned,
      }));
      
      // Format badges
      const formattedBadges = badges.map(b => ({
        name: b.badge.name,
        description: b.badge.description,
        icon: b.badge.icon,
        earnedAt: b.earnedAt,
      }));
      
      // Create achievement timeline
      const timeline = [
        ...formattedBadges.map(b => ({
          type: "badge" as const,
          title: `Earned: ${b.name}`,
          date: b.earnedAt,
          icon: b.icon,
        })),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const report = {
        exportedAt: new Date().toISOString(),
        user: {
          name: user?.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User",
          email: user?.email || "",
          joinedAt: user?.createdAt,
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
        categoryPerformance: Object.entries(categoryStats).map(([category, stats]) => ({
          category,
          sessionCount: stats.count,
          averageScore: stats.avgScore,
        })),
        voiceStats: voiceSessionCount > 0 ? {
          totalVoiceSessions: voiceSessionCount,
          totalDurationMinutes: Math.round(totalVoiceDuration / 60),
          averageFillerWordsPerSession: Math.round(totalFillerWords / voiceSessionCount),
        } : null,
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
      
      res.json(report);
    } catch (error) {
      console.error("Error exporting progress:", error);
      res.status(500).json({ message: "Failed to export progress" });
    }
  });

  // Weekly recap endpoint - summary of past 7 days
  app.get("/api/weekly-recap", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getProgress(userId);
      
      // Calculate date ranges
      const now = new Date();
      const thisWeekStart = new Date(now);
      thisWeekStart.setDate(now.getDate() - 7);
      thisWeekStart.setHours(0, 0, 0, 0);
      
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(thisWeekStart.getDate() - 7);
      const lastWeekEnd = new Date(thisWeekStart);
      lastWeekEnd.setMilliseconds(-1);
      
      // Get sessions for this week and last week
      const thisWeekSessions = await storage.getPracticeSessionsInDateRange(userId, thisWeekStart, now);
      const lastWeekSessions = await storage.getPracticeSessionsInDateRange(userId, lastWeekStart, lastWeekEnd);
      
      // Calculate this week stats
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
      
      // Calculate last week stats for comparison
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
      
      // Get badges earned this week
      const allBadges = await storage.getUserBadges(userId);
      const thisWeekBadges = allBadges.filter(b => {
        const earnedAt = new Date(b.earnedAt);
        return earnedAt >= thisWeekStart && earnedAt <= now;
      });
      
      // Get best moment from this week (if any)
      const bestMoments = await storage.getUserBestMoments(userId, 1);
      const thisWeekBestMoment = bestMoments.find(m => {
        const createdAt = new Date(m.createdAt!);
        return createdAt >= thisWeekStart && createdAt <= now;
      });
      
      // Calculate improvement trends
      const sessionCountTrend = thisWeekSessions.length - lastWeekSessions.length;
      const scoreTrend = thisWeekAvgScore - lastWeekAvgScore;
      const xpTrend = thisWeekTotalXp - lastWeekTotalXp;
      const ppTrend = thisWeekTotalPp - lastWeekTotalPp;
      
      // Generate encouraging message
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
      
      res.json({
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
        bestMoment: thisWeekBestMoment ? {
          id: thisWeekBestMoment.id,
          title: thisWeekBestMoment.title,
          score: thisWeekBestMoment.score,
          category: thisWeekBestMoment.category,
          excerpt: thisWeekBestMoment.excerpt,
        } : null,
        badgesEarned: thisWeekBadges.map(b => ({
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
    } catch (error) {
      console.error("Error fetching weekly recap:", error);
      res.status(500).json({ message: "Failed to fetch weekly recap" });
    }
  });

  // Practice analysis route
  app.post("/api/practice/analyze", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt, response, category, quickMode } = req.body;

      if (!prompt || !response) {
        return res.status(400).json({ message: "Prompt and response are required" });
      }

      // Check subscription limits
      const usageCheck = await canAnalyze(userId);
      if (!usageCheck.allowed) {
        return res.status(402).json({
          message: "Daily analysis limit reached. Upgrade your subscription for more analyses.",
          tier: usageCheck.tier,
          limit: usageCheck.limit,
          usedToday: usageCheck.usedToday,
          upgradeRequired: true,
        });
      }

      // Use different prompts for quick mode vs full mode
      const systemPrompt = quickMode
        ? `You are a voice-first communication coach. Deliver spoken-friendly, presence-first analysis. Never ask questions. No theory lectures. Keep it calm, precise, human.

Category voice (adapt your wording):
- relationships: safety, attunement, emotional impact; warm and connecting; avoid corporate jargon.
- workplace: clarity, ownership, outcomes; professional and steady; avoid therapy language.
- boundaries: self-respect, calm limits, firmness without edge.
- conflict/difficult: restraint, tone control, de-escalation under pressure.

Difficulty voice (if not provided, assume intermediate):
- beginner: softer, validating, light on critique.
- intermediate: balanced reflection + refinement.
- advanced: sharper, precise, higher expectation of control.

Output fields:
- tone: primary tone label.
- score: 0-100.
- tip: 2-3 short sentences in this order: presence reflection (what they conveyed emotionally), performance insight (how it landed), optional forward cue (tiny adjustment). No questions. No bullet lists. Natural to speak aloud.

JSON only:
{
  "tone": "string",
  "score": number,
  "tip": "string"
}`
        : `You are a voice-first communication coach. Deliver presence (emotional awareness) plus performance (communication effectiveness). Never ask questions. No theory or meta commentary. Calm, precise, human.

Category voice:
- relationships: safety, attunement, emotional impact; warm and connecting.
- workplace: clarity, professionalism, boundaries, outcomes.
- boundaries: firm, calm limits; self-respect without edge.
- conflict/difficult: regulation under pressure; restraint and de-escalation.

Difficulty voice (if not provided, assume intermediate):
- beginner: softer, validating, light critique.
- intermediate: balanced reflection + refinement.
- advanced: sharp, concise, expects control.

Produce concise, spoken-friendly strings (no bullets, no lists in text fields). For any text fields below, avoid questions.

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
}`;

      // Call OpenAI for tone analysis
      const analysis = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Category: ${category || "general"}\nScenario: ${prompt}\nUser's Response: ${response}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(analysis.choices[0].message.content || "{}");

      // Calculate base XP and Peace Points
      // Quick mode awards 50% XP to encourage but not replace full practice
      const score = result.score || 50;
      const xpMultiplier = quickMode ? 0.5 : 1;
      const baseXp = Math.floor((10 + (score / 100) * 20) * xpMultiplier);
      const ppEarned = Math.floor((5 + (score / 100) * 10) * xpMultiplier);

      // Update streak and get bonus
      const { streakBonus, currentStreak } = await updateStreak(userId);
      
      // Apply streak multiplier to XP
      const multiplier = getStreakMultiplier(currentStreak);
      let xpEarned = Math.floor(baseXp * multiplier) + streakBonus;

      // Save practice session (mark as 'quick' mode if quickMode is true)
      const session = await storage.createPracticeSession({
        userId,
        prompt,
        response,
        category,
        mode: quickMode ? "quick" : "text",
        tone: result.tone,
        score,
        tips: quickMode ? (result.tip ? [result.tip] : []) : result.tips,
        exampleResponses: quickMode ? [] : result.exampleResponses,
        xpEarned,
        ppEarned,
      });

      // Create best moment if score >= 85
      let bestMomentCreated = false;
      if (score >= 85) {
        try {
          const insightResponse = await requireOpenAI().chat.completions.create({
            model: "gpt-4o",
            messages: [
              {
                role: "system",
                content: `You are an expert communication coach. Analyze this excellent response and explain what made it exceptional. Generate a short title (5-8 words), extract a key excerpt (1-2 sentences from the response that showcase the best part), provide an AI insight (2-3 sentences explaining what made it great), and suggest 2-3 relevant tags.
                
Respond in JSON format:
{
  "title": "string",
  "excerpt": "string",
  "aiInsight": "string",
  "tags": ["tag1", "tag2"]
}`
              },
              {
                role: "user",
                content: `Scenario: ${prompt}\n\nResponse (score: ${score}): ${response}\nTone: ${result.tone}\nCategory: ${category || "general"}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const insightResult = JSON.parse(insightResponse.choices[0].message.content || "{}");
          
          await storage.createBestMoment({
            userId,
            sessionId: session.id,
            title: insightResult.title || `Excellent ${result.tone} Response`,
            excerpt: insightResult.excerpt || response.substring(0, 150),
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

      // Update progress
      const progress = await storage.getProgress(userId);
      if (progress) {
        const oldLevel = progress.level || 1;
        const newTotalXp = (progress.totalXp || 0) + xpEarned;
        const newLevel = Math.floor(newTotalXp / 100) + 1;
        await storage.updateProgress(userId, {
          totalXp: newTotalXp,
          totalPp: (progress.totalPp || 0) + ppEarned,
          practiceCount: (progress.practiceCount || 0) + 1,
          level: newLevel,
        });

        // Auto-share level-up milestone to community feed
        if (newLevel > oldLevel) {
          try {
            await storage.createCommunityPost({
              userId,
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

      // Check and award badges
      const newBadges = await checkAndAwardBadges({
        userId,
        eventType: "practice",
        score,
        mode: "text",
      });

      // Return condensed response for quick mode
      if (quickMode) {
        res.json({
          tone: result.tone,
          score,
          tip: result.tip || (result.tips ? result.tips[0] : "Keep practicing!"),
          xpEarned,
          ppEarned,
          currentStreak,
          quickMode: true,
        });
      } else {
        res.json({
          ...result,
          xpEarned,
          ppEarned,
          streakBonus,
          currentStreak,
          streakMultiplier: multiplier,
          bestMomentCreated,
          newBadges: newBadges.map(b => ({ name: b.name, icon: b.icon, description: b.description })),
        });
      }
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error analyzing practice:", error);
      res.status(500).json({ message: "Failed to analyze response" });
    }
  });

  // Practice + Feedback route (single-turn structured feedback, NOT a conversation)
  app.post("/api/practice/feedback", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt, response } = req.body;

      if (!prompt || !response) {
        return res.status(400).json({ message: "Prompt and response are required" });
      }

      // Check subscription limits
      const usageCheck = await canAnalyze(userId);
      if (!usageCheck.allowed) {
        return res.status(402).json({
          message: "Daily analysis limit reached. Upgrade your subscription for more analyses.",
          tier: usageCheck.tier,
          limit: usageCheck.limit,
          usedToday: usageCheck.usedToday,
          upgradeRequired: true,
        });
      }

      const systemPrompt = `You are Mirror AI, an emotional-intelligence coach.

The user has written a response to a difficult real-life conversation prompt.

Your job is NOT to reply as the other person.
Your job is NOT to continue a conversation.
Your job is to analyze the user's response and give constructive feedback.

Analyze the response across these dimensions:
- Clarity
- Emotional awareness
- Tone
- Needs & boundaries
- Emotional impact on the other person

Respond in this exact JSON structure:
{
  "overallRead": "One short paragraph summarizing how the message comes across.",
  "whatsWorking": ["Bullet point 1", "Bullet point 2", "Bullet point 3"],
  "whatCouldBeStronger": ["Specific actionable suggestion 1", "Specific actionable suggestion 2"],
  "optionalRewrite": "A revised version that preserves the user's voice but improves clarity and tone. Optional - include only if significant improvements can be made."
}

Guidelines:
- Be supportive and practical
- No shaming
- No over-therapizing
- Be concise and human
- Focus on actionable improvements`;

      const analysis = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Scenario: ${prompt}\n\nUser's Response: "${response}"` }
        ],
        response_format: { type: "json_object" }
      });

      const feedback = JSON.parse(analysis.choices[0].message.content || "{}");

      // Award XP for completing feedback
      const xpEarned = 15;
      const ppEarned = 5;
      
      const progress = await storage.getProgress(userId);
      if (progress) {
        await storage.updateProgress(userId, {
          totalXp: (progress.totalXp || 0) + xpEarned,
          totalPp: (progress.totalPp || 0) + ppEarned,
          practiceCount: (progress.practiceCount || 0) + 1,
        });
      }

      res.json({
        feedback,
        xpEarned,
        ppEarned,
      });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error generating practice feedback:", error);
      res.status(500).json({ message: "Failed to generate feedback" });
    }
  });

  // Voice practice analysis route
  app.post("/api/practice/analyze-voice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { audioBase64, duration, prompt, category, response: textResponse } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      if (!audioBase64 && !textResponse) {
        return res.status(400).json({ message: "Either audio data or text response is required" });
      }

      // Check subscription limits
      const usageCheck = await canAnalyze(userId);
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

      // Only transcribe if audio is provided (text response skips transcription)
      if (audioBase64 && !textResponse) {
        // Convert base64 to buffer for Whisper
        const audioBuffer = Buffer.from(audioBase64, 'base64');
        
        // Create a File-like object for OpenAI
        const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

        // Transcribe with Whisper
        const transcription = await requireOpenAI().audio.transcriptions.create({
          file: audioFile,
          model: "whisper-1",
        });

        transcribedText = transcription.text;
      }

      if (!transcribedText || transcribedText.trim().length === 0) {
        return res.status(400).json({ message: "No response provided. Please try speaking or typing." });
      }

      // Calculate voice metrics
      const wordCount = transcribedText.split(/\s+/).filter((w: string) => w.length > 0).length;
      const wordsPerMinute = audioDuration > 0 ? Math.round((wordCount / audioDuration) * 60) : 0;

      // Detect filler words
      const fillerWords = ['um', 'uh', 'like', 'you know', 'basically', 'actually', 'literally', 'so', 'well', 'right', 'i mean', 'kind of', 'sort of'];
      const lowerText = transcribedText.toLowerCase();
      let fillerWordCount = 0;
      const detectedFillers: string[] = [];
      
      for (const filler of fillerWords) {
        const regex = new RegExp(`\\b${filler}\\b`, 'gi');
        const matches = lowerText.match(regex);
        if (matches) {
          fillerWordCount += matches.length;
          if (!detectedFillers.includes(filler)) {
            detectedFillers.push(filler);
          }
        }
      }

      // Analyze the transcription for tone and quality
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
}`
          },
          {
            role: "user",
            content: `Category: ${category || "general"}\nScenario: ${prompt}\nUser's Spoken Response (transcribed): ${transcribedText}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(analysis.choices[0].message.content || "{}");

      // Calculate base XP and Peace Points (bonus for voice practice)
      const score = result.score || 50;
      const baseXp = Math.floor(15 + (score / 100) * 25); // Slightly higher XP for voice
      const ppEarned = Math.floor(8 + (score / 100) * 12);

      // Update streak and get bonus
      const { streakBonus, currentStreak } = await updateStreak(userId);
      
      // Apply streak multiplier to XP
      const multiplier = getStreakMultiplier(currentStreak);
      let xpEarned = Math.floor(baseXp * multiplier) + streakBonus;

      // Determine speaking pace feedback
      let paceFeedback = "Good pace";
      if (wordsPerMinute < 100) {
        paceFeedback = "Speaking slowly - try to increase pace slightly";
      } else if (wordsPerMinute > 170) {
        paceFeedback = "Speaking quickly - try to slow down for clarity";
      } else if (wordsPerMinute >= 120 && wordsPerMinute <= 150) {
        paceFeedback = "Excellent speaking pace";
      }

      // Save practice session with voice-specific data
      const session = await storage.createPracticeSession({
        userId,
        prompt,
        response: transcribedText,
        category,
        mode: "voice",
        tone: result.tone,
        score,
        tips: result.coachingInsight ? [result.coachingInsight] : (result.tip ? [result.tip] : []),
        exampleResponses: result.exampleResponses || result.alternatives || [],
        audioDuration,
        wordsPerMinute,
        fillerWordCount,
        transcription: transcribedText,
        xpEarned,
        ppEarned,
      });

      // Create best moment if score >= 85
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
}`
              },
              {
                role: "user",
                content: `Scenario: ${prompt}\n\nSpoken Response (score: ${score}): ${transcribedText}\nTone: ${result.tone}\nCategory: ${category || "general"}\nWords Per Minute: ${wordsPerMinute}`
              }
            ],
            response_format: { type: "json_object" }
          });

          const insightResult = JSON.parse(insightResponse.choices[0].message.content || "{}");
          
          await storage.createBestMoment({
            userId,
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

      // Update progress
      const progress = await storage.getProgress(userId);
      if (progress) {
        const oldLevel = progress.level || 1;
        const newTotalXp = (progress.totalXp || 0) + xpEarned;
        const newLevel = Math.floor(newTotalXp / 100) + 1;
        await storage.updateProgress(userId, {
          totalXp: newTotalXp,
          totalPp: (progress.totalPp || 0) + ppEarned,
          practiceCount: (progress.practiceCount || 0) + 1,
          level: newLevel,
        });

        // Auto-share level-up milestone to community feed
        if (newLevel > oldLevel) {
          try {
            await storage.createCommunityPost({
              userId,
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

      // Check and award badges
      const newBadges = await checkAndAwardBadges({
        userId,
        eventType: "voice_practice",
        score,
        mode: "voice",
      });

      res.json({
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
        newBadges: newBadges.map(b => ({ name: b.name, icon: b.icon, description: b.description })),
      });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error analyzing voice practice:", error);
      res.status(500).json({ message: "Failed to analyze voice response" });
    }
  });

  // Transcribe audio endpoint
  app.post("/api/transcribe", isAuthenticated, async (req: any, res) => {
    try {
      const { audioBase64 } = req.body;

      if (!audioBase64) {
        return res.status(400).json({ message: "Audio data is required" });
      }

      // Convert base64 to buffer for Whisper
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      
      // Create a File-like object for OpenAI
      const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

      // Transcribe with Whisper
      const transcription = await requireOpenAI().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      const text = transcription.text;

      if (!text || text.trim().length === 0) {
        return res.status(400).json({ message: "Could not transcribe audio. Please try speaking more clearly." });
      }

      res.json({ text });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error transcribing audio:", error);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Practice sessions history
  app.get("/api/sessions/recent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getPracticeSessions(userId, 10);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Best Moments routes
  app.get("/api/best-moments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const moments = await storage.getUserBestMoments(userId);
      res.json(moments);
    } catch (error) {
      console.error("Error fetching best moments:", error);
      res.status(500).json({ message: "Failed to fetch best moments" });
    }
  });

  app.patch("/api/best-moments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { isPublic } = req.body;

      if (typeof isPublic !== "boolean") {
        return res.status(400).json({ message: "isPublic must be a boolean" });
      }

      const moment = await storage.getBestMoment(id);
      if (!moment) {
        return res.status(404).json({ message: "Moment not found" });
      }

      if (moment.userId !== userId) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const updated = await storage.updateBestMomentVisibility(id, isPublic);
      res.json(updated);
    } catch (error) {
      console.error("Error updating best moment:", error);
      res.status(500).json({ message: "Failed to update best moment" });
    }
  });

  app.get("/api/best-moments/public/:userId", async (req: any, res) => {
    try {
      const { userId } = req.params;
      const moments = await storage.getPublicBestMoments(userId);
      
      // Increment view count for each moment
      for (const moment of moments) {
        await storage.incrementBestMomentViewCount(moment.id);
      }
      
      res.json(moments);
    } catch (error) {
      console.error("Error fetching public best moments:", error);
      res.status(500).json({ message: "Failed to fetch public best moments" });
    }
  });

  // Subscription usage endpoint
  app.get("/api/subscription/usage", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const tier = await getSubscriptionTier(userId);
      const dailyLimit = getDailyLimit(tier);
      const usedToday = await getDailyUsage(userId);
      const remainingToday = dailyLimit === Infinity ? Infinity : Math.max(0, dailyLimit - usedToday);
      const allowed = dailyLimit === Infinity || usedToday < dailyLimit;

      res.json({
        tier,
        dailyLimit: dailyLimit === Infinity ? 'unlimited' : dailyLimit,
        usedToday,
        remainingToday: remainingToday === Infinity ? 'unlimited' : remainingToday,
        allowed,
        remaining: remainingToday === Infinity ? Infinity : remainingToday,
        limit: dailyLimit === Infinity ? Infinity : dailyLimit,
      });
    } catch (error) {
      console.error("Error fetching subscription usage:", error);
      res.status(500).json({ message: "Failed to fetch subscription usage" });
    }
  });

  // Daily Capsule routes
  app.get("/api/daily-capsule", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const today = new Date();
      
      let capsule = await storage.getDailyCapsule(userId, today);
      
      if (!capsule) {
        // Create new capsule with random category
        const categories = ["workplace", "relationships", "family", "social", "self-advocacy"];
        const category = categories[Math.floor(Math.random() * categories.length)];
        const questions = Array.from({ length: 3 }, () => {
          const prompt = PRACTICE_HANDOFFS[Math.floor(Math.random() * PRACTICE_HANDOFFS.length)];
          return prompt?.line ?? DEFAULT_HANDOFF_LINE;
        });
        
        capsule = await storage.createDailyCapsule({
          userId,
          category,
          questions,
          selectedQuestionIndex: 0,
          completed: false,
          capsuleDate: today,
        });
      }
      
      res.json(capsule);
    } catch (error) {
      console.error("Error fetching daily capsule:", error);
      res.status(500).json({ message: "Failed to fetch daily capsule" });
    }
  });

  // Chat routes
  app.get("/api/chat/conversation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let conversation = await storage.getConversation(userId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          userId,
          messages: [],
          emotionState: "calm",
        });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  // Get all conversations history
  app.get("/api/chat/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const allConversations = await storage.getAllConversations(userId, limit);
      res.json(allConversations);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  app.post("/api/chat/message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      let conversation = await storage.getConversation(userId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          userId,
          messages: [],
          emotionState: "calm",
        });
      }

      const messages = (conversation.messages as any[]) || [];
      messages.push({ role: "user", content: message });

      // Call OpenAI for response
      const chatResponse = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Mirror AI, a warm and supportive emotional intelligence coach. Your role is to:
1. Listen with empathy and validate feelings
2. Help users navigate difficult emotions and situations
3. Provide practical communication strategies
4. Encourage self-reflection and growth
5. Celebrate progress and wins

Be conversational, warm, and supportive. Use "I" statements and ask thoughtful questions. Keep responses concise but meaningful (2-3 paragraphs max).`
          },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
      });

      const assistantMessage = chatResponse.choices[0].message.content || "I'm here to help. Could you tell me more?";
      messages.push({ role: "assistant", content: assistantMessage });

      // Update conversation
      await storage.updateConversation(conversation.id, {
        messages,
        emotionState: "supportive",
      });

      res.json({ message: assistantMessage });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.post("/api/chat/reset", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const conversation = await storage.createConversation({
        userId,
        messages: [],
        emotionState: "calm",
      });
      
      res.json(conversation);
    } catch (error) {
      console.error("Error resetting conversation:", error);
      res.status(500).json({ message: "Failed to reset conversation" });
    }
  });

  // Chat with TTS audio endpoint
  app.post("/api/chat/message/audio", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { message, voiceId } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      let conversation = await storage.getConversation(userId);
      
      if (!conversation) {
        conversation = await storage.createConversation({
          userId,
          messages: [],
          emotionState: "calm",
        });
      }

      const messages = (conversation.messages as any[]) || [];
      messages.push({ role: "user", content: message });

      // Call OpenAI for response
      const chatResponse = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Mirror AI, a warm and supportive emotional intelligence coach. Your role is to:
1. Listen with empathy and validate feelings
2. Help users navigate difficult emotions and situations
3. Provide practical communication strategies
4. Encourage self-reflection and growth
5. Celebrate progress and wins

Be conversational, warm, and supportive. Use "I" statements and ask thoughtful questions. Keep responses concise but meaningful (2-3 paragraphs max).`
          },
          ...messages.map((m: any) => ({ role: m.role, content: m.content }))
        ],
      });

      const assistantMessage = chatResponse.choices[0].message.content || "I'm here to help. Could you tell me more?";
      messages.push({ role: "assistant", content: assistantMessage });

      // Update conversation
      await storage.updateConversation(conversation.id, {
        messages,
        emotionState: "supportive",
      });

      // Generate TTS audio if available
      let audioBase64: string | null = null;
      if (isElevenLabsAvailable()) {
        const prefs = await storage.getUserVoicePreferences(userId);
        const selectedVoiceId = voiceId || prefs?.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM";
        console.log("Generating TTS with voice ID:", selectedVoiceId);
        
        const audioBuffer = await textToSpeech(assistantMessage, selectedVoiceId, { section: "analysis-how" });
        if (audioBuffer) {
          audioBase64 = audioBuffer.toString("base64");
          console.log("Audio generated, base64 length:", audioBase64.length);
        } else {
          console.log("Audio buffer was null");
        }
      }

      res.json({ 
        message: assistantMessage, 
        audio: audioBase64,
        ttsAvailable: isElevenLabsAvailable()
      });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error sending message with audio:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Personalized greeting endpoint
  app.post("/api/chat/greeting", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { includeTts, voiceId } = req.body;

      // Fetch user data for personalization
      const [user, progress, badges, subscription, recentSessions] = await Promise.all([
        storage.getUser(userId),
        storage.getProgress(userId),
        storage.getUserBadges(userId),
        storage.getSubscription(userId),
        storage.getPracticeSessions(userId, 5),
      ]);

      // Build context for personalized greeting
      const userName = user?.firstName || "friend";
      const level = progress?.level || 1;
      const currentStreak = progress?.currentStreak || 0;
      const totalSessions = progress?.practiceCount || 0;
      const recentBadges = badges.slice(0, 3).map(b => b.badge.name);
      const tier = subscription?.tier || "free";
      
      // Determine most practiced categories
      const categoryCount: Record<string, number> = {};
      for (const session of recentSessions) {
        const cat = session.category || "general";
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
      const topCategories = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(([cat]) => cat);

      // Create personalization context
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

      // Generate personalized greeting with OpenAI
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
If they have progress, briefly acknowledge it in an encouraging way.`
          },
          {
            role: "user",
            content: `Generate a greeting for ${userName}. ${contextInfo}`
          }
        ],
        max_tokens: 100,
      });

      const greetingText = greetingResponse.choices[0].message.content || `Hi ${userName}! I'm here to help you grow. What's on your mind today?`;

      // Create or reset conversation with greeting as first message
      const conversation = await storage.createConversation({
        userId,
        messages: [{ role: "assistant", content: greetingText }],
        emotionState: "warm",
      });

      // Generate TTS audio if requested
      let audioBase64: string | null = null;
      if (includeTts && isElevenLabsAvailable()) {
        const prefs = await storage.getUserVoicePreferences(userId);
        const selectedVoiceId = voiceId || prefs?.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM";
        
        const audioBuffer = await textToSpeech(greetingText, selectedVoiceId, { section: "scenario" });
        if (audioBuffer) {
          audioBase64 = audioBuffer.toString("base64");
        }
      }

      // Return context for quick-start suggestions
      res.json({
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
      console.error("Error generating greeting:", error);
      res.status(500).json({ message: "Failed to generate greeting" });
    }
  });

  // Voice Cloning Routes
  
  // Start voice cloning process - creates a pending voice clone record
  app.post("/api/voice-clone/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Voice name is required" });
      }

      if (!isElevenLabsAvailable()) {
        return res.status(503).json({ message: "Voice cloning not available - ElevenLabs API key required" });
      }

      // Create pending voice clone record
      const voiceClone = await storage.createVoiceClone({
        userId,
        name,
        description: description || `Custom voice clone: ${name}`,
        status: "pending",
        sampleCount: 0,
      });

      res.json({ 
        success: true, 
        voiceClone,
        message: "Voice clone created. Upload audio samples to continue."
      });
    } catch (error) {
      console.error("Error starting voice clone:", error);
      res.status(500).json({ message: "Failed to start voice cloning" });
    }
  });

  // Get voice clone status
  app.get("/api/voice-clone/status/:voiceCloneId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceCloneId } = req.params;

      const voiceClone = await storage.getVoiceClone(voiceCloneId);
      
      if (!voiceClone || voiceClone.userId !== userId) {
        return res.status(404).json({ message: "Voice clone not found" });
      }

      const samples = await storage.getVoiceCloneSamples(voiceCloneId);

      res.json({
        voiceClone,
        samples,
        canFinalize: samples.length >= 1,
      });
    } catch (error) {
      console.error("Error fetching voice clone status:", error);
      res.status(500).json({ message: "Failed to fetch voice clone status" });
    }
  });

  // Upload audio sample for voice cloning
  app.post("/api/voice-clone/upload-sample", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceCloneId, audioBase64, duration } = req.body;

      if (!voiceCloneId || !audioBase64) {
        return res.status(400).json({ message: "Voice clone ID and audio data are required" });
      }

      const voiceClone = await storage.getVoiceClone(voiceCloneId);
      
      if (!voiceClone || voiceClone.userId !== userId) {
        return res.status(404).json({ message: "Voice clone not found" });
      }

      if (voiceClone.status === "completed") {
        return res.status(400).json({ message: "Voice clone is already completed" });
      }

      // Store sample reference (base64 stored temporarily for processing)
      const sample = await storage.createVoiceCloneSample({
        userId,
        voiceCloneId,
        sampleUrl: audioBase64.substring(0, 100) + "...", // Store reference, not full data
        duration: duration || 0,
        status: "pending",
      });

      // Update sample count
      const samples = await storage.getVoiceCloneSamples(voiceCloneId);
      await storage.updateVoiceClone(voiceCloneId, {
        sampleCount: samples.length,
      });

      res.json({
        success: true,
        sample,
        sampleCount: samples.length,
        message: `Sample ${samples.length} uploaded successfully`,
      });
    } catch (error) {
      console.error("Error uploading voice sample:", error);
      res.status(500).json({ message: "Failed to upload voice sample" });
    }
  });

  // Finalize voice clone - send samples to ElevenLabs
  app.post("/api/voice-clone/finalize", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceCloneId, samples } = req.body;

      if (!voiceCloneId || !samples || samples.length === 0) {
        return res.status(400).json({ message: "Voice clone ID and samples are required" });
      }

      const voiceClone = await storage.getVoiceClone(voiceCloneId);
      
      if (!voiceClone || voiceClone.userId !== userId) {
        return res.status(404).json({ message: "Voice clone not found" });
      }

      if (voiceClone.status === "completed") {
        return res.status(400).json({ message: "Voice clone is already completed" });
      }

      // Update status to processing
      await storage.updateVoiceClone(voiceCloneId, { status: "processing" });

      // Convert base64 samples to buffers
      const audioSamples = samples.map((sample: { audioBase64: string; filename: string }, index: number) => ({
        buffer: Buffer.from(sample.audioBase64, 'base64'),
        filename: sample.filename || `sample_${index + 1}.mp3`,
      }));

      // Create voice clone with ElevenLabs
      const result = await createVoiceCloneEL(
        voiceClone.name || "My Voice",
        voiceClone.description || "Custom voice clone",
        audioSamples
      );

      if (!result.success) {
        await storage.updateVoiceClone(voiceCloneId, { 
          status: "failed",
          errorMessage: result.error,
        });
        return res.status(500).json({ 
          success: false, 
          message: result.error || "Failed to create voice clone" 
        });
      }

      // Update voice clone with ElevenLabs ID
      await storage.updateVoiceClone(voiceCloneId, {
        elevenLabsVoiceId: result.voiceId,
        status: "completed",
      });

      res.json({
        success: true,
        voiceId: result.voiceId,
        message: "Voice clone created successfully!",
      });
    } catch (error) {
      console.error("Error finalizing voice clone:", error);
      res.status(500).json({ message: "Failed to finalize voice clone" });
    }
  });

  // Delete a voice clone
  app.delete("/api/voice-clone/:voiceCloneId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceCloneId } = req.params;

      const voiceClone = await storage.getVoiceClone(voiceCloneId);
      
      if (!voiceClone || voiceClone.userId !== userId) {
        return res.status(404).json({ message: "Voice clone not found" });
      }

      // Delete from ElevenLabs if it exists
      if (voiceClone.elevenLabsVoiceId) {
        await deleteElevenLabsVoice(voiceClone.elevenLabsVoiceId);
      }

      // Delete samples and voice clone record
      await storage.deleteVoiceCloneSamples(voiceCloneId);
      await storage.deleteVoiceClone(voiceCloneId);

      res.json({ success: true, message: "Voice clone deleted" });
    } catch (error) {
      console.error("Error deleting voice clone:", error);
      res.status(500).json({ message: "Failed to delete voice clone" });
    }
  });

  // Use a cloned voice for TTS
  app.post("/api/voice-clone/use", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { voiceCloneId } = req.body;

      const voiceClone = await storage.getVoiceClone(voiceCloneId);
      
      if (!voiceClone || voiceClone.userId !== userId) {
        return res.status(404).json({ message: "Voice clone not found" });
      }

      if (voiceClone.status !== "completed" || !voiceClone.elevenLabsVoiceId) {
        return res.status(400).json({ message: "Voice clone is not ready" });
      }

      // Set as default and update user preferences to use this voice
      await storage.setDefaultVoiceClone(userId, voiceCloneId);
      await storage.upsertUserVoicePreferences(userId, {
        selectedVoiceId: voiceClone.elevenLabsVoiceId,
        ttsEnabled: true,
      });

      res.json({ 
        success: true, 
        message: "Now using your cloned voice!",
        voiceId: voiceClone.elevenLabsVoiceId,
      });
    } catch (error) {
      console.error("Error setting voice clone:", error);
      res.status(500).json({ message: "Failed to set voice clone" });
    }
  });

  // Simplified voice status for onboarding
  app.get("/api/voice/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const voiceClones = await storage.getUserVoiceClones(userId);
      const activeClone = voiceClones.find(vc => vc.status === "completed" && vc.isDefault);
      
      res.json({
        elevenlabsConfigured: isElevenLabsAvailable(),
        hasVoiceClone: !!activeClone,
        voiceClone: activeClone ? {
          id: activeClone.id,
          name: activeClone.name || "My Voice",
          status: activeClone.status,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching voice status:", error);
      res.status(500).json({ message: "Failed to fetch voice status" });
    }
  });

  // Create voice clone from single recording
  app.post("/api/voice/clone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { audioData } = req.body;

      if (!audioData) {
        return res.status(400).json({ message: "Audio data is required" });
      }

      if (!isElevenLabsAvailable()) {
        return res.status(400).json({ message: "Voice cloning is not configured" });
      }

      // Create voice clone record
      const voiceClone = await storage.createVoiceClone({
        userId,
        name: "My Voice",
        description: "Custom voice clone",
        status: "processing",
      });

      // Convert base64 to buffer
      const audioBuffer = Buffer.from(audioData, "base64");
      
      // Create voice clone with ElevenLabs
      const result = await createVoiceCloneEL(
        "My Voice",
        "Custom voice clone",
        [{ buffer: audioBuffer, filename: "sample.webm" }]
      );

      if (result.success && result.voiceId) {
        await storage.updateVoiceClone(voiceClone.id, {
          status: "completed",
          elevenLabsVoiceId: result.voiceId,
        });
        
        // Set as default
        await storage.setDefaultVoiceClone(userId, voiceClone.id);
        
        // Mark voice onboarding as completed
        await storage.updateProgress(userId, {
          voiceOnboardingCompleted: true,
        });
        
        res.json({ 
          success: true,
          voiceCloneId: voiceClone.id,
          voiceId: result.voiceId,
        });
      } else {
        await storage.updateVoiceClone(voiceClone.id, {
          status: "failed",
          errorMessage: result.error || "Unknown error",
        });
        res.status(500).json({ message: result.error || "Failed to create voice clone" });
      }
    } catch (error) {
      console.error("Error creating voice clone:", error);
      res.status(500).json({ message: "Failed to create voice clone" });
    }
  });

  // Delete voice clone
  app.delete("/api/voice/clone", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const voiceClones = await storage.getUserVoiceClones(userId);
      const activeClone = voiceClones.find(vc => vc.isDefault);
      
      if (!activeClone) {
        return res.status(404).json({ message: "No active voice clone found" });
      }
      
      // Delete from ElevenLabs
      if (activeClone.elevenLabsVoiceId) {
        await deleteElevenLabsVoice(activeClone.elevenLabsVoiceId);
      }
      
      // Delete from database
      await storage.deleteVoiceClone(activeClone.id);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting voice clone:", error);
      res.status(500).json({ message: "Failed to delete voice clone" });
    }
  });

  // Skip voice onboarding
  app.post("/api/voice/onboarding/skip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      await storage.updateProgress(userId, {
        voiceOnboardingCompleted: true,
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error skipping voice onboarding:", error);
      res.status(500).json({ message: "Failed to skip voice onboarding" });
    }
  });

  // Shop routes
  app.get("/api/shop/items", isAuthenticated, async (req: any, res) => {
    try {
      const items = await storage.getShopItems();
      res.json(items);
    } catch (error) {
      console.error("Error fetching shop items:", error);
      res.status(500).json({ message: "Failed to fetch shop items" });
    }
  });

  app.post("/api/shop/purchase", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { itemId } = req.body;

      if (!itemId) {
        return res.status(400).json({ message: "Item ID is required" });
      }

      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      const progress = await storage.getProgress(userId);
      if (!progress || (progress.totalPp || 0) < item.price) {
        return res.status(400).json({ message: "Not enough Peace Points" });
      }

      // Check if already owned
      const ownedIds = await storage.getUserInventoryIds(userId);
      if (ownedIds.includes(itemId)) {
        return res.status(400).json({ message: "Item already owned" });
      }

      // Deduct points and add to inventory
      await storage.updateProgress(userId, {
        totalPp: (progress.totalPp || 0) - item.price,
      });

      await storage.addToInventory({ userId, itemId });

      res.json({ success: true });
    } catch (error) {
      console.error("Error purchasing item:", error);
      res.status(500).json({ message: "Failed to purchase item" });
    }
  });

  // Inventory routes
  app.get("/api/inventory", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const inventory = await storage.getUserInventory(userId);
      res.json(inventory);
    } catch (error) {
      console.error("Error fetching inventory:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  app.get("/api/inventory/ids", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const ids = await storage.getUserInventoryIds(userId);
      res.json(ids);
    } catch (error) {
      console.error("Error fetching inventory ids:", error);
      res.status(500).json({ message: "Failed to fetch inventory" });
    }
  });

  // Inventory equip routes
  app.get("/api/inventory/equipped", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const equipped = await storage.getEquippedItems(userId);
      res.json(equipped);
    } catch (error) {
      console.error("Error fetching equipped items:", error);
      res.status(500).json({ message: "Failed to fetch equipped items" });
    }
  });

  // Avatar settings routes
  app.get("/api/avatar/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const settings = await storage.getUserAvatarSettings(userId);
      res.json(settings || null);
    } catch (error) {
      console.error("Error fetching avatar settings:", error);
      res.status(500).json({ message: "Failed to fetch avatar settings" });
    }
  });

  app.post("/api/avatar/settings", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Validate request body against schema (partial allows optional fields)
      const validationResult = insertUserAvatarSettingsSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid avatar settings", 
          errors: validationResult.error.errors 
        });
      }
      
      // Only use validated data (strips unknown fields)
      const validatedData = validationResult.data;
      
      const settings = await storage.upsertUserAvatarSettings({
        userId,
        skinTone: validatedData.skinTone,
        hairStyle: validatedData.hairStyle,
        hairColor: validatedData.hairColor,
        eyeStyle: validatedData.eyeStyle,
        eyeColor: validatedData.eyeColor,
        mouthStyle: validatedData.mouthStyle,
        faceShape: validatedData.faceShape,
        accessory: validatedData.accessory,
        accessoryColor: validatedData.accessoryColor,
        blush: validatedData.blush,
        freckles: validatedData.freckles,
        avatarConfigV2: validatedData.avatarConfigV2,
        activePresetId: validatedData.activePresetId,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error saving avatar settings:", error);
      res.status(500).json({ message: "Failed to save avatar settings" });
    }
  });

  // Save avatar config v2 (the full JSON config)
  app.put("/api/avatar/settings/v2", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { avatarConfigV2, activePresetId } = req.body;
      
      if (!avatarConfigV2 || typeof avatarConfigV2 !== 'object') {
        return res.status(400).json({ message: "avatarConfigV2 object is required" });
      }
      
      const settings = await storage.upsertUserAvatarSettings({
        userId,
        avatarConfigV2,
        activePresetId: activePresetId || null,
      });
      res.json(settings);
    } catch (error) {
      console.error("Error saving avatar config v2:", error);
      res.status(500).json({ message: "Failed to save avatar config" });
    }
  });

  // Avatar preset routes
  app.get("/api/avatar/presets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const presets = await storage.getAvatarPresets(userId);
      res.json(presets);
    } catch (error) {
      console.error("Error fetching avatar presets:", error);
      res.status(500).json({ message: "Failed to fetch avatar presets" });
    }
  });

  app.post("/api/avatar/presets", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check preset limit (5 per user)
      const presetCount = await storage.countUserAvatarPresets(userId);
      if (presetCount >= 5) {
        return res.status(400).json({ message: "Maximum of 5 presets allowed. Delete a preset to create a new one." });
      }
      
      const validationResult = insertAvatarPresetSchema.safeParse({
        ...req.body,
        userId,
      });
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid preset data", 
          errors: validationResult.error.errors 
        });
      }
      
      const preset = await storage.createAvatarPreset(validationResult.data);
      res.status(201).json(preset);
    } catch (error) {
      console.error("Error creating avatar preset:", error);
      res.status(500).json({ message: "Failed to create avatar preset" });
    }
  });

  app.put("/api/avatar/presets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Verify ownership
      const existing = await storage.getAvatarPreset(id);
      if (!existing) {
        return res.status(404).json({ message: "Preset not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this preset" });
      }
      
      const validationResult = insertAvatarPresetSchema.partial().safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid preset data", 
          errors: validationResult.error.errors 
        });
      }
      
      const preset = await storage.updateAvatarPreset(id, validationResult.data);
      res.json(preset);
    } catch (error) {
      console.error("Error updating avatar preset:", error);
      res.status(500).json({ message: "Failed to update avatar preset" });
    }
  });

  app.delete("/api/avatar/presets/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Verify ownership
      const existing = await storage.getAvatarPreset(id);
      if (!existing) {
        return res.status(404).json({ message: "Preset not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this preset" });
      }
      
      await storage.deleteAvatarPreset(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting avatar preset:", error);
      res.status(500).json({ message: "Failed to delete avatar preset" });
    }
  });

  app.post("/api/avatar/presets/:id/set-default", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      // Verify ownership
      const existing = await storage.getAvatarPreset(id);
      if (!existing) {
        return res.status(404).json({ message: "Preset not found" });
      }
      if (existing.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this preset" });
      }
      
      await storage.setDefaultAvatarPreset(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error setting default avatar preset:", error);
      res.status(500).json({ message: "Failed to set default preset" });
    }
  });

  app.post("/api/inventory/equip", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { itemId, category } = req.body;

      if (!itemId || !category) {
        return res.status(400).json({ message: "Item ID and category are required" });
      }

      // Validate that user owns this item
      const ownedIds = await storage.getUserInventoryIds(userId);
      if (!ownedIds.includes(itemId)) {
        return res.status(400).json({ message: "You don't own this item" });
      }

      // Validate item exists
      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      await storage.equipItem({ userId, itemId, category });
      res.json({ success: true });
    } catch (error) {
      console.error("Error equipping item:", error);
      res.status(500).json({ message: "Failed to equip item" });
    }
  });

  // Rehearsal routes
  app.get("/api/rehearsals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const rehearsals = await storage.getRehearsals(userId, 20);
      res.json(rehearsals);
    } catch (error) {
      console.error("Error fetching rehearsals:", error);
      res.status(500).json({ message: "Failed to fetch rehearsals" });
    }
  });

  app.post("/api/rehearsal/message", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { scenarioId, message, currentPhase, escalationLevel, messageHistory, rehearsalId } = req.body;

      if (!scenarioId || !message) {
        return res.status(400).json({ message: "Scenario ID and message are required" });
      }

      // Load scenario metadata
      const scenario = getScenarioById(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const history = messageHistory || [];
      const phaseCount = scenario.phases.length;
      const currentPhaseData = scenario.phases[currentPhase] || scenario.phases[0];
      
      // Build phase context for the AI
      const phaseContext = currentPhaseData 
        ? `Current Phase: "${currentPhaseData.name}" - Objective: ${currentPhaseData.objective}
Tips the user should demonstrate: ${currentPhaseData.tips.join(", ")}`
        : "";
      
      // Call OpenAI for scenario roleplay with full scenario context
      const chatResponse = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are playing a character in a communication practice scenario. Your role: ${scenario.aiRole}

SCENARIO: "${scenario.title}"
Context: ${scenario.context}

${phaseContext}

Current phase: ${currentPhase + 1} of ${phaseCount}
Escalation level: ${escalationLevel}/5 (1=mild, 5=intense)
Difficulty: ${scenario.difficulty}/5

Guidelines:
- Stay in character as: ${scenario.aiRole}
- React naturally and realistically to what the user says
- Gradually de-escalate if the user uses good communication techniques (I-statements, empathy, active listening)
- Escalate slightly if the user uses poor communication (defensive, aggressive, dismissive, blaming)
- Keep responses conversational and realistic (2-3 sentences)
- When user successfully meets the phase objective, show readiness to move forward

After ${phaseCount * 2} exchanges, if the user has shown good communication skills, wrap up the scenario positively.`
          },
          ...history.map((m: any) => ({ role: m.role, content: m.content })),
          { role: "user", content: message }
        ],
        response_format: { type: "text" }
      });

      const response = chatResponse.choices[0].message.content || "I hear what you're saying.";
      
      // Determine phase progression and completion based on actual scenario phases
      const totalMessages = history.length + 2;
      const messagesPerPhase = Math.max(2, Math.floor(8 / phaseCount));
      const calculatedPhase = Math.min(Math.floor(totalMessages / messagesPerPhase), phaseCount - 1);
      const nextPhase = Math.max(currentPhase, calculatedPhase);
      const minMessagesForCompletion = phaseCount * 2;
      const shouldComplete = totalMessages >= minMessagesForCompletion + 2 || (nextPhase >= phaseCount - 1 && totalMessages >= minMessagesForCompletion);

      // Adjust escalation based on conversation quality
      const newEscalation = Math.max(1, Math.min(5, escalationLevel + (Math.random() > 0.6 ? -1 : 0)));

      let result: any = {
        response,
        nextPhase,
        escalationLevel: newEscalation,
        completed: shouldComplete,
      };

      // Update conversation history for persisting
      const updatedHistory = [
        ...history,
        { role: "user", content: message },
        { role: "assistant", content: response }
      ];

      if (shouldComplete) {
        // Generate feedback
        const feedbackResponse = await requireOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `Analyze this practice conversation and provide feedback. Return JSON format:
{
  "score": number (0-100),
  "strengths": ["strength1", "strength2"],
  "improvements": ["area1", "area2"],
  "overallTip": "One key takeaway tip"
}`
            },
            {
              role: "user",
              content: `Conversation:\n${updatedHistory.map((m: any) => `${m.role}: ${m.content}`).join('\n')}`
            }
          ],
          response_format: { type: "json_object" }
        });

        const feedback = JSON.parse(feedbackResponse.choices[0].message.content || "{}");
        const xpEarned = Math.floor(20 + (feedback.score || 50) / 100 * 30);

        // Persist completed rehearsal
        await storage.createRehearsal({
          userId,
          scenarioId,
          messages: updatedHistory,
          currentPhase: nextPhase,
          escalationLevel: newEscalation,
          score: feedback.score || 50,
          feedback: feedback,
          completed: true,
        });

        // Update progress
        const progress = await storage.getProgress(userId);
        if (progress) {
          await storage.updateProgress(userId, {
            totalXp: (progress.totalXp || 0) + xpEarned,
            practiceCount: (progress.practiceCount || 0) + 1,
            level: Math.floor(((progress.totalXp || 0) + xpEarned) / 100) + 1,
          });
        }

        result = {
          ...result,
          score: feedback.score,
          feedback,
          xpEarned,
        };
      }

      res.json(result);
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error in rehearsal:", error);
      res.status(500).json({ message: "Failed to process rehearsal message" });
    }
  });

  // Badges routes
  app.get("/api/badges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const userBadges = await storage.getUserBadges(userId);
      res.json(userBadges);
    } catch (error) {
      console.error("Error fetching badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Subscription routes
  app.get("/api/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      let subscription = await storage.getSubscription(userId);
      
      if (!subscription) {
        subscription = await storage.createSubscription({
          userId,
          tier: "free",
          status: "active",
        });
      }
      
      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  // Manual subscription selection (for non-Stripe environments)
  app.post("/api/subscription/select", isAuthenticated, async (req: any, res) => {
    try {
      const allowManual =
        process.env.ALLOW_MANUAL_SUBSCRIPTION === "true" ||
        process.env.NODE_ENV !== "production";

      if (!allowManual) {
        return res.status(403).json({ message: "Manual subscription selection is disabled" });
      }

      const userId = req.user.id;
      const { tier } = req.body as { tier?: string };
      const allowedTiers = ["free", "peace_plus", "pro_mind"];

      if (!tier || !allowedTiers.includes(tier)) {
        return res.status(400).json({ message: "Invalid subscription tier" });
      }

      let subscription = await storage.getSubscription(userId);
      if (!subscription) {
        subscription = await storage.createSubscription({
          userId,
          tier,
          status: "active",
        });
      } else {
        subscription = await storage.updateSubscription(userId, {
          tier,
          status: "active",
        });
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error selecting subscription tier:", error);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  // Stripe routes
  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const publishableKey = await getStripePublishableKey();
      res.json({ publishableKey });
    } catch (error) {
      console.error("Error getting publishable key:", error);
      res.status(500).json({ message: "Failed to get Stripe key" });
    }
  });

  app.get("/api/stripe/subscription", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.json({ subscription: null, tier: "free" });
      }

      const stripeSubscription = await storage.getStripeSubscriptionByCustomerId(user.stripeCustomerId);
      
      if (!stripeSubscription) {
        return res.json({ subscription: null, tier: "free" });
      }

      const metadata = stripeSubscription.metadata || {};
      const tier = metadata.tier || "free";

      res.json({ 
        subscription: stripeSubscription,
        tier,
        status: stripeSubscription.status
      });
    } catch (error) {
      console.error("Error fetching Stripe subscription:", error);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const rows = await storage.getStripeProductsWithPrices();
      
      const productsMap = new Map();
      for (const row of rows) {
        if (!productsMap.has(row.product_id)) {
          productsMap.set(row.product_id, {
            id: row.product_id,
            name: row.product_name,
            description: row.product_description,
            metadata: row.product_metadata,
            prices: []
          });
        }
        if (row.price_id) {
          productsMap.get(row.product_id).prices.push({
            id: row.price_id,
            unit_amount: row.unit_amount,
            currency: row.currency,
            recurring: row.recurring,
          });
        }
      }

      res.json({ products: Array.from(productsMap.values()) });
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/stripe/checkout", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { priceId } = req.body;

      console.log("BACKEND CHECKOUT", {
        mode: process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") ? "LIVE" : "TEST",
        priceId,
      });

      if (!priceId) {
        return res.status(400).json({ message: "Price ID is required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const stripe = await getUncachableStripeClient();

      let customerId = user.stripeCustomerId;
      if (!customerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId },
        });
        await storage.updateUserStripeCustomerId(userId, customer.id);
        customerId = customer.id;
      }

      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;
      const createCheckoutSession = async (customer: string) =>
        stripe.checkout.sessions.create({
          customer,
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          mode: 'subscription',
          success_url: `${baseUrl}/subscribe?success=true`,
          cancel_url: `${baseUrl}/subscribe?canceled=true`,
        });

      let session;

      try {
        session = await createCheckoutSession(customerId);
      } catch (error: any) {
        const message = error?.raw?.message || error?.message || "";
        if (message.includes("No such customer")) {
          const customer = await stripe.customers.create({
            email: user.email || undefined,
            metadata: { userId },
          });
          await storage.updateUserStripeCustomerId(userId, customer.id);
          customerId = customer.id;
          session = await createCheckoutSession(customerId);
        } else {
          throw error;
        }
      }

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating checkout session:", error);
      const err = error as any;
      res.status(500).json({
        message: "Failed to create checkout session",
        error: process.env.NODE_ENV !== "production"
          ? err?.message || err?.raw?.message || "Unknown error"
          : undefined,
      });
    }
  });

  app.post("/api/stripe/portal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await storage.getUser(userId);

      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: "No subscription found" });
      }

      const stripe = await getUncachableStripeClient();
      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: `${baseUrl}/subscribe`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating portal session:", error);
      res.status(500).json({ message: "Failed to create portal session" });
    }
  });

  // Beta signup (public route - no auth required)
  app.post("/api/beta-signup", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== "string" || !email.includes("@")) {
        return res.status(400).json({ message: "Valid email is required" });
      }

      const signup = await storage.createBetaSignup({ email: email.toLowerCase(), source: "landing" });
      res.json({ success: true, id: signup.id });
    } catch (error: any) {
      if (error.message?.includes("unique") || error.code === "23505") {
        return res.status(400).json({ message: "You're already signed up!" });
      }
      console.error("Error creating beta signup:", error);
      res.status(500).json({ message: "Failed to sign up" });
    }
  });

  // Donation checkout (public route - no auth required)
  app.post("/api/donate", async (req, res) => {
    try {
      const { amount } = req.body;

      // Accept any amount $1 or more (not just preset amounts)
      if (!amount || typeof amount !== "number" || amount < 1 || amount > 10000) {
        return res.status(400).json({ message: "Please enter an amount between $1 and $10,000" });
      }

      // Round to nearest cent to avoid floating point issues
      const amountInCents = Math.round(amount * 100);

      let stripe;
      try {
        stripe = await getUncachableStripeClient();
      } catch (stripeError: any) {
        console.error("Stripe not configured:", stripeError.message);
        return res.status(503).json({ 
          message: "Donations are temporarily unavailable. Please try again later." 
        });
      }

      const proto = (req.headers["x-forwarded-proto"] as string) || req.protocol;
      const host = req.get("host");
      const baseUrl = process.env.PUBLIC_BASE_URL || `${proto}://${host}`;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Support Mirror Labs',
              description: 'One-time donation to support emotional intelligence tools',
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: `${baseUrl}/?donated=true`,
        cancel_url: `${baseUrl}/`,
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error("Error creating donation session:", error);
      res.status(500).json({ message: "Failed to create donation session" });
    }
  });

  // Gift routes
  app.post("/api/gifts/send", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { toUserEmail, itemId, message, buyAndGift } = req.body;

      if (!toUserEmail || !itemId) {
        return res.status(400).json({ message: "Recipient email and item ID are required" });
      }

      const recipient = await storage.getUserByEmail(toUserEmail);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (recipient.id === userId) {
        return res.status(400).json({ message: "You cannot gift to yourself" });
      }

      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      let ppPaid: number | undefined;

      if (buyAndGift) {
        const progress = await storage.getProgress(userId);
        if (!progress || (progress.totalPp || 0) < item.price) {
          return res.status(400).json({ message: "Not enough Peace Points" });
        }
        await storage.updateProgress(userId, {
          totalPp: (progress.totalPp || 0) - item.price,
        });
        ppPaid = item.price;
      } else {
        const ownedIds = await storage.getUserInventoryIds(userId);
        if (!ownedIds.includes(itemId)) {
          return res.status(400).json({ message: "You don't own this item" });
        }
        await storage.removeFromInventory(userId, itemId);
      }

      const gift = await storage.createGift({
        fromUserId: userId,
        toUserId: recipient.id,
        itemId,
        message: message || null,
        status: "pending",
        ppPaid: ppPaid || null,
      });

      // Check and award gift-related badges
      const newBadges = await checkGiftBadges(userId);

      res.json({ 
        success: true, 
        gift,
        newBadges: newBadges.map(b => ({ name: b.name, icon: b.icon, description: b.description })),
      });
    } catch (error) {
      console.error("Error sending gift:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  app.get("/api/gifts/received", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const gifts = await storage.getReceivedGifts(userId);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching received gifts:", error);
      res.status(500).json({ message: "Failed to fetch received gifts" });
    }
  });

  app.get("/api/gifts/sent", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const gifts = await storage.getSentGifts(userId);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching sent gifts:", error);
      res.status(500).json({ message: "Failed to fetch sent gifts" });
    }
  });

  app.get("/api/gifts/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const gifts = await storage.getPendingGifts(userId);
      res.json(gifts);
    } catch (error) {
      console.error("Error fetching pending gifts:", error);
      res.status(500).json({ message: "Failed to fetch pending gifts" });
    }
  });

  app.post("/api/gifts/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const giftId = req.params.id;

      const gift = await storage.getGift(giftId);
      if (!gift) {
        return res.status(404).json({ message: "Gift not found" });
      }

      if (gift.toUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to accept this gift" });
      }

      if (gift.status !== "pending") {
        return res.status(400).json({ message: "Gift has already been processed" });
      }

      await storage.addToInventory({ userId, itemId: gift.itemId });
      await storage.updateGiftStatus(giftId, "accepted");

      res.json({ success: true });
    } catch (error) {
      console.error("Error accepting gift:", error);
      res.status(500).json({ message: "Failed to accept gift" });
    }
  });

  app.post("/api/gifts/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const giftId = req.params.id;

      const gift = await storage.getGift(giftId);
      if (!gift) {
        return res.status(404).json({ message: "Gift not found" });
      }

      if (gift.toUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to reject this gift" });
      }

      if (gift.status !== "pending") {
        return res.status(400).json({ message: "Gift has already been processed" });
      }

      if (gift.ppPaid) {
        const senderProgress = await storage.getProgress(gift.fromUserId);
        if (senderProgress) {
          await storage.updateProgress(gift.fromUserId, {
            totalPp: (senderProgress.totalPp || 0) + gift.ppPaid,
          });
        }
      } else {
        await storage.addToInventory({ userId: gift.fromUserId, itemId: gift.itemId });
      }

      await storage.updateGiftStatus(giftId, "rejected");

      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting gift:", error);
      res.status(500).json({ message: "Failed to reject gift" });
    }
  });

  // Send gift by user ID (for community feed)
  app.post("/api/gifts/send-to-user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { toUserId, itemId, message, buyAndGift = false } = req.body;

      if (!toUserId || !itemId) {
        return res.status(400).json({ message: "Recipient and item are required" });
      }

      const recipient = await storage.getUser(toUserId);
      if (!recipient) {
        return res.status(404).json({ message: "Recipient not found" });
      }

      if (recipient.id === userId) {
        return res.status(400).json({ message: "You cannot gift to yourself" });
      }

      const item = await storage.getShopItem(itemId);
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }

      let ppPaid: number | undefined;

      if (buyAndGift === true) {
        const progress = await storage.getProgress(userId);
        if (!progress || (progress.totalPp || 0) < item.price) {
          return res.status(400).json({ message: "Not enough Peace Points" });
        }
        await storage.updateProgress(userId, {
          totalPp: (progress.totalPp || 0) - item.price,
        });
        ppPaid = item.price;
      } else {
        const ownedIds = await storage.getUserInventoryIds(userId);
        if (!ownedIds.includes(itemId)) {
          return res.status(400).json({ message: "You don't own this item" });
        }
        await storage.removeFromInventory(userId, itemId);
      }

      const gift = await storage.createGift({
        fromUserId: userId,
        toUserId,
        itemId,
        message: message || null,
        ppPaid,
      });

      res.json({ success: true, gift });
    } catch (error) {
      console.error("Error sending gift by user ID:", error);
      res.status(500).json({ message: "Failed to send gift" });
    }
  });

  // ========== FRIENDS ROUTES ==========

  // Send friend request by email
  app.post("/api/friends/request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const friend = await storage.getUserByEmail(email);
      if (!friend) {
        return res.status(404).json({ message: "User not found with that email" });
      }

      if (friend.id === userId) {
        return res.status(400).json({ message: "Cannot send friend request to yourself" });
      }

      const existingFriendship = await storage.getFriendship(userId, friend.id);
      if (existingFriendship) {
        return res.status(400).json({ message: "Friendship already exists or is pending" });
      }

      const friendship = await storage.createFriendship({
        userId,
        friendId: friend.id,
        status: "pending",
      });

      res.json(friendship);
    } catch (error) {
      console.error("Error sending friend request:", error);
      res.status(500).json({ message: "Failed to send friend request" });
    }
  });

  // Get friends list
  app.get("/api/friends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  // Get pending friend requests
  app.get("/api/friends/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pending = await storage.getPendingFriendRequests(userId);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  // Accept friend request
  app.post("/api/friends/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const friendshipId = req.params.id;

      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      if (friendship.friendId !== userId) {
        return res.status(403).json({ message: "Not authorized to accept this request" });
      }

      if (friendship.status !== "pending") {
        return res.status(400).json({ message: "Friend request already processed" });
      }

      const updated = await storage.updateFriendshipStatus(friendshipId, "accepted");
      res.json(updated);
    } catch (error) {
      console.error("Error accepting friend request:", error);
      res.status(500).json({ message: "Failed to accept friend request" });
    }
  });

  // Reject friend request
  app.post("/api/friends/:id/reject", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const friendshipId = req.params.id;

      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friend request not found" });
      }

      if (friendship.friendId !== userId) {
        return res.status(403).json({ message: "Not authorized to reject this request" });
      }

      await storage.deleteFriendship(friendshipId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      res.status(500).json({ message: "Failed to reject friend request" });
    }
  });

  // Remove friend
  app.delete("/api/friends/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const friendshipId = req.params.id;

      const friendship = await storage.getFriendshipById(friendshipId);
      if (!friendship) {
        return res.status(404).json({ message: "Friendship not found" });
      }

      if (friendship.userId !== userId && friendship.friendId !== userId) {
        return res.status(403).json({ message: "Not authorized to remove this friend" });
      }

      await storage.deleteFriendship(friendshipId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error removing friend:", error);
      res.status(500).json({ message: "Failed to remove friend" });
    }
  });

  // ========== CIRCLES ROUTES ==========

  // Create circle
  app.post("/api/circles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, isPublic } = req.body;

      if (!name) {
        return res.status(400).json({ message: "Circle name is required" });
      }

      const circle = await storage.createCircle({
        name,
        description: description || "",
        ownerId: userId,
        isPublic: isPublic || false,
      });

      await storage.addCircleMember({
        circleId: circle.id,
        userId,
        role: "owner",
      });

      res.json(circle);
    } catch (error) {
      console.error("Error creating circle:", error);
      res.status(500).json({ message: "Failed to create circle" });
    }
  });

  // Get user's circles
  app.get("/api/circles", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const circles = await storage.getUserCircles(userId);
      res.json(circles);
    } catch (error) {
      console.error("Error fetching circles:", error);
      res.status(500).json({ message: "Failed to fetch circles" });
    }
  });

  // Get public circles
  app.get("/api/circles/public", isAuthenticated, async (req: any, res) => {
    try {
      const circles = await storage.getPublicCircles();
      res.json(circles);
    } catch (error) {
      console.error("Error fetching public circles:", error);
      res.status(500).json({ message: "Failed to fetch public circles" });
    }
  });

  // Invite user to circle
  app.post("/api/circles/:id/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const circleId = req.params.id;
      const { email } = req.body;

      const circle = await storage.getCircle(circleId);
      if (!circle) {
        return res.status(404).json({ message: "Circle not found" });
      }

      const member = await storage.getCircleMember(circleId, userId);
      if (!member || (member.role !== "owner" && member.role !== "admin")) {
        return res.status(403).json({ message: "Not authorized to invite to this circle" });
      }

      const invitee = await storage.getUserByEmail(email);
      if (!invitee) {
        return res.status(404).json({ message: "User not found" });
      }

      const existingMember = await storage.getCircleMember(circleId, invitee.id);
      if (existingMember) {
        return res.status(400).json({ message: "User is already a member" });
      }

      const newMember = await storage.addCircleMember({
        circleId,
        userId: invitee.id,
        role: "member",
      });

      res.json(newMember);
    } catch (error) {
      console.error("Error inviting to circle:", error);
      res.status(500).json({ message: "Failed to invite to circle" });
    }
  });

  // Join public circle
  app.post("/api/circles/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const circleId = req.params.id;

      const circle = await storage.getCircle(circleId);
      if (!circle) {
        return res.status(404).json({ message: "Circle not found" });
      }

      if (!circle.isPublic) {
        return res.status(403).json({ message: "This circle is private" });
      }

      const existingMember = await storage.getCircleMember(circleId, userId);
      if (existingMember) {
        return res.status(400).json({ message: "Already a member of this circle" });
      }

      const member = await storage.addCircleMember({
        circleId,
        userId,
        role: "member",
      });

      res.json(member);
    } catch (error) {
      console.error("Error joining circle:", error);
      res.status(500).json({ message: "Failed to join circle" });
    }
  });

  // Leave circle
  app.delete("/api/circles/:id/leave", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const circleId = req.params.id;

      const member = await storage.getCircleMember(circleId, userId);
      if (!member) {
        return res.status(404).json({ message: "Not a member of this circle" });
      }

      if (member.role === "owner") {
        return res.status(400).json({ message: "Owners cannot leave. Delete the circle instead." });
      }

      await storage.removeCircleMember(circleId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error leaving circle:", error);
      res.status(500).json({ message: "Failed to leave circle" });
    }
  });

  // Get circle members
  app.get("/api/circles/:id/members", isAuthenticated, async (req: any, res) => {
    try {
      const circleId = req.params.id;
      const members = await storage.getCircleMembers(circleId);
      res.json(members);
    } catch (error) {
      console.error("Error fetching circle members:", error);
      res.status(500).json({ message: "Failed to fetch circle members" });
    }
  });

  // ========== CIRCLE CHALLENGES ROUTES ==========

  // Get challenges for a specific circle
  app.get("/api/circles/:circleId/challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { circleId } = req.params;
      
      // Verify user is a member of this circle
      const member = await storage.getCircleMember(circleId, userId);
      if (!member) {
        return res.status(403).json({ message: "You must be a member of this circle to view challenges" });
      }
      
      const challenges = await storage.getCircleChallenges(circleId);
      res.json(challenges);
    } catch (error) {
      console.error("Error fetching circle challenges:", error);
      res.status(500).json({ message: "Failed to fetch circle challenges" });
    }
  });

  // Create a challenge for a circle
  app.post("/api/circles/:circleId/challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { circleId } = req.params;

      const member = await storage.getCircleMember(circleId, userId);
      if (!member) {
        return res.status(403).json({ message: "You must be a member of this circle to create a challenge" });
      }

      const challengeData = {
        circleId,
        title: req.body.title,
        description: req.body.description || null,
        goal: req.body.goal,
        goalType: req.body.goalType,
        rewardXp: req.body.rewardXp || 0,
        rewardPp: req.body.rewardPp || 0,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
      };

      const challenge = await storage.createCircleChallenge(challengeData);
      res.json(challenge);
    } catch (error) {
      console.error("Error creating circle challenge:", error);
      res.status(500).json({ message: "Failed to create circle challenge" });
    }
  });

  // Get all active challenges for user's circles
  app.get("/api/circle-challenges/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const challenges = await storage.getActiveCircleChallengesForUser(userId);
      
      const challengesWithProgress = await Promise.all(
        challenges.map(async ({ challenge, circle }) => {
          const progress = await storage.getCircleChallengeProgress(challenge.id, userId);
          return {
            challenge,
            circle,
            userProgress: progress || null,
            isJoined: !!progress,
          };
        })
      );

      res.json(challengesWithProgress);
    } catch (error) {
      console.error("Error fetching active circle challenges:", error);
      res.status(500).json({ message: "Failed to fetch active circle challenges" });
    }
  });

  // Join a circle challenge
  app.post("/api/circle-challenges/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const challenge = await storage.getCircleChallenge(id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      const member = await storage.getCircleMember(challenge.circleId, userId);
      if (!member) {
        return res.status(403).json({ message: "You must be a member of this circle to join the challenge" });
      }

      const existingProgress = await storage.getCircleChallengeProgress(id, userId);
      if (existingProgress) {
        return res.status(400).json({ message: "Already joined this challenge" });
      }

      const progress = await storage.joinCircleChallenge({
        challengeId: id,
        userId,
        progress: 0,
        completed: false,
      });

      res.json(progress);
    } catch (error) {
      console.error("Error joining circle challenge:", error);
      res.status(500).json({ message: "Failed to join circle challenge" });
    }
  });

  // Get circle challenge leaderboard
  app.get("/api/circle-challenges/:id/leaderboard", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const leaderboard = await storage.getCircleChallengeLeaderboard(id);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching circle challenge leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Update challenge progress (internal use, typically called when user completes practices)
  app.patch("/api/circle-challenges/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { progress } = req.body;

      const updated = await storage.updateCircleChallengeProgress(id, userId, progress);
      if (!updated) {
        return res.status(404).json({ message: "Challenge participation not found" });
      }

      res.json(updated);
    } catch (error) {
      console.error("Error updating challenge progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // ========== LEADERBOARD ROUTES ==========

  // Global leaderboard
  app.get("/api/leaderboard", isAuthenticated, async (req: any, res) => {
    try {
      const leaderboard = await storage.getGlobalLeaderboard(50);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching global leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Friends leaderboard
  app.get("/api/leaderboard/friends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const leaderboard = await storage.getFriendsLeaderboard(userId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching friends leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch friends leaderboard" });
    }
  });

  // Circle leaderboard
  app.get("/api/leaderboard/circle/:id", isAuthenticated, async (req: any, res) => {
    try {
      const circleId = req.params.id;
      const leaderboard = await storage.getCircleLeaderboard(circleId);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching circle leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch circle leaderboard" });
    }
  });

  // ========== CHALLENGES ROUTES ==========

  // Get active challenges
  app.get("/api/challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const activeChallenges = await storage.getActiveChallenges();
      
      const challengesWithParticipation = await Promise.all(
        activeChallenges.map(async (challenge) => {
          const participation = await storage.getChallengeParticipation(challenge.id, userId);
          return {
            ...challenge,
            isJoined: !!participation,
            progress: participation?.progress || 0,
            completed: participation?.completed || false,
          };
        })
      );

      res.json(challengesWithParticipation);
    } catch (error) {
      console.error("Error fetching challenges:", error);
      res.status(500).json({ message: "Failed to fetch challenges" });
    }
  });

  // Join a challenge
  app.post("/api/challenges/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const challengeId = req.params.id;

      const challenge = await storage.getChallenge(challengeId);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }

      const existing = await storage.getChallengeParticipation(challengeId, userId);
      if (existing) {
        return res.status(400).json({ message: "Already joined this challenge" });
      }

      const participant = await storage.joinChallenge({
        challengeId,
        userId,
        progress: 0,
        completed: false,
      });

      res.json(participant);
    } catch (error) {
      console.error("Error joining challenge:", error);
      res.status(500).json({ message: "Failed to join challenge" });
    }
  });

  // Get user's challenge progress
  app.get("/api/challenges/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getUserChallengeProgress(userId);
      res.json(progress);
    } catch (error) {
      console.error("Error fetching challenge progress:", error);
      res.status(500).json({ message: "Failed to fetch challenge progress" });
    }
  });

  // ========== BUILT-IN SCENARIOS ROUTES ==========

  // Get all built-in scenarios with lock status based on user level
  app.get("/api/scenarios", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getProgress(userId);
      const userLevel = progress?.level || 1;

      const scenariosWithLockStatus = builtInScenarios.map(scenario => ({
        ...scenario,
        isLocked: userLevel < scenario.requiredLevel,
        requiredLevel: scenario.requiredLevel,
      }));

      res.json(scenariosWithLockStatus);
    } catch (error) {
      console.error("Error fetching scenarios:", error);
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  // Check for newly unlocked scenarios when user levels up
  app.get("/api/scenarios/unlocked", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const progress = await storage.getProgress(userId);
      const userLevel = progress?.level || 1;
      const previousLevel = parseInt(req.query.previousLevel as string) || userLevel - 1;

      const newlyUnlocked = builtInScenarios.filter(
        scenario => scenario.requiredLevel > previousLevel && scenario.requiredLevel <= userLevel
      );

      res.json(newlyUnlocked);
    } catch (error) {
      console.error("Error checking unlocked scenarios:", error);
      res.status(500).json({ message: "Failed to check unlocked scenarios" });
    }
  });

  // ========== CUSTOM SCENARIOS ROUTES ==========

  // Create custom scenario
  app.post("/api/scenarios/custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { title, description, category, difficulty, context, prompt, sampleResponse, tips, isPublic } = req.body;

      if (!title || !description || !category || !context || !prompt) {
        return res.status(400).json({ message: "Title, description, category, context, and prompt are required" });
      }

      const scenario = await storage.createCustomScenario({
        creatorId: userId,
        title,
        description,
        category,
        difficulty: difficulty || "beginner",
        context,
        prompt,
        sampleResponse: sampleResponse || null,
        tips: tips || null,
        isPublic: isPublic || false,
        usageCount: 0,
        rating: null,
        ratingCount: 0,
      });

      res.json(scenario);
    } catch (error) {
      console.error("Error creating custom scenario:", error);
      res.status(500).json({ message: "Failed to create custom scenario" });
    }
  });

  // Get user's own custom scenarios
  app.get("/api/scenarios/custom", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scenarios = await storage.getUserCustomScenarios(userId);
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching user scenarios:", error);
      res.status(500).json({ message: "Failed to fetch scenarios" });
    }
  });

  // Get single custom scenario
  app.get("/api/scenarios/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const scenarioId = req.params.id;
      const scenario = await storage.getCustomScenario(scenarioId);
      
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      res.json(scenario);
    } catch (error) {
      console.error("Error fetching scenario:", error);
      res.status(500).json({ message: "Failed to fetch scenario" });
    }
  });

  // Update custom scenario
  app.put("/api/scenarios/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scenarioId = req.params.id;
      const { title, description, category, difficulty, context, prompt, sampleResponse, tips, isPublic } = req.body;

      const existingScenario = await storage.getCustomScenario(scenarioId);
      if (!existingScenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      if (existingScenario.creatorId !== userId) {
        return res.status(403).json({ message: "You can only edit your own scenarios" });
      }

      const updated = await storage.updateCustomScenario(scenarioId, {
        title,
        description,
        category,
        difficulty,
        context,
        prompt,
        sampleResponse,
        tips,
        isPublic,
      });

      res.json(updated);
    } catch (error) {
      console.error("Error updating scenario:", error);
      res.status(500).json({ message: "Failed to update scenario" });
    }
  });

  // Delete custom scenario
  app.delete("/api/scenarios/custom/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scenarioId = req.params.id;

      const existingScenario = await storage.getCustomScenario(scenarioId);
      if (!existingScenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      if (existingScenario.creatorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own scenarios" });
      }

      await storage.deleteCustomScenario(scenarioId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting scenario:", error);
      res.status(500).json({ message: "Failed to delete scenario" });
    }
  });

  // Get public community scenarios
  app.get("/api/scenarios/community", isAuthenticated, async (req: any, res) => {
    try {
      const { category, limit } = req.query;
      const scenarios = await storage.getPublicScenarios(
        category as string | undefined,
        limit ? parseInt(limit as string) : 50
      );
      res.json(scenarios);
    } catch (error) {
      console.error("Error fetching community scenarios:", error);
      res.status(500).json({ message: "Failed to fetch community scenarios" });
    }
  });

  // Rate a scenario
  app.post("/api/scenarios/custom/:id/rate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scenarioId = req.params.id;
      const { rating } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5" });
      }

      const scenario = await storage.getCustomScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      const result = await storage.rateScenario(userId, scenarioId, rating);
      const updatedScenario = await storage.getCustomScenario(scenarioId);
      
      res.json({ 
        rating: result, 
        averageRating: updatedScenario?.rating,
        ratingCount: updatedScenario?.ratingCount 
      });
    } catch (error) {
      console.error("Error rating scenario:", error);
      res.status(500).json({ message: "Failed to rate scenario" });
    }
  });

  // Get user's rating for a scenario
  app.get("/api/scenarios/custom/:id/rating", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const scenarioId = req.params.id;

      const rating = await storage.getScenarioRating(userId, scenarioId);
      res.json(rating || null);
    } catch (error) {
      console.error("Error fetching rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Increment usage count (for practice)
  app.post("/api/scenarios/custom/:id/use", isAuthenticated, async (req: any, res) => {
    try {
      const scenarioId = req.params.id;

      const scenario = await storage.getCustomScenario(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Scenario not found" });
      }

      await storage.incrementScenarioUsage(scenarioId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error incrementing usage:", error);
      res.status(500).json({ message: "Failed to record usage" });
    }
  });

  // ==================== Community Feed Routes ====================
  
  // Get community feed
  app.get("/api/community/feed", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { limit, offset } = req.query;
      const feedLimit = limit ? parseInt(limit as string) : 20;
      const feedOffset = offset ? parseInt(offset as string) : 0;
      
      const feed = await storage.getCommunityFeed(feedLimit, feedOffset);
      
      // Add user's reaction to each post
      const feedWithUserReactions = await Promise.all(
        feed.map(async (item) => {
          const userReaction = await storage.getUserReaction(item.post.id, userId);
          return {
            ...item,
            userReaction: userReaction?.type,
          };
        })
      );
      
      res.json(feedWithUserReactions);
    } catch (error) {
      console.error("Error fetching community feed:", error);
      res.status(500).json({ message: "Failed to fetch community feed" });
    }
  });

  // Create a new post
  app.post("/api/community/posts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { type, content, metadata } = req.body;
      
      if (!type || !content) {
        return res.status(400).json({ message: "Type and content are required" });
      }
      
      const validTypes = ["achievement", "milestone", "tip", "encouragement", "practice_share"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid post type" });
      }
      
      const post = await storage.createCommunityPost({
        userId,
        type,
        content,
        metadata: metadata || null,
      });
      
      const user = await storage.getUser(userId);
      
      res.json({
        post,
        user,
        reactionCounts: {},
        commentCount: 0,
      });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ message: "Failed to create post" });
    }
  });

  // Add reaction to post
  app.post("/api/community/posts/:postId/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const { type } = req.body;
      
      if (!type) {
        return res.status(400).json({ message: "Reaction type is required" });
      }
      
      const validTypes = ["heart", "celebrate", "support", "inspire"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid reaction type" });
      }
      
      await storage.addPostReaction({
        postId,
        userId,
        type,
      });
      
      const reactionCounts = await storage.getPostReactionCounts(postId);
      res.json({ reactionCounts, userReaction: type });
    } catch (error) {
      console.error("Error adding reaction:", error);
      res.status(500).json({ message: "Failed to add reaction" });
    }
  });

  // Remove reaction from post
  app.delete("/api/community/posts/:postId/reactions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      
      await storage.removePostReaction(postId, userId);
      const reactionCounts = await storage.getPostReactionCounts(postId);
      
      res.json({ reactionCounts, userReaction: null });
    } catch (error) {
      console.error("Error removing reaction:", error);
      res.status(500).json({ message: "Failed to remove reaction" });
    }
  });

  // Get comments for a post
  app.get("/api/community/posts/:postId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const { postId } = req.params;
      const comments = await storage.getPostComments(postId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Add comment to post
  app.post("/api/community/posts/:postId/comments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { postId } = req.params;
      const { content } = req.body;
      
      if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: "Comment content is required" });
      }
      
      const comment = await storage.createPostComment({
        postId,
        userId,
        content: content.trim(),
      });
      
      const user = await storage.getUser(userId);
      res.json({ comment, user });
    } catch (error) {
      console.error("Error adding comment:", error);
      res.status(500).json({ message: "Failed to add comment" });
    }
  });

  // Delete own comment
  app.delete("/api/community/posts/:postId/comments/:commentId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { commentId } = req.params;
      
      await storage.deletePostComment(commentId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ message: "Failed to delete comment" });
    }
  });

  // Daily Wheel Routes
  
  // Seed wheel rewards if not present
  async function seedWheelRewards() {
    const count = await storage.getWheelRewardsCount();
    if (count === 0) {
      const rewards = [
        { name: "10 XP", description: "A small boost to your journey", type: "xp", value: 10, weight: 200, rarity: "common", icon: "Sparkles" },
        { name: "25 XP", description: "Nice progress!", type: "xp", value: 25, weight: 150, rarity: "common", icon: "Sparkles" },
        { name: "50 XP", description: "Significant boost!", type: "xp", value: 50, weight: 80, rarity: "rare", icon: "Star" },
        { name: "5 Peace Points", description: "A little peace for your day", type: "peace_points", value: 5, weight: 180, rarity: "common", icon: "Heart" },
        { name: "15 Peace Points", description: "Feeling peaceful!", type: "peace_points", value: 15, weight: 100, rarity: "rare", icon: "Heart" },
        { name: "30 Peace Points", description: "Major peace boost!", type: "peace_points", value: 30, weight: 40, rarity: "epic", icon: "Gem" },
        { name: "100 XP Jackpot", description: "Amazing luck!", type: "xp", value: 100, weight: 20, rarity: "legendary", icon: "Trophy" },
        { name: "Bonus Spin", description: "Spin again tomorrow twice!", type: "bonus_spin", value: 1, weight: 30, rarity: "epic", icon: "RotateCcw" },
      ];
      
      for (const reward of rewards) {
        await storage.createWheelReward(reward);
      }
      console.log("Seeded wheel rewards successfully");
    }
  }
  
  // Seed rewards on startup
  seedWheelRewards().catch(console.error);

  // Get today's wheel status and rewards
  app.get("/api/wheel/today", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const rewards = await storage.getActiveWheelRewards();
      const todaySpin = await storage.getUserTodaySpin(userId);
      
      res.json({
        rewards,
        hasSpunToday: !!todaySpin,
        lastSpin: todaySpin || null,
      });
    } catch (error) {
      console.error("Error fetching wheel status:", error);
      res.status(500).json({ message: "Failed to fetch wheel status" });
    }
  });

  // Execute spin
  app.post("/api/wheel/spin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      // Check if already spun today
      const todaySpin = await storage.getUserTodaySpin(userId);
      if (todaySpin) {
        return res.status(400).json({ 
          message: "Already spun today", 
          hasSpunToday: true,
          lastSpin: todaySpin,
        });
      }
      
      // Get rewards and select one using weighted randomization
      const rewards = await storage.getActiveWheelRewards();
      if (rewards.length === 0) {
        return res.status(500).json({ message: "No rewards available" });
      }
      
      // Weighted random selection
      const totalWeight = rewards.reduce((sum, r) => sum + (r.weight || 100), 0);
      let random = Math.random() * totalWeight;
      let selectedReward = rewards[0];
      
      for (const reward of rewards) {
        random -= (reward.weight || 100);
        if (random <= 0) {
          selectedReward = reward;
          break;
        }
      }
      
      // Record the spin
      const spin = await storage.createDailyWheelSpin({
        userId,
        rewardId: selectedReward.id,
        rewardType: selectedReward.type,
        rewardValue: selectedReward.value,
        spinDate: new Date(),
      });
      
      // Award the reward with streak multiplier for XP
      const progress = await storage.getProgress(userId);
      let multiplier = 1;
      let actualXpAwarded = selectedReward.value;
      
      if (progress) {
        const updates: any = { updatedAt: new Date() };
        
        if (selectedReward.type === "xp") {
          // Apply streak multiplier to XP rewards
          multiplier = getStreakMultiplier(progress.currentStreak || 0);
          actualXpAwarded = Math.floor(selectedReward.value * multiplier);
          updates.totalXp = (progress.totalXp || 0) + actualXpAwarded;
          const newLevel = Math.floor(updates.totalXp / 100) + 1;
          if (newLevel > (progress.level || 1)) {
            updates.level = newLevel;
          }
        } else if (selectedReward.type === "peace_points") {
          updates.totalPp = (progress.totalPp || 0) + selectedReward.value;
        }
        
        await storage.updateProgress(userId, updates);
      }
      
      res.json({
        spin,
        reward: selectedReward,
        rewardIndex: rewards.findIndex(r => r.id === selectedReward.id),
        streakMultiplier: selectedReward.type === "xp" ? multiplier : 1,
        actualXpAwarded: selectedReward.type === "xp" ? actualXpAwarded : undefined,
      });
    } catch (error) {
      console.error("Error spinning wheel:", error);
      res.status(500).json({ message: "Failed to spin wheel" });
    }
  });

  // Daily Login Rewards Routes
  
  // Seed login rewards if not present
  async function seedLoginRewards() {
    const rewards = await storage.getDailyLoginRewards();
    if (rewards.length === 0) {
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
      console.log("Seeded login rewards successfully");
    }
  }
  
  seedLoginRewards().catch(console.error);

  // Get user's login rewards status
  app.get("/api/login-rewards", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const rewards = await storage.getDailyLoginRewards();
      const latestClaim = await storage.getLatestUserLoginReward(userId);
      
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
        
        const daysSinceLastClaim = Math.floor((today.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        
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
          const cycleClaims = await storage.getUserLoginRewardsForCycle(userId, cycleStart);
          claimedDays = cycleClaims.map(c => c.claimedDay);
        }
      }
      
      res.json({
        rewards,
        currentDay,
        claimedDays,
        canClaimToday,
        cycleStartDate: cycleStartDate.toISOString(),
        streakCount: claimedDays.length,
      });
    } catch (error) {
      console.error("Error fetching login rewards:", error);
      res.status(500).json({ message: "Failed to fetch login rewards" });
    }
  });

  // Claim today's login reward
  app.post("/api/login-rewards/claim", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const rewards = await storage.getDailyLoginRewards();
      const latestClaim = await storage.getLatestUserLoginReward(userId);
      
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
        
        const daysSinceLastClaim = Math.floor((today.getTime() - lastClaimDate.getTime()) / (1000 * 60 * 60 * 24));
        
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
      
      const reward = rewards.find(r => r.day === currentDay);
      if (!reward) {
        return res.status(500).json({ message: "Reward not found for day" });
      }
      
      const claim = await storage.claimLoginReward({
        userId,
        claimedDay: currentDay,
        cycleStartDate,
      });
      
      const progress = await storage.getProgress(userId);
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
        
        await storage.updateProgress(userId, updates);
      }
      
      if (currentDay === 7) {
        await checkAndAwardBadges({ userId, eventType: "streak_update" });
      }
      
      const cycleClaims = await storage.getUserLoginRewardsForCycle(userId, cycleStartDate);
      const claimedDays = cycleClaims.map(c => c.claimedDay);
      
      res.json({
        success: true,
        claim,
        reward,
        currentDay,
        claimedDays,
        canClaimToday: false,
        cycleStartDate: cycleStartDate.toISOString(),
        streakCount: claimedDays.length,
      });
    } catch (error) {
      console.error("Error claiming login reward:", error);
      res.status(500).json({ message: "Failed to claim login reward" });
    }
  });

  // Weekly Challenges Routes
  app.get("/api/weekly-challenges", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const challenges = await storage.getActiveWeeklyChallenges();
      
      const challengesWithProgress = await Promise.all(
        challenges.map(async (challenge) => {
          let userProgress = await storage.getUserWeeklyChallengeProgress(userId, challenge.id);
          
          if (!userProgress) {
            userProgress = await storage.createUserWeeklyChallengeProgress({
              userId,
              challengeId: challenge.id,
              progress: 0,
              completed: false,
              rewardClaimed: false,
            });
          }
          
          return {
            ...challenge,
            userProgress: userProgress.progress || 0,
            completed: userProgress.completed || false,
            completedAt: userProgress.completedAt,
            rewardClaimed: userProgress.rewardClaimed || false,
          };
        })
      );
      
      const weekEndDate = challenges[0]?.weekEndDate || new Date();
      const daysRemaining = Math.max(0, Math.ceil((new Date(weekEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      
      res.json({
        challenges: challengesWithProgress,
        daysRemaining,
        weekEndDate,
      });
    } catch (error) {
      console.error("Error fetching weekly challenges:", error);
      res.status(500).json({ message: "Failed to fetch weekly challenges" });
    }
  });

  app.get("/api/weekly-challenges/uncompleted-count", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const count = await storage.countUncompletedWeeklyChallenges(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error counting uncompleted challenges:", error);
      res.status(500).json({ message: "Failed to count challenges" });
    }
  });

  app.post("/api/weekly-challenges/:id/claim", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const challenge = await storage.getWeeklyChallenge(id);
      if (!challenge) {
        return res.status(404).json({ message: "Challenge not found" });
      }
      
      const userProgress = await storage.getUserWeeklyChallengeProgress(userId, id);
      if (!userProgress) {
        return res.status(404).json({ message: "Progress not found" });
      }
      
      if (!userProgress.completed) {
        return res.status(400).json({ message: "Challenge not completed yet" });
      }
      
      if (userProgress.rewardClaimed) {
        return res.status(400).json({ message: "Reward already claimed" });
      }
      
      await storage.updateUserWeeklyChallengeProgress(userProgress.id, {
        rewardClaimed: true,
      });
      
      const progress = await storage.getProgress(userId);
      if (progress) {
        const multiplier = getStreakMultiplier(progress.currentStreak || 0);
        const actualXp = Math.floor((challenge.xpReward || 0) * multiplier);
        const updates: any = {
          totalXp: (progress.totalXp || 0) + actualXp,
          totalPp: (progress.totalPp || 0) + (challenge.ppReward || 0),
        };
        const newLevel = Math.floor(updates.totalXp / 100) + 1;
        if (newLevel > (progress.level || 1)) {
          updates.level = newLevel;
        }
        await storage.updateProgress(userId, updates);
      }
      
      res.json({ 
        success: true, 
        xpEarned: challenge.xpReward || 0,
        ppEarned: challenge.ppReward || 0,
      });
    } catch (error) {
      console.error("Error claiming challenge reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  app.post("/api/weekly-challenges/seed", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getActiveWeeklyChallenges();
      if (existing.length > 0) {
        return res.json({ message: "Challenges already exist for this week", challenges: existing });
      }
      
      const now = new Date();
      const dayOfWeek = now.getDay();
      const monday = new Date(now);
      monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      monday.setHours(0, 0, 0, 0);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      
      const challengeTemplates = [
        {
          title: "Complete 5 practice sessions",
          description: "Practice makes perfect! Complete 5 sessions this week.",
          category: "general",
          goalType: "practice_count",
          goalValue: 5,
          xpReward: 100,
          ppReward: 25,
        },
        {
          title: "Score 80+ on 3 sessions",
          description: "Aim high! Achieve a score of 80 or higher on 3 sessions.",
          category: "general",
          goalType: "score_threshold",
          goalValue: 3,
          goalThreshold: 80,
          xpReward: 150,
          ppReward: 40,
        },
        {
          title: "Maintain a 3-day streak",
          description: "Consistency is key! Practice for 3 days in a row.",
          category: "general",
          goalType: "streak",
          goalValue: 3,
          xpReward: 75,
          ppReward: 20,
        },
        {
          title: "Try voice practice",
          description: "Step outside your comfort zone! Try voice mode once.",
          category: "voice",
          goalType: "voice_practice",
          goalValue: 1,
          xpReward: 50,
          ppReward: 15,
        },
      ];
      
      const created = await Promise.all(
        challengeTemplates.map(template =>
          storage.createWeeklyChallenge({
            ...template,
            weekStartDate: monday,
            weekEndDate: sunday,
            isActive: true,
          })
        )
      );
      
      res.json({ success: true, challenges: created });
    } catch (error) {
      console.error("Error seeding weekly challenges:", error);
      res.status(500).json({ message: "Failed to seed challenges" });
    }
  });

  // Story Mode routes
  app.get("/api/story", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const chapters = await storage.getStoryChapters();
      const userProgress = await storage.getUserStoryProgress(userId);
      const userProgressData = await storage.getProgress(userId);
      const userLevel = userProgressData?.level || 1;
      
      const progressMap = new Map(userProgress.map(p => [p.chapterId, p]));
      
      const chaptersWithProgress = chapters.map((chapter, index) => {
        const progress = progressMap.get(chapter.id);
        const previousChapter = index > 0 ? chapters[index - 1] : null;
        const previousProgress = previousChapter ? progressMap.get(previousChapter.id) : null;
        
        const meetsLevelRequirement = userLevel >= (chapter.unlockLevel || 1);
        const previousComplete = !previousChapter || (previousProgress?.isComplete ?? false);
        const isUnlocked = meetsLevelRequirement && previousComplete;
        
        return {
          ...chapter,
          progress: progress ? {
            scenariosCompleted: progress.scenariosCompleted || [],
            isComplete: progress.isComplete || false,
          } : null,
          isUnlocked,
          completedCount: (progress?.scenariosCompleted || []).length,
          totalScenarios: (chapter.scenarioIds || []).length,
        };
      });
      
      res.json(chaptersWithProgress);
    } catch (error) {
      console.error("Error fetching story chapters:", error);
      res.status(500).json({ message: "Failed to fetch story chapters" });
    }
  });

  app.get("/api/story/:chapterId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { chapterId } = req.params;
      
      const chapter = await storage.getStoryChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      const progress = await storage.getUserStoryProgressForChapter(userId, chapterId);
      const scenarioDetails = (chapter.scenarioIds || []).map((scenarioId: string) => {
        const scenario = getScenarioById(scenarioId);
        return {
          id: scenarioId,
          title: scenario?.title || "Unknown Scenario",
          description: scenario?.description || "",
          category: scenario?.category || chapter.theme,
          isCompleted: (progress?.scenariosCompleted || []).includes(scenarioId),
        };
      });
      
      res.json({
        ...chapter,
        scenarios: scenarioDetails,
        progress: progress ? {
          scenariosCompleted: progress.scenariosCompleted || [],
          isComplete: progress.isComplete || false,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching chapter details:", error);
      res.status(500).json({ message: "Failed to fetch chapter details" });
    }
  });

  app.post("/api/story/:chapterId/complete-scenario", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { chapterId } = req.params;
      const { scenarioId } = req.body;
      
      if (!scenarioId) {
        return res.status(400).json({ message: "Scenario ID is required" });
      }
      
      const chapter = await storage.getStoryChapter(chapterId);
      if (!chapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      if (!(chapter.scenarioIds || []).includes(scenarioId)) {
        return res.status(400).json({ message: "Scenario not in this chapter" });
      }
      
      let progress = await storage.getUserStoryProgressForChapter(userId, chapterId);
      
      if (!progress) {
        progress = await storage.createUserStoryProgress({
          userId,
          chapterId,
          scenariosCompleted: [scenarioId],
          isComplete: false,
        });
      } else {
        const completedScenarios = progress.scenariosCompleted || [];
        if (!completedScenarios.includes(scenarioId)) {
          completedScenarios.push(scenarioId);
          progress = await storage.updateUserStoryProgress(progress.id, {
            scenariosCompleted: completedScenarios,
          }) || progress;
        }
      }
      
      const allComplete = (chapter.scenarioIds || []).every(
        (id: string) => (progress!.scenariosCompleted || []).includes(id)
      );
      
      let chapterJustCompleted = false;
      if (allComplete && !progress.isComplete) {
        chapterJustCompleted = true;
        await storage.updateUserStoryProgress(progress.id, {
          isComplete: true,
          completedAt: new Date(),
        });
        
        const userProgressData = await storage.getProgress(userId);
        if (userProgressData) {
          const multiplier = getStreakMultiplier(userProgressData.currentStreak || 0);
          const actualXp = Math.floor((chapter.xpReward || 100) * multiplier);
          const updates: any = {
            totalXp: (userProgressData.totalXp || 0) + actualXp,
            totalPp: (userProgressData.totalPp || 0) + (chapter.ppReward || 50),
          };
          const newLevel = Math.floor(updates.totalXp / 100) + 1;
          if (newLevel > (userProgressData.level || 1)) {
            updates.level = newLevel;
          }
          await storage.updateProgress(userId, updates);
        }
      }
      
      res.json({
        success: true,
        chapterComplete: allComplete,
        chapterJustCompleted,
        xpEarned: chapterJustCompleted ? (chapter.xpReward || 100) : 0,
        ppEarned: chapterJustCompleted ? (chapter.ppReward || 50) : 0,
      });
    } catch (error) {
      console.error("Error completing scenario:", error);
      res.status(500).json({ message: "Failed to complete scenario" });
    }
  });

  app.post("/api/story/seed", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getStoryChapters();
      if (existing.length > 0) {
        return res.json({ message: "Story chapters already exist", chapters: existing });
      }
      
      const chapterTemplates = [
        {
          chapterNumber: 1,
          title: "Finding Your Voice",
          description: "Learn the fundamentals of assertive communication. Express your needs clearly while respecting others.",
          theme: "assertiveness",
          scenarioIds: ["workplace_feedback", "personal_boundaries"],
          xpReward: 100,
          ppReward: 50,
          unlockLevel: 1,
        },
        {
          chapterNumber: 2,
          title: "Walking in Their Shoes",
          description: "Develop your empathy skills. Understand others' perspectives and respond with compassion.",
          theme: "empathy",
          scenarioIds: ["friend_support", "family_conflict"],
          xpReward: 150,
          ppReward: 75,
          unlockLevel: 3,
        },
        {
          chapterNumber: 3,
          title: "The Art of Listening",
          description: "Master active listening techniques. Show others you truly hear and understand them.",
          theme: "listening",
          scenarioIds: ["partner_vent", "colleague_struggle"],
          xpReward: 200,
          ppReward: 100,
          unlockLevel: 5,
        },
        {
          chapterNumber: 4,
          title: "Navigating Conflict",
          description: "Transform conflicts into opportunities for growth. Find win-win solutions with grace.",
          theme: "conflict",
          scenarioIds: ["roommate_issue", "work_disagreement", "friend_misunderstanding"],
          xpReward: 300,
          ppReward: 150,
          unlockLevel: 8,
        },
        {
          chapterNumber: 5,
          title: "Leading with Heart",
          description: "Inspire and guide others through authentic, emotionally intelligent leadership.",
          theme: "leadership",
          scenarioIds: ["team_motivation", "difficult_conversation", "mentoring_moment"],
          xpReward: 500,
          ppReward: 250,
          unlockLevel: 12,
        },
      ];
      
      const created = await Promise.all(
        chapterTemplates.map(template => storage.createStoryChapter(template))
      );
      
      res.json({ success: true, chapters: created });
    } catch (error) {
      console.error("Error seeding story chapters:", error);
      res.status(500).json({ message: "Failed to seed story chapters" });
    }
  });

  // Seasonal Events Routes
  app.get("/api/events/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const event = await storage.getActiveSeasonalEvent();
      
      if (!event) {
        return res.json({ event: null, userProgress: null, rewards: [] });
      }
      
      const rewards = await storage.getSeasonalRewards(event.id);
      let userProgress = await storage.getUserSeasonalProgress(userId, event.id);
      
      if (!userProgress) {
        userProgress = await storage.createUserSeasonalProgress({
          userId,
          eventId: event.id,
          progress: 0,
          rewardsClaimed: [],
        });
      }
      
      res.json({ event, userProgress, rewards });
    } catch (error) {
      console.error("Error fetching active event:", error);
      res.status(500).json({ message: "Failed to fetch active event" });
    }
  });

  app.get("/api/events/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      
      const event = await storage.getSeasonalEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const rewards = await storage.getSeasonalRewards(event.id);
      let userProgress = await storage.getUserSeasonalProgress(userId, event.id);
      
      if (!userProgress) {
        userProgress = await storage.createUserSeasonalProgress({
          userId,
          eventId: event.id,
          progress: 0,
          rewardsClaimed: [],
        });
      }
      
      res.json({ event, userProgress, rewards });
    } catch (error) {
      console.error("Error fetching event:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events/:id/progress", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { increment = 1 } = req.body;
      
      const event = await storage.getSeasonalEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const now = new Date();
      if (now < event.startDate || now > event.endDate) {
        return res.status(400).json({ message: "Event is not currently active" });
      }
      
      let userProgress = await storage.getUserSeasonalProgress(userId, id);
      
      if (!userProgress) {
        userProgress = await storage.createUserSeasonalProgress({
          userId,
          eventId: id,
          progress: increment,
          rewardsClaimed: [],
        });
      } else {
        userProgress = await storage.updateUserSeasonalProgress(userProgress.id, {
          progress: (userProgress.progress || 0) + increment,
        });
      }
      
      const rewards = await storage.getSeasonalRewards(id);
      
      res.json({ userProgress, rewards });
    } catch (error) {
      console.error("Error updating event progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  app.post("/api/events/:id/claim-reward", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;
      const { rewardId } = req.body;
      
      if (!rewardId) {
        return res.status(400).json({ message: "Reward ID is required" });
      }
      
      const event = await storage.getSeasonalEvent(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }
      
      const rewards = await storage.getSeasonalRewards(id);
      const reward = rewards.find(r => r.id === rewardId);
      
      if (!reward) {
        return res.status(404).json({ message: "Reward not found" });
      }
      
      const userProgress = await storage.getUserSeasonalProgress(userId, id);
      
      if (!userProgress) {
        return res.status(400).json({ message: "No progress found for this event" });
      }
      
      if ((userProgress.progress || 0) < reward.requiredProgress) {
        return res.status(400).json({ message: "Not enough progress to claim this reward" });
      }
      
      const claimedRewards = userProgress.rewardsClaimed || [];
      if (claimedRewards.includes(rewardId)) {
        return res.status(400).json({ message: "Reward already claimed" });
      }
      
      const updatedProgress = await storage.updateUserSeasonalProgress(userProgress.id, {
        rewardsClaimed: [...claimedRewards, rewardId],
      });
      
      const progressData = await storage.getProgress(userId);
      if (progressData) {
        let updates: any = {};
        
        if (reward.type === "xp") {
          const multiplier = getStreakMultiplier(progressData.currentStreak || 0);
          const actualXp = Math.floor(reward.value * multiplier);
          updates.totalXp = (progressData.totalXp || 0) + actualXp;
          const newLevel = Math.floor(updates.totalXp / 100) + 1;
          if (newLevel > (progressData.level || 1)) {
            updates.level = newLevel;
          }
        } else if (reward.type === "pp") {
          updates.totalPp = (progressData.totalPp || 0) + reward.value;
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateProgress(userId, updates);
        }
      }
      
      res.json({
        success: true,
        userProgress: updatedProgress,
        reward,
      });
    } catch (error) {
      console.error("Error claiming reward:", error);
      res.status(500).json({ message: "Failed to claim reward" });
    }
  });

  app.post("/api/events/seed", isAuthenticated, async (req: any, res) => {
    try {
      const existing = await storage.getActiveSeasonalEvent();
      if (existing) {
        const rewards = await storage.getSeasonalRewards(existing.id);
        return res.json({ message: "Seasonal event already exists", event: existing, rewards });
      }
      
      const winterEvent = await storage.createSeasonalEvent({
        name: "Winter Reflection",
        description: "Embrace the season of reflection and growth. Complete practices during the winter season to earn exclusive rewards and deepen your emotional intelligence journey.",
        theme: "winter",
        startDate: new Date("2025-12-20T00:00:00Z"),
        endDate: new Date("2026-01-05T23:59:59Z"),
        bannerImage: null,
        accentColor: "#60A5FA",
        isActive: true,
      });
      
      const rewardTemplates = [
        {
          eventId: winterEvent.id,
          name: "Frost Starter",
          type: "xp",
          value: 100,
          description: "Bonus XP for beginning your winter journey",
          requiredProgress: 1,
        },
        {
          eventId: winterEvent.id,
          name: "Snowflake Spirit",
          type: "pp",
          value: 50,
          description: "Peace Points for staying mindful in the cold",
          requiredProgress: 3,
        },
        {
          eventId: winterEvent.id,
          name: "Winter Warmth",
          type: "xp",
          value: 250,
          description: "Major XP boost for consistent practice",
          requiredProgress: 5,
        },
        {
          eventId: winterEvent.id,
          name: "Reflection Master",
          type: "pp",
          value: 150,
          description: "Generous Peace Points for deep reflection",
          requiredProgress: 10,
        },
        {
          eventId: winterEvent.id,
          name: "Winter Champion",
          type: "xp",
          value: 500,
          description: "Ultimate XP reward for completing the event challenge",
          requiredProgress: 15,
        },
      ];
      
      const createdRewards = await Promise.all(
        rewardTemplates.map(template => storage.createSeasonalReward(template))
      );
      
      res.json({ success: true, event: winterEvent, rewards: createdRewards });
    } catch (error) {
      console.error("Error seeding seasonal event:", error);
      res.status(500).json({ message: "Failed to seed seasonal event" });
    }
  });

  // ========== DIRECT MESSAGING ROUTES ==========

  // Get all DM conversations for user
  app.get("/api/messages/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversations = await storage.getDmConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching DM conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  // Start a new DM conversation
  app.post("/api/messages/conversations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { participantId } = req.body;
      
      // Check if conversation already exists
      const existing = await storage.findDmConversation(userId, participantId);
      if (existing) {
        return res.json(existing);
      }

      const conversation = await storage.createDmConversation({
        participant1Id: userId,
        participant2Id: participantId,
      });
      res.json(conversation);
    } catch (error) {
      console.error("Error creating DM conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Get messages for a conversation
  app.get("/api/messages/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      
      // Verify user is a participant in this conversation
      const conversation = await storage.getDmConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }
      
      const messages = await storage.getDmMessages(conversationId);
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Send a message
  app.post("/api/messages/conversations/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const conversationId = req.params.id;
      const { content } = req.body;

      // Validate content
      if (!content || typeof content !== 'string') {
        return res.status(400).json({ message: "Message content is required" });
      }
      if (content.length > 5000) {
        return res.status(400).json({ message: "Message too long (max 5000 characters)" });
      }
      // Sanitize content - escape HTML entities to prevent XSS
      const sanitizedContent = content
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

      // Verify user is a participant in this conversation
      const conversation = await storage.getDmConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
        return res.status(403).json({ message: "You are not a participant in this conversation" });
      }

      const message = await storage.createDirectMessage({
        conversationId,
        senderId: userId,
        content: sanitizedContent,
      });
      
      // Update last message timestamp
      await storage.updateDmConversationTimestamp(conversationId);
      
      res.json(message);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ========== MENTORSHIP ROUTES ==========

  // Get user's mentorships
  app.get("/api/mentorship", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mentorships = await storage.getUserMentorships(userId);
      res.json(mentorships);
    } catch (error) {
      console.error("Error fetching mentorships:", error);
      res.status(500).json({ message: "Failed to fetch mentorships" });
    }
  });

  // Get available mentors
  app.get("/api/mentorship/available", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mentors = await storage.getAvailableMentors(userId);
      res.json(mentors);
    } catch (error) {
      console.error("Error fetching available mentors:", error);
      res.status(500).json({ message: "Failed to fetch mentors" });
    }
  });

  // Get pending mentorship requests
  app.get("/api/mentorship/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const pending = await storage.getPendingMentorRequests(userId);
      res.json(pending);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      res.status(500).json({ message: "Failed to fetch pending requests" });
    }
  });

  // Request a mentor
  app.post("/api/mentorship/request", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { mentorId } = req.body;

      const mentorship = await storage.createMentorship({
        mentorId,
        menteeId: userId,
        status: "pending",
      });
      res.json(mentorship);
    } catch (error) {
      console.error("Error requesting mentor:", error);
      res.status(500).json({ message: "Failed to request mentor" });
    }
  });

  // Respond to mentorship request
  app.post("/api/mentorship/:id/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const mentorshipId = req.params.id;
      const { accept } = req.body;

      // Validate accept parameter
      if (typeof accept !== 'boolean') {
        return res.status(400).json({ message: "Accept parameter must be a boolean" });
      }

      // Verify user is the mentor for this request
      const existing = await storage.getMentorshipById(mentorshipId);
      if (!existing) {
        return res.status(404).json({ message: "Mentorship request not found" });
      }
      if (existing.mentorId !== userId) {
        return res.status(403).json({ message: "Only the mentor can respond to this request" });
      }
      // Verify request is still pending
      if (existing.status !== "pending") {
        return res.status(400).json({ message: "This request has already been responded to" });
      }

      const mentorship = await storage.updateMentorship(mentorshipId, {
        status: accept ? "active" : "declined",
        acceptedAt: accept ? new Date() : undefined,
      });
      res.json(mentorship);
    } catch (error) {
      console.error("Error responding to mentorship:", error);
      res.status(500).json({ message: "Failed to respond" });
    }
  });

  // ========== VOICE JOURNAL ROUTES ==========

  // Get voice journal entries
  app.get("/api/journal/voice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entries = await storage.getVoiceJournals(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching voice journals:", error);
      res.status(500).json({ message: "Failed to fetch journals" });
    }
  });

  // Create voice journal entry (placeholder - would need audio upload handling)
  app.post("/api/journal/voice", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const entry = await storage.createVoiceJournal({
        userId,
        audioUrl: null,
        transcription: null,
        emotionAnalysis: null,
        duration: null,
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating voice journal:", error);
      res.status(500).json({ message: "Failed to create journal" });
    }
  });

  // ========== GRATITUDE JOURNAL ROUTES ==========

  // Get gratitude entries
  app.get("/api/journal/gratitude", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entries = await storage.getGratitudeEntries(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching gratitude entries:", error);
      res.status(500).json({ message: "Failed to fetch entries" });
    }
  });

  // Create gratitude entry (placeholder - would need audio upload handling)
  app.post("/api/journal/gratitude", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt } = req.body;
      
      const entry = await storage.createGratitudeEntry({
        userId,
        audioUrl: null,
        transcription: null,
        prompt,
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating gratitude entry:", error);
      res.status(500).json({ message: "Failed to create entry" });
    }
  });

  // ========== CALM MODE ROUTES ==========

  // Get calm sessions
  app.get("/api/calm/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getCalmSessions(userId);
      res.json(sessions);
    } catch (error) {
      console.error("Error fetching calm sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Create calm session
  app.post("/api/calm/sessions", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { exerciseType, duration, completedCycles } = req.body;
      
      const session = await storage.createCalmSession({
        userId,
        exerciseType,
        duration,
        completedCycles,
      });
      res.json(session);
    } catch (error) {
      console.error("Error creating calm session:", error);
      res.status(500).json({ message: "Failed to create session" });
    }
  });

  // ========== MOOD STREAKS ROUTES ==========

  // Get mood entries
  app.get("/api/mood/streaks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const entries = await storage.getMoodStreaks(userId);
      res.json(entries);
    } catch (error) {
      console.error("Error fetching mood streaks:", error);
      res.status(500).json({ message: "Failed to fetch mood data" });
    }
  });

  // Create mood entry
  app.post("/api/mood/streaks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { mood, intensity, notes } = req.body;
      
      const entry = await storage.createMoodStreak({
        userId,
        mood,
        intensity,
        notes,
      });
      res.json(entry);
    } catch (error) {
      console.error("Error creating mood entry:", error);
      res.status(500).json({ message: "Failed to create mood entry" });
    }
  });

  // ========== PRONUNCIATION COACH ROUTES ==========

  // Get pronunciation phrases
  app.get("/api/pronunciation/phrases", isAuthenticated, async (req: any, res) => {
    try {
      const category = req.query.category as string | undefined;
      const phrases = await storage.getPronunciationPhrases(category);
      res.json(phrases);
    } catch (error) {
      console.error("Error fetching pronunciation phrases:", error);
      res.status(500).json({ message: "Failed to fetch phrases" });
    }
  });

  // Get single phrase
  app.get("/api/pronunciation/phrases/:phraseId", isAuthenticated, async (req: any, res) => {
    try {
      const { phraseId } = req.params;
      const phrase = await storage.getPronunciationPhraseById(phraseId);
      if (!phrase) {
        return res.status(404).json({ message: "Phrase not found" });
      }
      res.json(phrase);
    } catch (error) {
      console.error("Error fetching phrase:", error);
      res.status(500).json({ message: "Failed to fetch phrase" });
    }
  });

  // Get user's pronunciation attempts
  app.get("/api/pronunciation/attempts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const attempts = await storage.getUserPronunciationAttempts(userId);
      res.json(attempts);
    } catch (error) {
      console.error("Error fetching pronunciation attempts:", error);
      res.status(500).json({ message: "Failed to fetch attempts" });
    }
  });

  // Get best attempt for a phrase
  app.get("/api/pronunciation/best/:phraseId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { phraseId } = req.params;
      const best = await storage.getPhraseBestAttempt(userId, phraseId);
      res.json(best || null);
    } catch (error) {
      console.error("Error fetching best attempt:", error);
      res.status(500).json({ message: "Failed to fetch best attempt" });
    }
  });

  // Submit pronunciation attempt with audio
  app.post("/api/pronunciation/attempt", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { phraseId, audioBase64 } = req.body;

      if (!phraseId || !audioBase64) {
        return res.status(400).json({ message: "Phrase ID and audio are required" });
      }

      // Get the target phrase
      const phrase = await storage.getPronunciationPhraseById(phraseId);
      if (!phrase) {
        return res.status(404).json({ message: "Phrase not found" });
      }

      // Convert base64 audio to buffer and transcribe with Whisper
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const audioFile = new File([audioBuffer], 'audio.webm', { type: 'audio/webm' });

      const transcription = await requireOpenAI().audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      const spokenText = transcription.text.toLowerCase().trim();
      const targetText = phrase.phrase.toLowerCase().trim();

      // Calculate accuracy score based on similarity
      const accuracy = calculatePronunciationAccuracy(spokenText, targetText);

      // Get AI feedback on pronunciation
      const feedbackResponse = await requireOpenAI().chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a pronunciation coach. Compare what the user said to the target phrase and provide helpful feedback. Be encouraging but specific about improvements needed.

Respond in JSON format:
{
  "overallFeedback": "Brief overall assessment",
  "tips": ["tip1", "tip2"],
  "wordsToFocus": ["word1", "word2"],
  "clarityScore": 85,
  "confidenceScore": 80
}`
          },
          {
            role: "user",
            content: `Target phrase: "${phrase.phrase}"\nUser said: "${transcription.text}"\nAccuracy score: ${accuracy}%`
          }
        ],
        response_format: { type: "json_object" }
      });

      const feedback = JSON.parse(feedbackResponse.choices[0].message.content || "{}");

      // Create the attempt record
      const attempt = await storage.createPronunciationAttempt({
        userId,
        phraseId,
        audioUrl: null, // Would store in object storage if needed
        transcription: transcription.text,
        accuracyScore: accuracy,
        feedback,
      });

      // Award XP for practice
      const xpEarned = Math.floor(accuracy / 10) + 5;
      const progress = await storage.getProgress(userId);
      if (progress) {
        await storage.updateProgress(userId, {
          totalXp: (progress.totalXp || 0) + xpEarned,
        });
      }

      res.json({
        attempt,
        transcription: transcription.text,
        targetPhrase: phrase.phrase,
        accuracyScore: accuracy,
        feedback,
        xpEarned,
      });
    } catch (error) {
      console.error("Error processing pronunciation attempt:", error);
      res.status(500).json({ message: "Failed to process pronunciation" });
    }
  });

  // Seed pronunciation phrases (admin/init route)
  app.post("/api/pronunciation/seed", isAuthenticated, async (req: any, res) => {
    try {
      const samplePhrases = [
        // Workplace
        { phrase: "I appreciate your perspective on this matter.", category: "workplace", difficulty: 1 },
        { phrase: "Let me schedule a follow-up meeting to discuss this further.", category: "workplace", difficulty: 2 },
        { phrase: "I'd like to propose an alternative solution.", category: "workplace", difficulty: 1 },
        { phrase: "Could we revisit this topic when you have more time?", category: "workplace", difficulty: 2 },
        { phrase: "I understand your concerns and I'm here to help address them.", category: "workplace", difficulty: 3 },
        
        // Assertive
        { phrase: "I need to set a boundary here.", category: "assertive", difficulty: 1 },
        { phrase: "That doesn't work for me, but I can offer this instead.", category: "assertive", difficulty: 2 },
        { phrase: "I respectfully disagree with that approach.", category: "assertive", difficulty: 2 },
        { phrase: "My time is valuable, so I'd appreciate a prompt response.", category: "assertive", difficulty: 3 },
        { phrase: "I'm not comfortable with that request.", category: "assertive", difficulty: 1 },
        
        // Empathetic
        { phrase: "I can see how that would be frustrating for you.", category: "empathetic", difficulty: 1 },
        { phrase: "Thank you for sharing that with me. How can I support you?", category: "empathetic", difficulty: 2 },
        { phrase: "I hear what you're saying and I want to understand better.", category: "empathetic", difficulty: 2 },
        { phrase: "Your feelings are completely valid.", category: "empathetic", difficulty: 1 },
        { phrase: "It sounds like you've been through a lot. I'm here for you.", category: "empathetic", difficulty: 3 },
      ];

      const created = [];
      for (const phraseData of samplePhrases) {
        const existing = await storage.getPronunciationPhrases(phraseData.category);
        const alreadyExists = existing.some(p => p.phrase === phraseData.phrase);
        if (!alreadyExists) {
          const phrase = await storage.createPronunciationPhrase(phraseData);
          created.push(phrase);
        }
      }

      res.json({ message: `Seeded ${created.length} new phrases`, created });
    } catch (error) {
      console.error("Error seeding phrases:", error);
      res.status(500).json({ message: "Failed to seed phrases" });
    }
  });

  // ========== Weekly Tournament Routes ==========

  // Get active tournament
  app.get("/api/tournaments/active", isAuthenticated, async (req: any, res) => {
    try {
      const tournament = await storage.getActiveTournament();
      res.json(tournament || null);
    } catch (error) {
      console.error("Error fetching active tournament:", error);
      res.status(500).json({ message: "Failed to fetch active tournament" });
    }
  });

  // Get upcoming tournaments
  app.get("/api/tournaments/upcoming", isAuthenticated, async (req: any, res) => {
    try {
      const tournaments = await storage.getUpcomingTournaments();
      res.json(tournaments);
    } catch (error) {
      console.error("Error fetching upcoming tournaments:", error);
      res.status(500).json({ message: "Failed to fetch upcoming tournaments" });
    }
  });

  // Get tournament by ID
  app.get("/api/tournaments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }
      res.json(tournament);
    } catch (error) {
      console.error("Error fetching tournament:", error);
      res.status(500).json({ message: "Failed to fetch tournament" });
    }
  });

  // Join a tournament
  app.post("/api/tournaments/:id/join", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const tournament = await storage.getTournament(id);
      if (!tournament) {
        return res.status(404).json({ message: "Tournament not found" });
      }

      const now = new Date();
      if (now < tournament.startDate || now > tournament.endDate) {
        return res.status(400).json({ message: "Tournament is not currently active" });
      }

      const existing = await storage.getTournamentParticipant(id, userId);
      if (existing) {
        return res.json({ participant: existing, alreadyJoined: true });
      }

      const participant = await storage.joinTournament(id, userId);
      res.json({ participant, alreadyJoined: false });
    } catch (error) {
      console.error("Error joining tournament:", error);
      res.status(500).json({ message: "Failed to join tournament" });
    }
  });

  // Get tournament leaderboard
  app.get("/api/tournaments/:id/leaderboard", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string || '50', 10);
      const leaderboard = await storage.getTournamentLeaderboard(id, limit);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching tournament leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get user's rank in tournament
  app.get("/api/tournaments/:id/my-rank", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { id } = req.params;

      const participant = await storage.getTournamentParticipant(id, userId);
      if (!participant) {
        return res.json({ joined: false });
      }

      const rankData = await storage.getUserTournamentRank(id, userId);
      res.json({
        joined: true,
        score: participant.score,
        practiceCount: participant.practiceCount,
        ...rankData,
      });
    } catch (error) {
      console.error("Error fetching user tournament rank:", error);
      res.status(500).json({ message: "Failed to fetch rank" });
    }
  });

  // Seed a sample tournament (for development/testing)
  app.post("/api/tournaments/seed", isAuthenticated, async (req: any, res) => {
    try {
      const now = new Date();
      const endDate = new Date(now);
      endDate.setDate(endDate.getDate() + 7);

      const tournament = await storage.createTournament({
        name: "Empathy Week Challenge",
        title: "Empathy Week Challenge",
        description: "Practice empathetic communication and compete for the top spot! Complete practice sessions to earn points and climb the leaderboard.",
        theme: "empathy",
        startDate: now,
        endDate: endDate,
        status: "active",
        rules: [
          "Complete practice sessions to earn points",
          "Each session earns points based on your score",
          "Top 3 players win exclusive badges and rewards",
          "Bonus points for streak maintenance"
        ],
        prizes: {
          first: { xp: 1000, pp: 500, badge: "Champion Empath" },
          second: { xp: 500, pp: 250, badge: "Empathy Master" },
          third: { xp: 250, pp: 100, badge: "Rising Empath" }
        },
        rewardXp: 500,
        isActive: true,
      });

      res.json({ message: "Tournament created", tournament });
    } catch (error) {
      console.error("Error seeding tournament:", error);
      res.status(500).json({ message: "Failed to seed tournament" });
    }
  });

  // ===== DUO PRACTICE ROUTES =====
  
  // Get available duo scenarios
  app.get("/api/duo/scenarios", isAuthenticated, async (_req: any, res) => {
    try {
      const duoScenarios = getDuoScenarios();
      res.json(duoScenarios);
    } catch (error) {
      console.error("Error fetching duo scenarios:", error);
      res.status(500).json({ message: "Failed to fetch duo scenarios" });
    }
  });

  // Create a duo session invitation
  app.post("/api/duo/invite", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { partnerUserId, scenarioId } = req.body;

      if (!partnerUserId || !scenarioId) {
        return res.status(400).json({ message: "Partner user ID and scenario ID are required" });
      }

      // Verify scenario exists
      const scenario = getDuoScenarioById(scenarioId);
      if (!scenario) {
        return res.status(404).json({ message: "Duo scenario not found" });
      }

      // Verify partner exists
      const partner = await storage.getUser(partnerUserId);
      if (!partner) {
        return res.status(404).json({ message: "Partner user not found" });
      }

      const session = await storage.createDuoSession(userId, partnerUserId, scenarioId);
      res.json(session);
    } catch (error) {
      console.error("Error creating duo invitation:", error);
      res.status(500).json({ message: "Failed to create duo invitation" });
    }
  });

  // Get pending duo invitations for the current user
  app.get("/api/duo/pending", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const invitations = await storage.getPendingDuoInvitations(userId);
      
      // Enrich with scenario details
      const enriched = invitations.map(inv => ({
        ...inv,
        scenario: getDuoScenarioById(inv.session.scenarioId),
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching pending invitations:", error);
      res.status(500).json({ message: "Failed to fetch pending invitations" });
    }
  });

  // Get active duo sessions for the current user
  app.get("/api/duo/active", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getActiveDuoSessions(userId);
      
      // Enrich with scenario details
      const enriched = sessions.map(s => ({
        ...s,
        scenario: getDuoScenarioById(s.session.scenarioId),
      }));
      
      res.json(enriched);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Accept a duo invitation
  app.post("/api/duo/:id/accept", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;

      const session = await storage.acceptDuoInvitation(sessionId, userId);
      if (!session) {
        return res.status(404).json({ message: "Invitation not found or already processed" });
      }

      res.json(session);
    } catch (error) {
      console.error("Error accepting invitation:", error);
      res.status(500).json({ message: "Failed to accept invitation" });
    }
  });

  // Get a specific duo session with messages
  app.get("/api/duo/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;

      const session = await storage.getDuoSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Verify user is part of this session
      if (session.hostUserId !== userId && session.partnerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized to view this session" });
      }

      const messages = await storage.getDuoMessages(sessionId);
      const scenario = getDuoScenarioById(session.scenarioId);
      
      // Get both users
      const host = await storage.getUser(session.hostUserId);
      const partner = await storage.getUser(session.partnerUserId);

      res.json({
        session,
        messages,
        scenario,
        host,
        partner,
        isHost: session.hostUserId === userId,
      });
    } catch (error) {
      console.error("Error fetching duo session:", error);
      res.status(500).json({ message: "Failed to fetch duo session" });
    }
  });

  // Submit a response in a duo session
  app.post("/api/duo/:id/respond", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;
      const { message, role, phase } = req.body;

      if (!message) {
        return res.status(400).json({ message: "Message is required" });
      }

      const session = await storage.getDuoSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      if (session.status !== "active") {
        return res.status(400).json({ message: "Session is not active" });
      }

      // Verify user is part of this session
      const isHost = session.hostUserId === userId;
      const isPartner = session.partnerUserId === userId;
      if (!isHost && !isPartner) {
        return res.status(403).json({ message: "Not authorized for this session" });
      }

      // Verify it's their turn
      const expectedTurn = isHost ? "host" : "partner";
      if (session.currentTurn !== expectedTurn) {
        return res.status(400).json({ message: "It's not your turn" });
      }

      // Get scenario for AI feedback
      const scenario = getDuoScenarioById(session.scenarioId);
      
      // Use OpenAI to score the response
      let score = 75;
      let feedback = "Good response!";
      
      try {
        const completion = await requireOpenAI().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: `You are an emotional intelligence coach evaluating a practice response in a duo practice session.
              
Scenario: ${scenario?.title || "Unknown"}
Context: ${scenario?.context || "Two people practicing communication"}
Current Phase: ${phase || "Practice"}
The user is playing the role of: ${role || "Participant"}

Evaluate the response on:
1. Emotional awareness and empathy
2. Clear communication
3. Constructive problem-solving
4. Active listening cues

Respond in JSON format:
{
  "score": <number 0-100>,
  "feedback": "<brief constructive feedback, 1-2 sentences>"
}`
            },
            {
              role: "user",
              content: message
            }
          ],
          response_format: { type: "json_object" },
        });

        const result = JSON.parse(completion.choices[0]?.message?.content || "{}");
        score = result.score || 75;
        feedback = result.feedback || "Good effort!";
      } catch (aiError) {
        console.error("AI scoring error:", aiError);
      }

      // Add the message
      const duoMessage = await storage.addDuoMessage({
        sessionId,
        userId,
        role: role || (isHost ? "Role A" : "Role B"),
        message,
        score,
        feedback,
      });

      // Update turn
      const nextTurn = session.currentTurn === "host" ? "partner" : "host";
      await storage.updateDuoSession(sessionId, { currentTurn: nextTurn });

      // Update session scores
      if (isHost) {
        await storage.updateDuoSession(sessionId, {
          hostScore: (session.hostScore || 0) + score,
        });
      } else {
        await storage.updateDuoSession(sessionId, {
          partnerScore: (session.partnerScore || 0) + score,
        });
      }

      res.json({
        message: duoMessage,
        score,
        feedback,
        nextTurn,
      });
    } catch (error: any) {
      if (error?.name === "OpenAIUnavailableError") {
        return handleOpenAIError(res, error);
      }
      console.error("Error submitting duo response:", error);
      res.status(500).json({ message: "Failed to submit response" });
    }
  });

  // Complete a duo session
  app.post("/api/duo/:id/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessionId = req.params.id;

      const session = await storage.getDuoSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Verify user is part of this session
      if (session.hostUserId !== userId && session.partnerUserId !== userId) {
        return res.status(403).json({ message: "Not authorized for this session" });
      }

      // Get final scores from messages
      const messages = await storage.getDuoMessages(sessionId);
      let hostScore = 0;
      let partnerScore = 0;
      
      for (const msg of messages) {
        if (msg.userId === session.hostUserId) {
          hostScore += msg.score || 0;
        } else {
          partnerScore += msg.score || 0;
        }
      }

      const completed = await storage.completeDuoSession(sessionId, hostScore, partnerScore);

      // Award XP to both participants
      const hostProgress = await storage.getProgress(session.hostUserId);
      const partnerProgress = await storage.getProgress(session.partnerUserId);
      
      const xpReward = Math.round((hostScore + partnerScore) / 4);
      
      if (hostProgress) {
        await storage.updateProgress(session.hostUserId, {
          totalXp: (hostProgress.totalXp || 0) + xpReward,
          totalPp: (hostProgress.totalPp || 0) + 50,
        });
      }
      
      if (partnerProgress) {
        await storage.updateProgress(session.partnerUserId, {
          totalXp: (partnerProgress.totalXp || 0) + xpReward,
          totalPp: (partnerProgress.totalPp || 0) + 50,
        });
      }

      res.json({
        session: completed,
        hostScore,
        partnerScore,
        xpReward,
      });
    } catch (error) {
      console.error("Error completing duo session:", error);
      res.status(500).json({ message: "Failed to complete session" });
    }
  });

  // Get friends list for inviting (uses existing friendships)
  app.get("/api/duo/friends", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const friends = await storage.getFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error("Error fetching friends for duo:", error);
      res.status(500).json({ message: "Failed to fetch friends" });
    }
  });

  // ============================================
  // MINI-GAMES ROUTES
  // ============================================
  
  const DAILY_GAME_LIMIT = 3; // Max plays per day per game type
  const TOTAL_DAILY_LIMIT = 6; // Max total plays across all games
  
  // Get mini-games status (plays remaining, etc.)
  app.get("/api/mini-games/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      
      const emotionMatchPlays = await storage.getMiniGamePlaysToday(userId, "emotion_match");
      const toneChallengePlays = await storage.getMiniGamePlaysToday(userId, "tone_challenge");
      const empathyLadderPlays = await storage.getMiniGamePlaysToday(userId, "empathy_ladder");
      const totalPlays = await storage.getMiniGamePlaysToday(userId);
      
      const recentSessions = await storage.getMiniGameSessions(userId, 10);
      
      res.json({
        games: {
          emotion_match: {
            name: "Emotion Match",
            description: "Match pairs of emotions to improve recognition",
            playsToday: emotionMatchPlays,
            maxPlays: DAILY_GAME_LIMIT,
            canPlay: emotionMatchPlays < DAILY_GAME_LIMIT && totalPlays < TOTAL_DAILY_LIMIT,
          },
          tone_challenge: {
            name: "Tone Challenge", 
            description: "Identify the correct tone in 10 quick rounds",
            playsToday: toneChallengePlays,
            maxPlays: DAILY_GAME_LIMIT,
            canPlay: toneChallengePlays < DAILY_GAME_LIMIT && totalPlays < TOTAL_DAILY_LIMIT,
          },
          empathy_ladder: {
            name: "Empathy Ladder",
            description: "Choose the most empathetic response",
            playsToday: empathyLadderPlays,
            maxPlays: DAILY_GAME_LIMIT,
            canPlay: empathyLadderPlays < DAILY_GAME_LIMIT && totalPlays < TOTAL_DAILY_LIMIT,
          },
        },
        totalPlaysToday: totalPlays,
        totalMaxPlays: TOTAL_DAILY_LIMIT,
        recentSessions,
      });
    } catch (error) {
      console.error("Error fetching mini-games status:", error);
      res.status(500).json({ message: "Failed to fetch mini-games status" });
    }
  });
  
  // Start a mini-game session
  app.post("/api/mini-games/:gameType/start", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { gameType } = req.params;
      
      const validGameTypes = ["emotion_match", "tone_challenge", "empathy_ladder"];
      if (!validGameTypes.includes(gameType)) {
        return res.status(400).json({ message: "Invalid game type" });
      }
      
      const gamePlays = await storage.getMiniGamePlaysToday(userId, gameType);
      const totalPlays = await storage.getMiniGamePlaysToday(userId);
      
      if (gamePlays >= DAILY_GAME_LIMIT) {
        return res.status(400).json({ message: "Daily limit reached for this game" });
      }
      
      if (totalPlays >= TOTAL_DAILY_LIMIT) {
        return res.status(400).json({ message: "Daily limit reached for all games" });
      }
      
      const session = await storage.createMiniGameSession({
        userId,
        gameType,
        score: 0,
        maxScore: 100,
        completed: false,
      });
      
      res.json({ session });
    } catch (error) {
      console.error("Error starting mini-game:", error);
      res.status(500).json({ message: "Failed to start mini-game" });
    }
  });
  
  // Complete a mini-game session and award rewards
  app.post("/api/mini-games/:sessionId/complete", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;
      const { score, duration } = req.body;
      
      if (typeof score !== "number" || score < 0 || score > 100) {
        return res.status(400).json({ message: "Invalid score" });
      }
      
      // Determine reward rarity based on score
      let rewardRarity: string | null = null;
      let rewardXp = 0;
      let rewardPp = 0;
      
      if (score >= 95) {
        rewardRarity = "epic";
        rewardXp = 50;
        rewardPp = 15;
      } else if (score >= 80) {
        rewardRarity = "rare";
        rewardXp = 30;
        rewardPp = 10;
      } else if (score >= 60) {
        rewardRarity = "common";
        rewardXp = 20;
        rewardPp = 5;
      } else {
        rewardXp = 10;
        rewardPp = 2;
      }
      
      // Try to award a cosmetic item
      let rewardItem: any = null;
      if (rewardRarity) {
        rewardItem = await storage.getRewardableCosmetic(userId, rewardRarity);
        
        if (rewardItem) {
          await storage.addToInventory({
            userId,
            itemId: rewardItem.id,
          });
        }
      }
      
      // Complete the session
      const session = await storage.completeMiniGameSession(
        sessionId,
        score,
        duration || 0,
        rewardItem?.id,
        rewardXp,
        rewardPp
      );
      
      // Update user progress with XP and PP
      const progress = await storage.getProgress(userId);
      if (progress) {
        const newXp = (progress.totalXp || 0) + rewardXp;
        const newPp = (progress.totalPp || 0) + rewardPp;
        const newLevel = Math.floor(newXp / 100) + 1;
        
        await storage.updateProgress(userId, {
          totalXp: newXp,
          totalPp: newPp,
          level: newLevel > (progress.level || 1) ? newLevel : progress.level,
        });
      }
      
      res.json({
        session,
        rewards: {
          xp: rewardXp,
          pp: rewardPp,
          item: rewardItem,
        },
      });
    } catch (error) {
      console.error("Error completing mini-game:", error);
      res.status(500).json({ message: "Failed to complete mini-game" });
    }
  });

  // ============================================
  // MOOD CHECK-IN & WEATHER EFFECTS ROUTES
  // ============================================
  
  const MOOD_TO_WEATHER: Record<string, string> = {
    calm: "starry",
    happy: "sunny",
    anxious: "rain",
    sad: "mist",
    energized: "aurora",
    peaceful: "clouds",
    stressed: "snow",
    hopeful: "rainbow",
  };
  
  // Create mood check-in
  app.post("/api/mood/checkin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { mood, intensity, note } = req.body;
      
      if (!mood) {
        return res.status(400).json({ message: "Mood is required" });
      }
      
      const weatherEffect = MOOD_TO_WEATHER[mood] || "clouds";
      const checkin = await storage.createMoodCheckin(userId, mood, intensity || 5, note || null, weatherEffect);
      
      res.json({ checkin, weatherEffect });
    } catch (error) {
      console.error("Error creating mood check-in:", error);
      res.status(500).json({ message: "Failed to create mood check-in" });
    }
  });
  
  // Get latest mood and weather
  app.get("/api/mood/current", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const checkin = await storage.getLatestMoodCheckin(userId);
      
      if (!checkin) {
        return res.json({ mood: null, weatherEffect: "clouds" });
      }
      
      res.json({
        mood: checkin.mood,
        intensity: checkin.intensity,
        weatherEffect: checkin.weatherEffect || "clouds",
        checkedAt: checkin.createdAt,
      });
    } catch (error) {
      console.error("Error fetching current mood:", error);
      res.status(500).json({ message: "Failed to fetch current mood" });
    }
  });
  
  // Get mood history
  app.get("/api/mood/history", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const history = await storage.getMoodCheckinHistory(userId, 7);
      res.json(history);
    } catch (error) {
      console.error("Error fetching mood history:", error);
      res.status(500).json({ message: "Failed to fetch mood history" });
    }
  });
  
  // ============================================
  // COSMETIC ITEM LORE ROUTES
  // ============================================
  
  // Get item lore by ID
  app.get("/api/cosmetics/:itemId/lore", async (req, res) => {
    try {
      const { itemId } = req.params;
      const item = await storage.getShopItem(itemId);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json({
        id: item.id,
        name: item.name,
        description: item.description,
        rarity: item.rarity,
        loreOrigin: item.loreOrigin,
        loreFlavor: item.loreFlavor,
        loreCollection: item.loreCollection,
      });
    } catch (error) {
      console.error("Error fetching item lore:", error);
      res.status(500).json({ message: "Failed to fetch item lore" });
    }
  });

  // Tone Journey - User's performance across all tones
  app.get("/api/tone-journey", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const sessions = await storage.getPracticeSessions(userId, 1000);
      
      const canonicalTones = ["calm", "assertive", "empathetic", "confident", "defensive", "anxious", "aggressive", "passive"];
      const toneAliases: Record<string, string> = {
        "empathic": "empathetic",
        "confidence": "confident",
        "assertion": "assertive",
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

      const toneStats: Map<string, { scores: number[]; bestScore: number; recentScores: number[] }> = new Map();
      
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
        .filter(s => s.tone && s.score !== null)
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
        const recentAvg = stats.recentScores.length > 0 
          ? stats.recentScores.reduce((a, b) => a + b, 0) / stats.recentScores.length 
          : avg;
        const olderAvg = stats.scores.length > stats.recentScores.length
          ? (stats.scores.reduce((a, b) => a + b, 0) - stats.recentScores.reduce((a, b) => a + b, 0)) / (stats.scores.length - stats.recentScores.length)
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
      const strengths = sortedByScore.filter(p => p.averageScore >= 70).slice(0, 3);
      const areasToImprove = sortedByScore.filter(p => p.averageScore < 70).slice(-3).reverse();

      res.json({
        performances,
        strengths,
        areasToImprove,
        overallProgress: performances.length > 0 
          ? Math.round(performances.reduce((sum, p) => sum + p.averageScore, 0) / performances.length)
          : 0,
      });
    } catch (error) {
      console.error("Error fetching tone journey:", error);
      res.status(500).json({ message: "Failed to fetch tone journey data" });
    }
  });

  // Admin Analytics (requires auth)
  app.get("/api/admin/analytics", isAuthenticated, async (req: any, res) => {
    try {
      const analytics = await storage.getAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Prototype feedback (read-only, token gated)
  app.get("/api/admin/feedback", async (req: any, res) => {
    try {
      const token = (req.headers.authorization || "").replace("Bearer ", "");
      if (!token || token !== process.env.ADMIN_FEEDBACK_TOKEN) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const feedback = await storage.getPrototypeFeedback(200);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching prototype feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Get all beta signups (admin)
  app.get("/api/admin/beta-signups", isAuthenticated, async (req: any, res) => {
    try {
      const signups = await storage.getBetaSignups();
      res.json(signups);
    } catch (error) {
      console.error("Error fetching beta signups:", error);
      res.status(500).json({ message: "Failed to fetch signups" });
    }
  });

  // Testimonials - Get all (admin)
  app.get("/api/admin/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const testimonials = await storage.getTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // Testimonials - Get approved (public)
  app.get("/api/testimonials", async (req, res) => {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      res.json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  });

  // Testimonials - Create (logged-in users, pending approval)
  app.post("/api/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const publicSchema = insertTestimonialSchema.pick({
        name: true,
        content: true,
      });

      const parseResult = publicSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: parseResult.error.flatten().fieldErrors,
        });
      }

      const testimonial = await storage.createTestimonial({
        ...parseResult.data,
        rating: 5,
        featured: false,
        approved: false,
      });

      res.json(testimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(500).json({ message: "Failed to create testimonial" });
    }
  });

  // Testimonials - Create (admin)
  app.post("/api/admin/testimonials", isAuthenticated, async (req: any, res) => {
    try {
      const parseResult = insertTestimonialSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const testimonial = await storage.createTestimonial(parseResult.data);
      res.json(testimonial);
    } catch (error) {
      console.error("Error creating testimonial:", error);
      res.status(500).json({ message: "Failed to create testimonial" });
    }
  });

  // Testimonials - Update (admin)
  app.patch("/api/admin/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      const updateSchema = insertTestimonialSchema.partial();
      const parseResult = updateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: parseResult.error.flatten().fieldErrors 
        });
      }

      const testimonial = await storage.updateTestimonial(req.params.id, parseResult.data);
      if (!testimonial) {
        return res.status(404).json({ message: "Testimonial not found" });
      }
      res.json(testimonial);
    } catch (error) {
      console.error("Error updating testimonial:", error);
      res.status(500).json({ message: "Failed to update testimonial" });
    }
  });

  // Testimonials - Delete (admin)
  app.delete("/api/admin/testimonials/:id", isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteTestimonial(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting testimonial:", error);
      res.status(500).json({ message: "Failed to delete testimonial" });
    }
  });

  // User Feedback - Submit feedback (authenticated or anonymous)
  app.post("/api/feedback", async (req: any, res) => {
    try {
      // Accept both legacy user feedback fields and the new prototype feedback payload.
      const { type, message, consent_public, context, platform, tags, category, difficulty, scenario_id, app_version } = req.body;

      // Persist legacy user_feedback if payload matches schema (preserve existing path)
      const feedbackData = {
        ...req.body,
        userId: req.user?.id || null,
        status: "new",
      };

      const parseResult = insertUserFeedbackSchema.safeParse(feedbackData);
      if (parseResult.success) {
        await storage.createUserFeedback(parseResult.data);
      }

      // Persist into prototype_feedback for internal signal
      try {
        const protoEntry = {
          platform: platform || "web",
          feedbackText: message || req.body.message || "",
          tags: tags || [],
          category: (context && context.category) || category || null,
          difficulty: (context && context.difficulty) || difficulty || null,
          scenarioId: (context && context.scenario_id) || scenario_id || null,
          appVersion: app_version || req.body.app_version || null,
          anonymousUserId: req.user?.id ? null : (req.body.anonymousUserId || null),
          type: type || (req.body.type || null),
          consentPublic: !!consent_public,
        } as InsertPrototypeFeedback;

        const created = await storage.createPrototypeFeedback(protoEntry);
        return res.json(created);
      } catch (err) {
        console.error("Failed to write prototype feedback:", err);
        return res.status(500).json({ message: "Failed to submit feedback" });
      }
    } catch (error) {
      console.error("Error submitting feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  return httpServer;
}

// Helper function to calculate pronunciation accuracy
function calculatePronunciationAccuracy(spoken: string, target: string): number {
  // Normalize texts
  const spokenWords = spoken.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w);
  const targetWords = target.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w);

  if (targetWords.length === 0) return 0;

  let matchedWords = 0;
  for (const word of targetWords) {
    if (spokenWords.includes(word)) {
      matchedWords++;
    }
  }

  // Calculate base accuracy
  const wordAccuracy = (matchedWords / targetWords.length) * 100;
  
  // Penalize for extra words
  const extraWords = Math.max(0, spokenWords.length - targetWords.length);
  const penalty = Math.min(20, extraWords * 5);

  return Math.max(0, Math.min(100, Math.round(wordAccuracy - penalty)));
}
