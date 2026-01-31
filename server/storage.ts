import { eq, desc, and, sql, or, gte, lte, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  users,
  userProgress,
  practiceSessions,
  dailyCapsules,
  conversations,
  scenarios,
  rehearsals,
  cosmeticItems,
  userInventory,
  equippedItems,
  badges,
  userBadges,
  subscriptions,
  voiceClones,
  voiceCloneSamples,
  gifts,
  userVoicePreferences,
  friendships,
  circles,
  circleMembers,
  challenges,
  challengeParticipants,
  customScenarios,
  scenarioRatings,
  avatarPresets,
  communityPosts,
  postReactions,
  postComments,
  wheelRewards,
  dailyWheelSpins,
  bestMoments,
  dailyLoginRewards,
  userLoginRewards,
  moodCheckIns,
  weeklyChallenges,
  userWeeklyChallengeProgress,
  storyChapters,
  userStoryProgress,
  seasonalEvents,
  seasonalRewards,
  userSeasonalProgress,
  userFeedback,
  type User,
  type UpsertUser,
  type UserProgress,
  type InsertUserProgress,
  type PracticeSession,
  type InsertPracticeSession,
  type DailyCapsule,
  type InsertDailyCapsule,
  type Conversation,
  type InsertConversation,
  type Scenario,
  type InsertScenario,
  type Rehearsal,
  type InsertRehearsal,
  type CosmeticItem,
  type InsertCosmeticItem,
  type UserInventoryItem,
  type InsertUserInventory,
  type EquippedItem,
  type InsertEquippedItem,
  type Badge,
  type InsertBadge,
  type UserBadge,
  type InsertUserBadge,
  type Subscription,
  type InsertSubscription,
  type VoiceClone,
  type InsertVoiceClone,
  type VoiceCloneSample,
  type InsertVoiceCloneSample,
  type Gift,
  type InsertGift,
  type UserVoicePreference,
  type InsertUserVoicePreference,
  type Friendship,
  type InsertFriendship,
  type Circle,
  type InsertCircle,
  type CircleMember,
  type InsertCircleMember,
  type Challenge,
  type InsertChallenge,
  type ChallengeParticipant,
  type InsertChallengeParticipant,
  type CustomScenario,
  type InsertCustomScenario,
  type ScenarioRating,
  type InsertScenarioRating,
  userAvatarSettings,
  type UserAvatarSettings,
  type InsertUserAvatarSettings,
  type AvatarPreset,
  type InsertAvatarPreset,
  type CommunityPost,
  type InsertCommunityPost,
  type PostReaction,
  type InsertPostReaction,
  type PostComment,
  type InsertPostComment,
  type WheelReward,
  type InsertWheelReward,
  type DailyWheelSpin,
  type InsertDailyWheelSpin,
  type BestMoment,
  type InsertBestMoment,
  type DailyLoginReward,
  type InsertDailyLoginReward,
  type UserLoginReward,
  type InsertUserLoginReward,
  type MoodCheckIn,
  type InsertMoodCheckIn,
  type WeeklyChallenge,
  type InsertWeeklyChallenge,
  type UserWeeklyChallengeProgress,
  type InsertUserWeeklyChallengeProgress,
  type StoryChapter,
  type InsertStoryChapter,
  type UserStoryProgress,
  type InsertUserStoryProgress,
  type SeasonalEvent,
  type InsertSeasonalEvent,
  type SeasonalReward,
  type InsertSeasonalReward,
  type UserSeasonalProgress,
  type InsertUserSeasonalProgress,
  dmConversations,
  directMessages,
  mentorships,
  voiceJournals,
  gratitudeEntries,
  calmSessions,
  moodStreaks,
  pronunciationPhrases,
  pronunciationAttempts,
  circleChallenges,
  circleChallengeProgress,
  weeklyTournaments,
  tournamentParticipants,
  duoSessions,
  duoMessages,
  type CircleChallenge,
  type InsertCircleChallenge,
  type CircleChallengeProgress,
  type InsertCircleChallengeProgress,
  type WeeklyTournament,
  type InsertWeeklyTournament,
  type TournamentParticipant,
  type InsertTournamentParticipant,
  type DuoSession,
  type InsertDuoSession,
  type DuoMessage,
  type InsertDuoMessage,
  miniGameSessions,
  type MiniGameSession,
  type InsertMiniGameSession,
  moodCheckins,
  type MoodCheckin,
  betaSignups,
  type BetaSignup,
  type InsertBetaSignup,
  testimonials,
  type Testimonial,
  type InsertTestimonial,
  prototypeFeedback,
  type PrototypeFeedback,
  type UserFeedback,
  type InsertUserFeedback,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(userData: Partial<UpsertUser>): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User | undefined>;
  updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined>;
  
  // Stripe queries (from stripe schema)
  getStripeSubscriptionByCustomerId(customerId: string): Promise<any | null>;
  getStripeProductsWithPrices(): Promise<any[]>;
  getStripeProductById(productId: string): Promise<any | null>;
  
  // Progress
  getProgress(userId: string): Promise<UserProgress | undefined>;
  createProgress(progress: InsertUserProgress): Promise<UserProgress>;
  updateProgress(userId: string, updates: Partial<InsertUserProgress>): Promise<UserProgress | undefined>;
  
  // Practice Sessions
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  getPracticeSessions(userId: string, limit?: number): Promise<PracticeSession[]>;
  getPracticeSessionsInDateRange(userId: string, startDate: Date, endDate: Date): Promise<PracticeSession[]>;
  getTodayPracticeSessionCount(userId: string): Promise<number>;
  
  // Daily Capsules
  getDailyCapsule(userId: string, date: Date): Promise<DailyCapsule | undefined>;
  createDailyCapsule(capsule: InsertDailyCapsule): Promise<DailyCapsule>;
  updateDailyCapsule(id: string, updates: Partial<InsertDailyCapsule>): Promise<DailyCapsule | undefined>;
  
  // Conversations
  getConversation(userId: string): Promise<Conversation | undefined>;
  getAllConversations(userId: string, limit?: number): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Shop
  getShopItems(): Promise<CosmeticItem[]>;
  getShopItem(id: string): Promise<CosmeticItem | undefined>;
  
  // Inventory
  getUserInventory(userId: string): Promise<{ item: CosmeticItem }[]>;
  getUserInventoryIds(userId: string): Promise<string[]>;
  addToInventory(inventory: InsertUserInventory): Promise<UserInventoryItem>;
  
  // Equipped Items
  getEquippedItems(userId: string): Promise<(EquippedItem & { item: CosmeticItem })[]>;
  equipItem(item: InsertEquippedItem): Promise<EquippedItem>;
  
  // Avatar Settings
  getUserAvatarSettings(userId: string): Promise<UserAvatarSettings | undefined>;
  upsertUserAvatarSettings(settings: InsertUserAvatarSettings): Promise<UserAvatarSettings>;
  
  // Avatar Presets
  getAvatarPresets(userId: string): Promise<AvatarPreset[]>;
  getAvatarPreset(id: string): Promise<AvatarPreset | undefined>;
  createAvatarPreset(preset: InsertAvatarPreset): Promise<AvatarPreset>;
  updateAvatarPreset(id: string, updates: Partial<InsertAvatarPreset>): Promise<AvatarPreset | undefined>;
  deleteAvatarPreset(id: string): Promise<void>;
  setDefaultAvatarPreset(userId: string, presetId: string): Promise<void>;
  countUserAvatarPresets(userId: string): Promise<number>;
  
  // Badges
  getBadges(): Promise<Badge[]>;
  getUserBadges(userId: string): Promise<{ badge: Badge; earnedAt: Date }[]>;
  awardBadge(userBadge: InsertUserBadge): Promise<UserBadge>;
  
  // Subscriptions
  getSubscription(userId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  
  // Rehearsals
  getRehearsal(id: string): Promise<Rehearsal | undefined>;
  getRehearsals(userId: string, limit?: number): Promise<Rehearsal[]>;
  createRehearsal(rehearsal: InsertRehearsal): Promise<Rehearsal>;
  updateRehearsal(id: string, updates: Partial<InsertRehearsal>): Promise<Rehearsal | undefined>;
  
  // Gifts
  createGift(gift: InsertGift): Promise<Gift>;
  getGift(id: string): Promise<Gift | undefined>;
  getReceivedGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; sender: User }[]>;
  getSentGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; recipient: User }[]>;
  getPendingGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; sender: User }[]>;
  updateGiftStatus(giftId: string, status: string): Promise<Gift | undefined>;
  removeFromInventory(userId: string, itemId: string): Promise<void>;
  
  // Voice Clones
  getUserVoiceClones(userId: string): Promise<VoiceClone[]>;
  getVoiceClone(id: string): Promise<VoiceClone | undefined>;
  createVoiceClone(data: InsertVoiceClone): Promise<VoiceClone>;
  updateVoiceClone(id: string, updates: Partial<InsertVoiceClone>): Promise<VoiceClone | undefined>;
  deleteVoiceClone(id: string): Promise<void>;
  getDefaultVoice(userId: string): Promise<VoiceClone | undefined>;
  setDefaultVoiceClone(userId: string, voiceCloneId: string): Promise<void>;
  
  // Voice Clone Samples
  getVoiceCloneSamples(voiceCloneId: string): Promise<VoiceCloneSample[]>;
  createVoiceCloneSample(data: InsertVoiceCloneSample): Promise<VoiceCloneSample>;
  deleteVoiceCloneSamples(voiceCloneId: string): Promise<void>;
  
  // Voice Preferences
  getUserVoicePreferences(userId: string): Promise<UserVoicePreference | undefined>;
  upsertUserVoicePreferences(userId: string, data: Partial<InsertUserVoicePreference>): Promise<UserVoicePreference>;
  
  // Friendships
  createFriendship(friendship: InsertFriendship): Promise<Friendship>;
  getFriendship(userId: string, friendId: string): Promise<Friendship | undefined>;
  getFriendshipById(id: string): Promise<Friendship | undefined>;
  getFriends(userId: string): Promise<{ friendship: Friendship; friend: User }[]>;
  getPendingFriendRequests(userId: string): Promise<{ friendship: Friendship; user: User }[]>;
  updateFriendshipStatus(id: string, status: string): Promise<Friendship | undefined>;
  deleteFriendship(id: string): Promise<void>;
  
  // Circles
  createCircle(circle: InsertCircle): Promise<Circle>;
  getCircle(id: string): Promise<Circle | undefined>;
  getUserCircles(userId: string): Promise<{ circle: Circle; memberCount: number }[]>;
  getPublicCircles(): Promise<Circle[]>;
  deleteCircle(id: string): Promise<void>;
  
  // Circle Members
  addCircleMember(member: InsertCircleMember): Promise<CircleMember>;
  getCircleMembers(circleId: string): Promise<{ member: CircleMember; user: User }[]>;
  getCircleMember(circleId: string, userId: string): Promise<CircleMember | undefined>;
  removeCircleMember(circleId: string, userId: string): Promise<void>;
  
  // Challenges
  createChallenge(challenge: InsertChallenge): Promise<Challenge>;
  getChallenge(id: string): Promise<Challenge | undefined>;
  getActiveChallenges(): Promise<Challenge[]>;
  
  // Challenge Participants
  joinChallenge(participant: InsertChallengeParticipant): Promise<ChallengeParticipant>;
  getChallengeParticipation(challengeId: string, userId: string): Promise<ChallengeParticipant | undefined>;
  getUserChallengeProgress(userId: string): Promise<{ participant: ChallengeParticipant; challenge: Challenge }[]>;
  updateChallengeProgress(id: string, progress: number, completed: boolean): Promise<ChallengeParticipant | undefined>;
  
  // Leaderboards
  getGlobalLeaderboard(limit?: number): Promise<{ user: User; progress: UserProgress }[]>;
  getFriendsLeaderboard(userId: string): Promise<{ user: User; progress: UserProgress }[]>;
  getCircleLeaderboard(circleId: string): Promise<{ user: User; progress: UserProgress }[]>;
  
  // Custom Scenarios
  createCustomScenario(data: InsertCustomScenario): Promise<CustomScenario>;
  updateCustomScenario(id: string, data: Partial<InsertCustomScenario>): Promise<CustomScenario | undefined>;
  deleteCustomScenario(id: string): Promise<void>;
  getCustomScenario(id: string): Promise<CustomScenario | undefined>;
  getUserCustomScenarios(userId: string): Promise<CustomScenario[]>;
  getPublicScenarios(category?: string, limit?: number): Promise<{ scenario: CustomScenario; creator: User }[]>;
  incrementScenarioUsage(id: string): Promise<void>;
  rateScenario(userId: string, scenarioId: string, rating: number): Promise<ScenarioRating>;
  getScenarioRating(userId: string, scenarioId: string): Promise<ScenarioRating | undefined>;
  
  // Community Posts
  createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost>;
  getCommunityFeed(limit?: number, offset?: number): Promise<{ post: CommunityPost; user: User; reactionCounts: Record<string, number>; commentCount: number; userReaction?: string }[]>;
  
  // Post Reactions
  addPostReaction(reaction: InsertPostReaction): Promise<PostReaction>;
  removePostReaction(postId: string, userId: string): Promise<void>;
  getPostReactionCounts(postId: string): Promise<Record<string, number>>;
  getUserReaction(postId: string, userId: string): Promise<PostReaction | undefined>;
  
  // Post Comments
  createPostComment(comment: InsertPostComment): Promise<PostComment>;
  getPostComments(postId: string): Promise<{ comment: PostComment; user: User }[]>;
  deletePostComment(commentId: string, userId: string): Promise<void>;
  getPostCommentCount(postId: string): Promise<number>;
  
  // Wheel Rewards
  getActiveWheelRewards(): Promise<WheelReward[]>;
  createWheelReward(reward: InsertWheelReward): Promise<WheelReward>;
  getUserTodaySpin(userId: string): Promise<DailyWheelSpin | undefined>;
  createDailyWheelSpin(spin: InsertDailyWheelSpin): Promise<DailyWheelSpin>;
  getWheelRewardsCount(): Promise<number>;
  
  // Best Moments
  createBestMoment(moment: InsertBestMoment): Promise<BestMoment>;
  getUserBestMoments(userId: string, limit?: number): Promise<BestMoment[]>;
  getPublicBestMoments(userId: string): Promise<BestMoment[]>;
  getBestMoment(id: string): Promise<BestMoment | undefined>;
  updateBestMomentVisibility(id: string, isPublic: boolean): Promise<BestMoment | undefined>;
  incrementBestMomentViewCount(id: string): Promise<void>;
  
  // Daily Login Rewards
  getDailyLoginRewards(): Promise<DailyLoginReward[]>;
  getDailyLoginReward(day: number): Promise<DailyLoginReward | undefined>;
  createDailyLoginReward(reward: InsertDailyLoginReward): Promise<DailyLoginReward>;
  getUserLoginRewardsForCycle(userId: string, cycleStartDate: Date): Promise<UserLoginReward[]>;
  claimLoginReward(data: InsertUserLoginReward): Promise<UserLoginReward>;
  getLatestUserLoginReward(userId: string): Promise<UserLoginReward | undefined>;
  
  // Mood Check-ins
  getTodayMoodCheckIn(userId: string): Promise<MoodCheckIn | undefined>;
  createMoodCheckIn(data: InsertMoodCheckIn): Promise<MoodCheckIn>;
  getMoodHistory(userId: string, days: number): Promise<MoodCheckIn[]>;
  
  // Weekly Challenges
  getActiveWeeklyChallenges(): Promise<WeeklyChallenge[]>;
  getWeeklyChallenge(id: string): Promise<WeeklyChallenge | undefined>;
  createWeeklyChallenge(challenge: InsertWeeklyChallenge): Promise<WeeklyChallenge>;
  getUserWeeklyChallengeProgress(userId: string, challengeId: string): Promise<UserWeeklyChallengeProgress | undefined>;
  getUserAllWeeklyChallengeProgress(userId: string): Promise<{ progress: UserWeeklyChallengeProgress; challenge: WeeklyChallenge }[]>;
  createUserWeeklyChallengeProgress(progress: InsertUserWeeklyChallengeProgress): Promise<UserWeeklyChallengeProgress>;
  updateUserWeeklyChallengeProgress(id: string, updates: Partial<InsertUserWeeklyChallengeProgress>): Promise<UserWeeklyChallengeProgress | undefined>;
  countUncompletedWeeklyChallenges(userId: string): Promise<number>;
  
  // Story Mode
  getStoryChapters(): Promise<StoryChapter[]>;
  getStoryChapter(id: string): Promise<StoryChapter | undefined>;
  createStoryChapter(chapter: InsertStoryChapter): Promise<StoryChapter>;
  getUserStoryProgress(userId: string): Promise<UserStoryProgress[]>;
  getUserStoryProgressForChapter(userId: string, chapterId: string): Promise<UserStoryProgress | undefined>;
  createUserStoryProgress(progress: InsertUserStoryProgress): Promise<UserStoryProgress>;
  updateUserStoryProgress(id: string, updates: Partial<InsertUserStoryProgress>): Promise<UserStoryProgress | undefined>;
  
  // Seasonal Events
  getActiveSeasonalEvent(): Promise<SeasonalEvent | undefined>;
  getSeasonalEvent(id: string): Promise<SeasonalEvent | undefined>;
  createSeasonalEvent(event: InsertSeasonalEvent): Promise<SeasonalEvent>;
  getSeasonalRewards(eventId: string): Promise<SeasonalReward[]>;
  createSeasonalReward(reward: InsertSeasonalReward): Promise<SeasonalReward>;
  getUserSeasonalProgress(userId: string, eventId: string): Promise<UserSeasonalProgress | undefined>;
  createUserSeasonalProgress(progress: InsertUserSeasonalProgress): Promise<UserSeasonalProgress>;
  updateUserSeasonalProgress(id: string, updates: Partial<InsertUserSeasonalProgress>): Promise<UserSeasonalProgress | undefined>;

  // Direct Messaging
  getDmConversations(userId: string): Promise<any[]>;
  getDmConversation(conversationId: string): Promise<any | undefined>;
  findDmConversation(userId1: string, userId2: string): Promise<any | undefined>;
  createDmConversation(data: any): Promise<any>;
  getDmMessages(conversationId: string): Promise<any[]>;
  createDirectMessage(data: any): Promise<any>;
  updateDmConversationTimestamp(conversationId: string): Promise<void>;

  // Mentorship
  getUserMentorships(userId: string): Promise<any[]>;
  getAvailableMentors(userId: string): Promise<any[]>;
  getPendingMentorRequests(userId: string): Promise<any[]>;
  createMentorship(data: any): Promise<any>;
  getMentorshipById(id: string): Promise<any | undefined>;
  updateMentorship(id: string, updates: any): Promise<any | undefined>;

  // Voice Journal
  getVoiceJournals(userId: string): Promise<any[]>;
  createVoiceJournal(data: any): Promise<any>;

  // Gratitude Entries
  getGratitudeEntries(userId: string): Promise<any[]>;
  createGratitudeEntry(data: any): Promise<any>;

  // Calm Sessions
  getCalmSessions(userId: string): Promise<any[]>;
  createCalmSession(data: any): Promise<any>;

  // Mood Streaks
  getMoodStreaks(userId: string): Promise<any[]>;
  createMoodStreak(data: any): Promise<any>;

  // Circle Challenges
  createCircleChallenge(challenge: InsertCircleChallenge): Promise<CircleChallenge>;
  getCircleChallenges(circleId: string): Promise<CircleChallenge[]>;
  getCircleChallenge(id: string): Promise<CircleChallenge | undefined>;
  getActiveCircleChallengesForUser(userId: string): Promise<{ challenge: CircleChallenge; circle: Circle }[]>;
  joinCircleChallenge(data: InsertCircleChallengeProgress): Promise<CircleChallengeProgress>;
  getCircleChallengeProgress(challengeId: string, userId: string): Promise<CircleChallengeProgress | undefined>;
  updateCircleChallengeProgress(challengeId: string, userId: string, progress: number): Promise<CircleChallengeProgress | undefined>;
  getCircleChallengeLeaderboard(challengeId: string): Promise<{ user: User; progress: CircleChallengeProgress }[]>;

  // Weekly Tournaments
  createTournament(tournament: InsertWeeklyTournament): Promise<WeeklyTournament>;
  getTournament(id: string): Promise<WeeklyTournament | undefined>;
  getActiveTournament(): Promise<WeeklyTournament | undefined>;
  getUpcomingTournaments(): Promise<WeeklyTournament[]>;
  getTournamentLeaderboard(tournamentId: string, limit?: number): Promise<{ user: User; participant: TournamentParticipant }[]>;
  joinTournament(tournamentId: string, userId: string): Promise<TournamentParticipant>;
  getTournamentParticipant(tournamentId: string, userId: string): Promise<TournamentParticipant | undefined>;
  updateTournamentScore(tournamentId: string, userId: string, scoreToAdd: number): Promise<TournamentParticipant | undefined>;
  getUserTournamentRank(tournamentId: string, userId: string): Promise<{ rank: number; totalParticipants: number } | undefined>;

  // Duo Practice Sessions
  createDuoSession(hostUserId: string, partnerUserId: string, scenarioId: string): Promise<DuoSession>;
  getDuoSession(sessionId: string): Promise<DuoSession | undefined>;
  getPendingDuoInvitations(userId: string): Promise<{ session: DuoSession; host: User }[]>;
  getActiveDuoSessions(userId: string): Promise<{ session: DuoSession; partner: User }[]>;
  acceptDuoInvitation(sessionId: string, userId: string): Promise<DuoSession | undefined>;
  addDuoMessage(data: InsertDuoMessage): Promise<DuoMessage>;
  getDuoMessages(sessionId: string): Promise<DuoMessage[]>;
  updateDuoSession(sessionId: string, updates: Partial<InsertDuoSession>): Promise<DuoSession | undefined>;
  completeDuoSession(sessionId: string, hostScore: number, partnerScore: number): Promise<DuoSession | undefined>;

  // Mini-Games
  getMiniGamePlaysToday(userId: string, gameType?: string): Promise<number>;
  createMiniGameSession(session: InsertMiniGameSession): Promise<MiniGameSession>;
  completeMiniGameSession(sessionId: string, score: number, duration: number, rewardItemId?: string, rewardXp?: number, rewardPp?: number): Promise<MiniGameSession | undefined>;
  getMiniGameSessions(userId: string, limit?: number): Promise<MiniGameSession[]>;
  getRewardableCosmetic(userId: string, rarity: string): Promise<CosmeticItem | undefined>;

  // Beta Signups
  createBetaSignup(signup: InsertBetaSignup): Promise<BetaSignup>;
  getBetaSignups(): Promise<BetaSignup[]>;
  getBetaSignupCount(): Promise<number>;

  // Testimonials
  getTestimonials(): Promise<Testimonial[]>;
  getApprovedTestimonials(): Promise<Testimonial[]>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: string, updates: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: string): Promise<void>;

  // Prototype feedback (internal)
  getPrototypeFeedback(limit?: number): Promise<PrototypeFeedback[]>;

  // Analytics
  getAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalBetaSignups: number;
    totalSessions: number;
    recentSignups: BetaSignup[];
    usersByDay: { date: string; count: number }[];
  }>;

  // User Feedback
  createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  getUserFeedback(limit?: number): Promise<UserFeedback[]>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async createUser(userData: Partial<UpsertUser>): Promise<User> {
    const [user] = await db.insert(users).values(userData as any).returning();
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUser(userId: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserStripeCustomerId(userId: string, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getStripeSubscriptionByCustomerId(customerId: string): Promise<any | null> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE customer = ${customerId} AND status IN ('active', 'trialing') ORDER BY created DESC LIMIT 1`
    );
    return result.rows[0] || null;
  }

  async getStripeProductsWithPrices(): Promise<any[]> {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC
      `
    );
    return result.rows;
  }

  async getStripeProductById(productId: string): Promise<any | null> {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId} LIMIT 1`
    );
    return result.rows[0] || null;
  }

  // Progress
  async getProgress(userId: string): Promise<UserProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.userId, userId));
    return progress;
  }

  async createProgress(progress: InsertUserProgress): Promise<UserProgress> {
    const [created] = await db.insert(userProgress).values(progress).returning();
    return created;
  }

  async updateProgress(userId: string, updates: Partial<InsertUserProgress>): Promise<UserProgress | undefined> {
    const [updated] = await db
      .update(userProgress)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(userProgress.userId, userId))
      .returning();
    return updated;
  }

  // Practice Sessions
  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const [created] = await db.insert(practiceSessions).values(session).returning();
    return created;
  }

  async getPracticeSessions(userId: string, limit = 10): Promise<PracticeSession[]> {
    return db
      .select()
      .from(practiceSessions)
      .where(eq(practiceSessions.userId, userId))
      .orderBy(desc(practiceSessions.createdAt))
      .limit(limit);
  }

  async getPracticeSessionsInDateRange(userId: string, startDate: Date, endDate: Date): Promise<PracticeSession[]> {
    return db
      .select()
      .from(practiceSessions)
      .where(
        and(
          eq(practiceSessions.userId, userId),
          gte(practiceSessions.createdAt, startDate),
          lte(practiceSessions.createdAt, endDate)
        )
      )
      .orderBy(desc(practiceSessions.createdAt));
  }

  async getTodayPracticeSessionCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM practice_sessions 
          WHERE user_id = ${userId} 
          AND created_at >= ${today.toISOString()} 
          AND created_at < ${tomorrow.toISOString()}`
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  // Daily Capsules
  async getDailyCapsule(userId: string, date: Date): Promise<DailyCapsule | undefined> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const capsules = await db
      .select()
      .from(dailyCapsules)
      .where(eq(dailyCapsules.userId, userId))
      .orderBy(desc(dailyCapsules.createdAt))
      .limit(1);
    
    const capsule = capsules[0];
    if (capsule && capsule.capsuleDate) {
      const capsuleDate = new Date(capsule.capsuleDate);
      if (capsuleDate >= startOfDay && capsuleDate <= endOfDay) {
        return capsule;
      }
    }
    return undefined;
  }

  async createDailyCapsule(capsule: InsertDailyCapsule): Promise<DailyCapsule> {
    const [created] = await db.insert(dailyCapsules).values(capsule).returning();
    return created;
  }

  async updateDailyCapsule(id: string, updates: Partial<InsertDailyCapsule>): Promise<DailyCapsule | undefined> {
    const [updated] = await db
      .update(dailyCapsules)
      .set(updates)
      .where(eq(dailyCapsules.id, id))
      .returning();
    return updated;
  }

  // Conversations
  async getConversation(userId: string): Promise<Conversation | undefined> {
    const [conversation] = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(1);
    return conversation;
  }

  async getAllConversations(userId: string, limit: number = 50): Promise<Conversation[]> {
    return db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [created] = await db.insert(conversations).values(conversation).returning();
    return created;
  }

  async updateConversation(id: string, updates: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updated] = await db
      .update(conversations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(conversations.id, id))
      .returning();
    return updated;
  }

  // Shop
  async getShopItems(): Promise<CosmeticItem[]> {
    return db.select().from(cosmeticItems).where(eq(cosmeticItems.isActive, true));
  }

  async getShopItem(id: string): Promise<CosmeticItem | undefined> {
    const [item] = await db.select().from(cosmeticItems).where(eq(cosmeticItems.id, id));
    return item;
  }

  // Inventory
  async getUserInventory(userId: string): Promise<{ item: CosmeticItem }[]> {
    const items = await db
      .select({ item: cosmeticItems })
      .from(userInventory)
      .innerJoin(cosmeticItems, eq(userInventory.itemId, cosmeticItems.id))
      .where(eq(userInventory.userId, userId));
    return items;
  }

  async getUserInventoryIds(userId: string): Promise<string[]> {
    const items = await db
      .select({ itemId: userInventory.itemId })
      .from(userInventory)
      .where(eq(userInventory.userId, userId));
    return items.map(i => i.itemId);
  }

  async addToInventory(inventory: InsertUserInventory): Promise<UserInventoryItem> {
    const [created] = await db.insert(userInventory).values(inventory).returning();
    return created;
  }

  // Equipped Items
  async getEquippedItems(userId: string): Promise<(EquippedItem & { item: CosmeticItem })[]> {
    const items = await db
      .select({
        id: equippedItems.id,
        userId: equippedItems.userId,
        itemId: equippedItems.itemId,
        category: equippedItems.category,
        equippedAt: equippedItems.equippedAt,
        item: cosmeticItems,
      })
      .from(equippedItems)
      .innerJoin(cosmeticItems, eq(equippedItems.itemId, cosmeticItems.id))
      .where(eq(equippedItems.userId, userId));
    return items;
  }

  async equipItem(item: InsertEquippedItem): Promise<EquippedItem> {
    // First unequip any existing item in the same category
    await db.delete(equippedItems).where(
      and(
        eq(equippedItems.userId, item.userId),
        eq(equippedItems.category, item.category)
      )
    );
    // Then equip the new item
    const [created] = await db.insert(equippedItems).values(item).returning();
    return created;
  }

  // Avatar Settings
  async getUserAvatarSettings(userId: string): Promise<UserAvatarSettings | undefined> {
    const [settings] = await db.select().from(userAvatarSettings).where(eq(userAvatarSettings.userId, userId));
    return settings;
  }

  async upsertUserAvatarSettings(settings: InsertUserAvatarSettings): Promise<UserAvatarSettings> {
    const existing = await this.getUserAvatarSettings(settings.userId);
    if (existing) {
      const [updated] = await db
        .update(userAvatarSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(userAvatarSettings.userId, settings.userId))
        .returning();
      return updated;
    }
    const [created] = await db.insert(userAvatarSettings).values(settings).returning();
    return created;
  }

  // Avatar Presets
  async getAvatarPresets(userId: string): Promise<AvatarPreset[]> {
    return db
      .select()
      .from(avatarPresets)
      .where(eq(avatarPresets.userId, userId))
      .orderBy(desc(avatarPresets.createdAt));
  }

  async getAvatarPreset(id: string): Promise<AvatarPreset | undefined> {
    const [preset] = await db.select().from(avatarPresets).where(eq(avatarPresets.id, id));
    return preset;
  }

  async createAvatarPreset(preset: InsertAvatarPreset): Promise<AvatarPreset> {
    const [created] = await db.insert(avatarPresets).values(preset).returning();
    return created;
  }

  async updateAvatarPreset(id: string, updates: Partial<InsertAvatarPreset>): Promise<AvatarPreset | undefined> {
    const [updated] = await db
      .update(avatarPresets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(avatarPresets.id, id))
      .returning();
    return updated;
  }

  async deleteAvatarPreset(id: string): Promise<void> {
    await db.delete(avatarPresets).where(eq(avatarPresets.id, id));
  }

  async setDefaultAvatarPreset(userId: string, presetId: string): Promise<void> {
    await db
      .update(avatarPresets)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(avatarPresets.userId, userId));
    
    await db
      .update(avatarPresets)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(avatarPresets.id, presetId));
    
    await db
      .update(userAvatarSettings)
      .set({ activePresetId: presetId, updatedAt: new Date() })
      .where(eq(userAvatarSettings.userId, userId));
  }

  async countUserAvatarPresets(userId: string): Promise<number> {
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM avatar_presets WHERE user_id = ${userId}`
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  // Badges
  async getBadges(): Promise<Badge[]> {
    return db.select().from(badges);
  }

  async getUserBadges(userId: string): Promise<{ badge: Badge; earnedAt: Date }[]> {
    const result = await db
      .select({ badge: badges, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId));
    return result.map(r => ({ badge: r.badge, earnedAt: r.earnedAt! }));
  }

  async awardBadge(userBadge: InsertUserBadge): Promise<UserBadge> {
    const [created] = await db.insert(userBadges).values(userBadge).returning();
    return created;
  }

  // Subscriptions
  async getSubscription(userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.userId, userId))
      .returning();
    return updated;
  }

  // Rehearsals
  async getRehearsal(id: string): Promise<Rehearsal | undefined> {
    const [rehearsal] = await db.select().from(rehearsals).where(eq(rehearsals.id, id));
    return rehearsal;
  }

  async getRehearsals(userId: string, limit = 10): Promise<Rehearsal[]> {
    return db
      .select()
      .from(rehearsals)
      .where(eq(rehearsals.userId, userId))
      .orderBy(desc(rehearsals.createdAt))
      .limit(limit);
  }

  async createRehearsal(rehearsal: InsertRehearsal): Promise<Rehearsal> {
    const [created] = await db.insert(rehearsals).values(rehearsal).returning();
    return created;
  }

  async updateRehearsal(id: string, updates: Partial<InsertRehearsal>): Promise<Rehearsal | undefined> {
    const [updated] = await db
      .update(rehearsals)
      .set(updates)
      .where(eq(rehearsals.id, id))
      .returning();
    return updated;
  }

  // Gifts
  async createGift(gift: InsertGift): Promise<Gift> {
    const [created] = await db.insert(gifts).values(gift).returning();
    return created;
  }

  async getGift(id: string): Promise<Gift | undefined> {
    const [gift] = await db.select().from(gifts).where(eq(gifts.id, id));
    return gift;
  }

  async getReceivedGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; sender: User }[]> {
    const result = await db
      .select({ gift: gifts, item: cosmeticItems, sender: users })
      .from(gifts)
      .innerJoin(cosmeticItems, eq(gifts.itemId, cosmeticItems.id))
      .innerJoin(users, eq(gifts.fromUserId, users.id))
      .where(eq(gifts.toUserId, userId))
      .orderBy(desc(gifts.createdAt));
    return result;
  }

  async getSentGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; recipient: User }[]> {
    const result = await db
      .select({ gift: gifts, item: cosmeticItems, recipient: users })
      .from(gifts)
      .innerJoin(cosmeticItems, eq(gifts.itemId, cosmeticItems.id))
      .innerJoin(users, eq(gifts.toUserId, users.id))
      .where(eq(gifts.fromUserId, userId))
      .orderBy(desc(gifts.createdAt));
    return result;
  }

  async getPendingGifts(userId: string): Promise<{ gift: Gift; item: CosmeticItem; sender: User }[]> {
    const result = await db
      .select({ gift: gifts, item: cosmeticItems, sender: users })
      .from(gifts)
      .innerJoin(cosmeticItems, eq(gifts.itemId, cosmeticItems.id))
      .innerJoin(users, eq(gifts.fromUserId, users.id))
      .where(and(eq(gifts.toUserId, userId), eq(gifts.status, "pending")))
      .orderBy(desc(gifts.createdAt));
    return result;
  }

  async updateGiftStatus(giftId: string, status: string): Promise<Gift | undefined> {
    const [updated] = await db
      .update(gifts)
      .set({ status })
      .where(eq(gifts.id, giftId))
      .returning();
    return updated;
  }

  async removeFromInventory(userId: string, itemId: string): Promise<void> {
    await db.delete(userInventory).where(
      and(
        eq(userInventory.userId, userId),
        eq(userInventory.itemId, itemId)
      )
    );
  }

  // Voice Clones
  async getUserVoiceClones(userId: string): Promise<VoiceClone[]> {
    return db
      .select()
      .from(voiceClones)
      .where(and(eq(voiceClones.userId, userId), eq(voiceClones.isActive, true)))
      .orderBy(desc(voiceClones.createdAt));
  }

  async getVoiceClone(id: string): Promise<VoiceClone | undefined> {
    const [voice] = await db
      .select()
      .from(voiceClones)
      .where(eq(voiceClones.id, id));
    return voice;
  }

  async createVoiceClone(data: InsertVoiceClone): Promise<VoiceClone> {
    const [created] = await db.insert(voiceClones).values(data).returning();
    return created;
  }

  async updateVoiceClone(id: string, updates: Partial<InsertVoiceClone>): Promise<VoiceClone | undefined> {
    const [updated] = await db
      .update(voiceClones)
      .set(updates)
      .where(eq(voiceClones.id, id))
      .returning();
    return updated;
  }

  async deleteVoiceClone(id: string): Promise<void> {
    await db.update(voiceClones).set({ isActive: false }).where(eq(voiceClones.id, id));
  }

  async getDefaultVoice(userId: string): Promise<VoiceClone | undefined> {
    const [voice] = await db
      .select()
      .from(voiceClones)
      .where(and(eq(voiceClones.userId, userId), eq(voiceClones.isDefault, true), eq(voiceClones.isActive, true)));
    return voice;
  }

  async setDefaultVoiceClone(userId: string, voiceCloneId: string): Promise<void> {
    await db
      .update(voiceClones)
      .set({ isDefault: false })
      .where(eq(voiceClones.userId, userId));
    
    await db
      .update(voiceClones)
      .set({ isDefault: true })
      .where(eq(voiceClones.id, voiceCloneId));
  }

  // Voice Clone Samples
  async getVoiceCloneSamples(voiceCloneId: string): Promise<VoiceCloneSample[]> {
    return db
      .select()
      .from(voiceCloneSamples)
      .where(eq(voiceCloneSamples.voiceCloneId, voiceCloneId))
      .orderBy(desc(voiceCloneSamples.createdAt));
  }

  async createVoiceCloneSample(data: InsertVoiceCloneSample): Promise<VoiceCloneSample> {
    const [created] = await db.insert(voiceCloneSamples).values(data).returning();
    return created;
  }

  async deleteVoiceCloneSamples(voiceCloneId: string): Promise<void> {
    await db.delete(voiceCloneSamples).where(eq(voiceCloneSamples.voiceCloneId, voiceCloneId));
  }

  // Voice Preferences
  async getUserVoicePreferences(userId: string): Promise<UserVoicePreference | undefined> {
    const [prefs] = await db
      .select()
      .from(userVoicePreferences)
      .where(eq(userVoicePreferences.userId, userId));
    return prefs;
  }

  async upsertUserVoicePreferences(userId: string, data: Partial<InsertUserVoicePreference>): Promise<UserVoicePreference> {
    const [upserted] = await db
      .insert(userVoicePreferences)
      .values({ userId, selectedVoiceId: data.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM", ...data })
      .onConflictDoUpdate({
        target: userVoicePreferences.userId,
        set: { ...data, updatedAt: new Date() },
      })
      .returning();
    return upserted;
  }

  // Friendships
  async createFriendship(friendship: InsertFriendship): Promise<Friendship> {
    const [created] = await db.insert(friendships).values(friendship).returning();
    return created;
  }

  async getFriendship(userId: string, friendId: string): Promise<Friendship | undefined> {
    const [friendship] = await db
      .select()
      .from(friendships)
      .where(
        or(
          and(eq(friendships.userId, userId), eq(friendships.friendId, friendId)),
          and(eq(friendships.userId, friendId), eq(friendships.friendId, userId))
        )
      );
    return friendship;
  }

  async getFriendshipById(id: string): Promise<Friendship | undefined> {
    const [friendship] = await db.select().from(friendships).where(eq(friendships.id, id));
    return friendship;
  }

  async getFriends(userId: string): Promise<{ friendship: Friendship; friend: User }[]> {
    const result = await db
      .select({ friendship: friendships, friend: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.friendId, users.id))
      .where(and(eq(friendships.userId, userId), eq(friendships.status, "accepted")));
    
    const reverseResult = await db
      .select({ friendship: friendships, friend: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(and(eq(friendships.friendId, userId), eq(friendships.status, "accepted")));
    
    return [...result, ...reverseResult];
  }

  async getPendingFriendRequests(userId: string): Promise<{ friendship: Friendship; user: User }[]> {
    const result = await db
      .select({ friendship: friendships, user: users })
      .from(friendships)
      .innerJoin(users, eq(friendships.userId, users.id))
      .where(and(eq(friendships.friendId, userId), eq(friendships.status, "pending")));
    return result;
  }

  async updateFriendshipStatus(id: string, status: string): Promise<Friendship | undefined> {
    const [updated] = await db
      .update(friendships)
      .set({ status })
      .where(eq(friendships.id, id))
      .returning();
    return updated;
  }

  async deleteFriendship(id: string): Promise<void> {
    await db.delete(friendships).where(eq(friendships.id, id));
  }

  // Circles
  async createCircle(circle: InsertCircle): Promise<Circle> {
    const [created] = await db.insert(circles).values(circle).returning();
    return created;
  }

  async getCircle(id: string): Promise<Circle | undefined> {
    const [circle] = await db.select().from(circles).where(eq(circles.id, id));
    return circle;
  }

  async getUserCircles(userId: string): Promise<{ circle: Circle; memberCount: number }[]> {
    const memberCircleIds = await db
      .select({ circleId: circleMembers.circleId })
      .from(circleMembers)
      .where(eq(circleMembers.userId, userId));
    
    const circleIds = memberCircleIds.map(m => m.circleId);
    if (circleIds.length === 0) return [];
    
    const result: { circle: Circle; memberCount: number }[] = [];
    for (const circleId of circleIds) {
      const [circle] = await db.select().from(circles).where(eq(circles.id, circleId));
      if (circle) {
        const countResult = await db.execute(
          sql`SELECT COUNT(*) as count FROM circle_members WHERE circle_id = ${circleId}`
        );
        const memberCount = parseInt(countResult.rows[0]?.count as string || '0', 10);
        result.push({ circle, memberCount });
      }
    }
    return result;
  }

  async getPublicCircles(): Promise<Circle[]> {
    return db.select().from(circles).where(eq(circles.isPublic, true));
  }

  async deleteCircle(id: string): Promise<void> {
    await db.delete(circleMembers).where(eq(circleMembers.circleId, id));
    await db.delete(circles).where(eq(circles.id, id));
  }

  // Circle Members
  async addCircleMember(member: InsertCircleMember): Promise<CircleMember> {
    const [created] = await db.insert(circleMembers).values(member).returning();
    return created;
  }

  async getCircleMembers(circleId: string): Promise<{ member: CircleMember; user: User }[]> {
    const result = await db
      .select({ member: circleMembers, user: users })
      .from(circleMembers)
      .innerJoin(users, eq(circleMembers.userId, users.id))
      .where(eq(circleMembers.circleId, circleId));
    return result;
  }

  async getCircleMember(circleId: string, userId: string): Promise<CircleMember | undefined> {
    const [member] = await db
      .select()
      .from(circleMembers)
      .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)));
    return member;
  }

  async removeCircleMember(circleId: string, userId: string): Promise<void> {
    await db.delete(circleMembers).where(
      and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId))
    );
  }

  // Challenges
  async createChallenge(challenge: InsertChallenge): Promise<Challenge> {
    const [created] = await db.insert(challenges).values(challenge).returning();
    return created;
  }

  async getChallenge(id: string): Promise<Challenge | undefined> {
    const [challenge] = await db.select().from(challenges).where(eq(challenges.id, id));
    return challenge;
  }

  async getActiveChallenges(): Promise<Challenge[]> {
    const now = new Date();
    return db
      .select()
      .from(challenges)
      .where(
        and(
          eq(challenges.isActive, true),
          lte(challenges.startDate, now),
          gte(challenges.endDate, now)
        )
      )
      .orderBy(desc(challenges.createdAt));
  }

  // Challenge Participants
  async joinChallenge(participant: InsertChallengeParticipant): Promise<ChallengeParticipant> {
    const [created] = await db.insert(challengeParticipants).values(participant).returning();
    return created;
  }

  async getChallengeParticipation(challengeId: string, userId: string): Promise<ChallengeParticipant | undefined> {
    const [participant] = await db
      .select()
      .from(challengeParticipants)
      .where(and(eq(challengeParticipants.challengeId, challengeId), eq(challengeParticipants.userId, userId)));
    return participant;
  }

  async getUserChallengeProgress(userId: string): Promise<{ participant: ChallengeParticipant; challenge: Challenge }[]> {
    const result = await db
      .select({ participant: challengeParticipants, challenge: challenges })
      .from(challengeParticipants)
      .innerJoin(challenges, eq(challengeParticipants.challengeId, challenges.id))
      .where(eq(challengeParticipants.userId, userId))
      .orderBy(desc(challengeParticipants.joinedAt));
    return result;
  }

  async updateChallengeProgress(id: string, progress: number, completed: boolean): Promise<ChallengeParticipant | undefined> {
    const [updated] = await db
      .update(challengeParticipants)
      .set({ progress, completed })
      .where(eq(challengeParticipants.id, id))
      .returning();
    return updated;
  }

  // Leaderboards
  async getGlobalLeaderboard(limit = 50): Promise<{ user: User; progress: UserProgress }[]> {
    const result = await db
      .select({ user: users, progress: userProgress })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .orderBy(desc(userProgress.totalXp))
      .limit(limit);
    return result;
  }

  async getFriendsLeaderboard(userId: string): Promise<{ user: User; progress: UserProgress }[]> {
    const friends = await this.getFriends(userId);
    const friendIds = friends.map(f => f.friend.id);
    friendIds.push(userId);
    
    if (friendIds.length === 0) return [];
    
    const result = await db
      .select({ user: users, progress: userProgress })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(inArray(users.id, friendIds))
      .orderBy(desc(userProgress.totalXp));
    return result;
  }

  async getCircleLeaderboard(circleId: string): Promise<{ user: User; progress: UserProgress }[]> {
    const members = await this.getCircleMembers(circleId);
    const memberIds = members.map(m => m.user.id);
    
    if (memberIds.length === 0) return [];
    
    const result = await db
      .select({ user: users, progress: userProgress })
      .from(userProgress)
      .innerJoin(users, eq(userProgress.userId, users.id))
      .where(inArray(users.id, memberIds))
      .orderBy(desc(userProgress.totalXp));
    return result;
  }

  // Custom Scenarios
  async createCustomScenario(data: InsertCustomScenario): Promise<CustomScenario> {
    const [created] = await db.insert(customScenarios).values(data).returning();
    return created;
  }

  async updateCustomScenario(id: string, data: Partial<InsertCustomScenario>): Promise<CustomScenario | undefined> {
    const [updated] = await db
      .update(customScenarios)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(customScenarios.id, id))
      .returning();
    return updated;
  }

  async deleteCustomScenario(id: string): Promise<void> {
    await db.delete(scenarioRatings).where(eq(scenarioRatings.scenarioId, id));
    await db.delete(customScenarios).where(eq(customScenarios.id, id));
  }

  async getCustomScenario(id: string): Promise<CustomScenario | undefined> {
    const [scenario] = await db.select().from(customScenarios).where(eq(customScenarios.id, id));
    return scenario;
  }

  async getUserCustomScenarios(userId: string): Promise<CustomScenario[]> {
    return db
      .select()
      .from(customScenarios)
      .where(eq(customScenarios.creatorId, userId))
      .orderBy(desc(customScenarios.createdAt));
  }

  async getPublicScenarios(category?: string, limit = 50): Promise<{ scenario: CustomScenario; creator: User }[]> {
    let query = db
      .select({ scenario: customScenarios, creator: users })
      .from(customScenarios)
      .innerJoin(users, eq(customScenarios.creatorId, users.id))
      .where(eq(customScenarios.isPublic, true))
      .orderBy(desc(customScenarios.usageCount), desc(customScenarios.rating))
      .limit(limit);
    
    if (category) {
      return db
        .select({ scenario: customScenarios, creator: users })
        .from(customScenarios)
        .innerJoin(users, eq(customScenarios.creatorId, users.id))
        .where(and(eq(customScenarios.isPublic, true), eq(customScenarios.category, category)))
        .orderBy(desc(customScenarios.usageCount), desc(customScenarios.rating))
        .limit(limit);
    }
    
    return query;
  }

  async incrementScenarioUsage(id: string): Promise<void> {
    await db.execute(
      sql`UPDATE custom_scenarios SET usage_count = COALESCE(usage_count, 0) + 1 WHERE id = ${id}`
    );
  }

  async rateScenario(userId: string, scenarioId: string, rating: number): Promise<ScenarioRating> {
    const existing = await this.getScenarioRating(userId, scenarioId);
    
    if (existing) {
      const [updated] = await db
        .update(scenarioRatings)
        .set({ rating })
        .where(eq(scenarioRatings.id, existing.id))
        .returning();
      
      await this.updateScenarioAverageRating(scenarioId);
      return updated;
    }
    
    const [created] = await db.insert(scenarioRatings).values({ userId, scenarioId, rating }).returning();
    await this.updateScenarioAverageRating(scenarioId);
    return created;
  }

  async getScenarioRating(userId: string, scenarioId: string): Promise<ScenarioRating | undefined> {
    const [rating] = await db
      .select()
      .from(scenarioRatings)
      .where(and(eq(scenarioRatings.userId, userId), eq(scenarioRatings.scenarioId, scenarioId)));
    return rating;
  }

  private async updateScenarioAverageRating(scenarioId: string): Promise<void> {
    const result = await db.execute(
      sql`SELECT AVG(rating)::real as avg_rating, COUNT(*)::integer as count FROM scenario_ratings WHERE scenario_id = ${scenarioId}`
    );
    const avgRating = result.rows[0]?.avg_rating as number | null;
    const count = parseInt(result.rows[0]?.count as string || '0', 10);
    
    await db
      .update(customScenarios)
      .set({ rating: avgRating, ratingCount: count, updatedAt: new Date() })
      .where(eq(customScenarios.id, scenarioId));
  }

  // Community Posts
  async createCommunityPost(post: InsertCommunityPost): Promise<CommunityPost> {
    const [created] = await db.insert(communityPosts).values(post).returning();
    return created;
  }

  async getCommunityFeed(limit = 20, offset = 0): Promise<{ post: CommunityPost; user: User; reactionCounts: Record<string, number>; commentCount: number; userReaction?: string }[]> {
    const posts = await db
      .select({ post: communityPosts, user: users })
      .from(communityPosts)
      .innerJoin(users, eq(communityPosts.userId, users.id))
      .orderBy(desc(communityPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const result = await Promise.all(
      posts.map(async ({ post, user }) => {
        const reactionCounts = await this.getPostReactionCounts(post.id);
        const commentCount = await this.getPostCommentCount(post.id);
        return { post, user, reactionCounts, commentCount };
      })
    );

    return result;
  }

  // Post Reactions
  async addPostReaction(reaction: InsertPostReaction): Promise<PostReaction> {
    await db.delete(postReactions).where(
      and(eq(postReactions.postId, reaction.postId), eq(postReactions.userId, reaction.userId))
    );
    const [created] = await db.insert(postReactions).values(reaction).returning();
    return created;
  }

  async removePostReaction(postId: string, userId: string): Promise<void> {
    await db.delete(postReactions).where(
      and(eq(postReactions.postId, postId), eq(postReactions.userId, userId))
    );
  }

  async getPostReactionCounts(postId: string): Promise<Record<string, number>> {
    const result = await db.execute(
      sql`SELECT type, COUNT(*)::integer as count FROM post_reactions WHERE post_id = ${postId} GROUP BY type`
    );
    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.type as string] = parseInt(row.count as string, 10);
    }
    return counts;
  }

  async getUserReaction(postId: string, userId: string): Promise<PostReaction | undefined> {
    const [reaction] = await db
      .select()
      .from(postReactions)
      .where(and(eq(postReactions.postId, postId), eq(postReactions.userId, userId)));
    return reaction;
  }

  // Post Comments
  async createPostComment(comment: InsertPostComment): Promise<PostComment> {
    const [created] = await db.insert(postComments).values(comment).returning();
    return created;
  }

  async getPostComments(postId: string): Promise<{ comment: PostComment; user: User }[]> {
    return db
      .select({ comment: postComments, user: users })
      .from(postComments)
      .innerJoin(users, eq(postComments.userId, users.id))
      .where(eq(postComments.postId, postId))
      .orderBy(postComments.createdAt);
  }

  async deletePostComment(commentId: string, userId: string): Promise<void> {
    await db.delete(postComments).where(
      and(eq(postComments.id, commentId), eq(postComments.userId, userId))
    );
  }

  async getPostCommentCount(postId: string): Promise<number> {
    const result = await db.execute(
      sql`SELECT COUNT(*)::integer as count FROM post_comments WHERE post_id = ${postId}`
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  // Wheel Rewards
  async getActiveWheelRewards(): Promise<WheelReward[]> {
    return db
      .select()
      .from(wheelRewards)
      .where(eq(wheelRewards.isActive, true));
  }

  async createWheelReward(reward: InsertWheelReward): Promise<WheelReward> {
    const [created] = await db.insert(wheelRewards).values(reward).returning();
    return created;
  }

  async getUserTodaySpin(userId: string): Promise<DailyWheelSpin | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [spin] = await db
      .select()
      .from(dailyWheelSpins)
      .where(
        and(
          eq(dailyWheelSpins.userId, userId),
          gte(dailyWheelSpins.spinDate, today),
          lte(dailyWheelSpins.spinDate, tomorrow)
        )
      );
    return spin;
  }

  async createDailyWheelSpin(spin: InsertDailyWheelSpin): Promise<DailyWheelSpin> {
    const [created] = await db.insert(dailyWheelSpins).values(spin).returning();
    return created;
  }

  async getWheelRewardsCount(): Promise<number> {
    const result = await db.execute(
      sql`SELECT COUNT(*)::integer as count FROM wheel_rewards`
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  // Best Moments
  async createBestMoment(moment: InsertBestMoment): Promise<BestMoment> {
    const [created] = await db.insert(bestMoments).values(moment).returning();
    return created;
  }

  async getUserBestMoments(userId: string, limit = 20): Promise<BestMoment[]> {
    return db
      .select()
      .from(bestMoments)
      .where(eq(bestMoments.userId, userId))
      .orderBy(desc(bestMoments.createdAt))
      .limit(limit);
  }

  async getPublicBestMoments(userId: string): Promise<BestMoment[]> {
    return db
      .select()
      .from(bestMoments)
      .where(and(eq(bestMoments.userId, userId), eq(bestMoments.isPublic, true)))
      .orderBy(desc(bestMoments.createdAt));
  }

  async getBestMoment(id: string): Promise<BestMoment | undefined> {
    const [moment] = await db.select().from(bestMoments).where(eq(bestMoments.id, id));
    return moment;
  }

  async updateBestMomentVisibility(id: string, isPublic: boolean): Promise<BestMoment | undefined> {
    const [updated] = await db
      .update(bestMoments)
      .set({ isPublic })
      .where(eq(bestMoments.id, id))
      .returning();
    return updated;
  }

  async incrementBestMomentViewCount(id: string): Promise<void> {
    await db.execute(
      sql`UPDATE best_moments SET view_count = COALESCE(view_count, 0) + 1 WHERE id = ${id}`
    );
  }

  // Daily Login Rewards
  async getDailyLoginRewards(): Promise<DailyLoginReward[]> {
    return db.select().from(dailyLoginRewards).orderBy(dailyLoginRewards.day);
  }

  async getDailyLoginReward(day: number): Promise<DailyLoginReward | undefined> {
    const [reward] = await db
      .select()
      .from(dailyLoginRewards)
      .where(eq(dailyLoginRewards.day, day));
    return reward;
  }

  async createDailyLoginReward(reward: InsertDailyLoginReward): Promise<DailyLoginReward> {
    const [created] = await db.insert(dailyLoginRewards).values(reward).returning();
    return created;
  }

  async getUserLoginRewardsForCycle(userId: string, cycleStartDate: Date): Promise<UserLoginReward[]> {
    return db
      .select()
      .from(userLoginRewards)
      .where(
        and(
          eq(userLoginRewards.userId, userId),
          eq(userLoginRewards.cycleStartDate, cycleStartDate)
        )
      )
      .orderBy(userLoginRewards.claimedDay);
  }

  async claimLoginReward(data: InsertUserLoginReward): Promise<UserLoginReward> {
    const [created] = await db.insert(userLoginRewards).values(data).returning();
    return created;
  }

  async getLatestUserLoginReward(userId: string): Promise<UserLoginReward | undefined> {
    const [latest] = await db
      .select()
      .from(userLoginRewards)
      .where(eq(userLoginRewards.userId, userId))
      .orderBy(desc(userLoginRewards.claimedAt))
      .limit(1);
    return latest;
  }

  // Mood Check-ins
  async getTodayMoodCheckIn(userId: string): Promise<MoodCheckIn | undefined> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [checkIn] = await db
      .select()
      .from(moodCheckIns)
      .where(
        and(
          eq(moodCheckIns.userId, userId),
          gte(moodCheckIns.checkInDate, today),
          lte(moodCheckIns.checkInDate, tomorrow)
        )
      )
      .orderBy(desc(moodCheckIns.createdAt))
      .limit(1);
    return checkIn;
  }

  async createMoodCheckIn(data: InsertMoodCheckIn): Promise<MoodCheckIn> {
    const [created] = await db.insert(moodCheckIns).values(data).returning();
    return created;
  }

  async getMoodHistory(userId: string, days: number): Promise<MoodCheckIn[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    return db
      .select()
      .from(moodCheckIns)
      .where(
        and(
          eq(moodCheckIns.userId, userId),
          gte(moodCheckIns.checkInDate, startDate)
        )
      )
      .orderBy(desc(moodCheckIns.checkInDate));
  }

  // Weekly Challenges
  async getActiveWeeklyChallenges(): Promise<WeeklyChallenge[]> {
    const now = new Date();
    return db
      .select()
      .from(weeklyChallenges)
      .where(
        and(
          eq(weeklyChallenges.isActive, true),
          lte(weeklyChallenges.weekStartDate, now),
          gte(weeklyChallenges.weekEndDate, now)
        )
      )
      .orderBy(weeklyChallenges.createdAt);
  }

  async getWeeklyChallenge(id: string): Promise<WeeklyChallenge | undefined> {
    const [challenge] = await db.select().from(weeklyChallenges).where(eq(weeklyChallenges.id, id));
    return challenge;
  }

  async createWeeklyChallenge(challenge: InsertWeeklyChallenge): Promise<WeeklyChallenge> {
    const [created] = await db.insert(weeklyChallenges).values(challenge).returning();
    return created;
  }

  async getUserWeeklyChallengeProgress(userId: string, challengeId: string): Promise<UserWeeklyChallengeProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userWeeklyChallengeProgress)
      .where(
        and(
          eq(userWeeklyChallengeProgress.userId, userId),
          eq(userWeeklyChallengeProgress.challengeId, challengeId)
        )
      );
    return progress;
  }

  async getUserAllWeeklyChallengeProgress(userId: string): Promise<{ progress: UserWeeklyChallengeProgress; challenge: WeeklyChallenge }[]> {
    const now = new Date();
    return db
      .select({ progress: userWeeklyChallengeProgress, challenge: weeklyChallenges })
      .from(userWeeklyChallengeProgress)
      .innerJoin(weeklyChallenges, eq(userWeeklyChallengeProgress.challengeId, weeklyChallenges.id))
      .where(
        and(
          eq(userWeeklyChallengeProgress.userId, userId),
          lte(weeklyChallenges.weekStartDate, now),
          gte(weeklyChallenges.weekEndDate, now)
        )
      );
  }

  async createUserWeeklyChallengeProgress(progress: InsertUserWeeklyChallengeProgress): Promise<UserWeeklyChallengeProgress> {
    const [created] = await db.insert(userWeeklyChallengeProgress).values(progress).returning();
    return created;
  }

  async updateUserWeeklyChallengeProgress(id: string, updates: Partial<InsertUserWeeklyChallengeProgress>): Promise<UserWeeklyChallengeProgress | undefined> {
    const [updated] = await db
      .update(userWeeklyChallengeProgress)
      .set(updates)
      .where(eq(userWeeklyChallengeProgress.id, id))
      .returning();
    return updated;
  }

  async countUncompletedWeeklyChallenges(userId: string): Promise<number> {
    const now = new Date();
    const result = await db.execute(
      sql`SELECT COUNT(*) as count FROM weekly_challenges wc
          LEFT JOIN user_weekly_challenge_progress uwcp 
            ON uwcp.challenge_id = wc.id AND uwcp.user_id = ${userId}
          WHERE wc.is_active = true 
            AND wc.week_start_date <= ${now.toISOString()}
            AND wc.week_end_date >= ${now.toISOString()}
            AND (uwcp.completed IS NULL OR uwcp.completed = false)`
    );
    return parseInt(result.rows[0]?.count as string || '0', 10);
  }

  // Story Mode
  async getStoryChapters(): Promise<StoryChapter[]> {
    return db
      .select()
      .from(storyChapters)
      .orderBy(storyChapters.chapterNumber);
  }

  async getStoryChapter(id: string): Promise<StoryChapter | undefined> {
    const [chapter] = await db.select().from(storyChapters).where(eq(storyChapters.id, id));
    return chapter;
  }

  async createStoryChapter(chapter: InsertStoryChapter): Promise<StoryChapter> {
    const [created] = await db.insert(storyChapters).values(chapter).returning();
    return created;
  }

  async getUserStoryProgress(userId: string): Promise<UserStoryProgress[]> {
    return db
      .select()
      .from(userStoryProgress)
      .where(eq(userStoryProgress.userId, userId));
  }

  async getUserStoryProgressForChapter(userId: string, chapterId: string): Promise<UserStoryProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userStoryProgress)
      .where(
        and(
          eq(userStoryProgress.userId, userId),
          eq(userStoryProgress.chapterId, chapterId)
        )
      );
    return progress;
  }

  async createUserStoryProgress(progress: InsertUserStoryProgress): Promise<UserStoryProgress> {
    const [created] = await db.insert(userStoryProgress).values(progress).returning();
    return created;
  }

  async updateUserStoryProgress(id: string, updates: Partial<InsertUserStoryProgress>): Promise<UserStoryProgress | undefined> {
    const [updated] = await db
      .update(userStoryProgress)
      .set(updates)
      .where(eq(userStoryProgress.id, id))
      .returning();
    return updated;
  }

  // Seasonal Events
  async getActiveSeasonalEvent(): Promise<SeasonalEvent | undefined> {
    const now = new Date();
    const [event] = await db
      .select()
      .from(seasonalEvents)
      .where(
        and(
          eq(seasonalEvents.isActive, true),
          lte(seasonalEvents.startDate, now),
          gte(seasonalEvents.endDate, now)
        )
      )
      .orderBy(desc(seasonalEvents.startDate))
      .limit(1);
    return event;
  }

  async getSeasonalEvent(id: string): Promise<SeasonalEvent | undefined> {
    const [event] = await db.select().from(seasonalEvents).where(eq(seasonalEvents.id, id));
    return event;
  }

  async createSeasonalEvent(event: InsertSeasonalEvent): Promise<SeasonalEvent> {
    const [created] = await db.insert(seasonalEvents).values(event).returning();
    return created;
  }

  async getSeasonalRewards(eventId: string): Promise<SeasonalReward[]> {
    return db
      .select()
      .from(seasonalRewards)
      .where(eq(seasonalRewards.eventId, eventId))
      .orderBy(seasonalRewards.requiredProgress);
  }

  async createSeasonalReward(reward: InsertSeasonalReward): Promise<SeasonalReward> {
    const [created] = await db.insert(seasonalRewards).values(reward).returning();
    return created;
  }

  async getUserSeasonalProgress(userId: string, eventId: string): Promise<UserSeasonalProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userSeasonalProgress)
      .where(
        and(
          eq(userSeasonalProgress.userId, userId),
          eq(userSeasonalProgress.eventId, eventId)
        )
      );
    return progress;
  }

  async createUserSeasonalProgress(progress: InsertUserSeasonalProgress): Promise<UserSeasonalProgress> {
    const [created] = await db.insert(userSeasonalProgress).values(progress).returning();
    return created;
  }

  async updateUserSeasonalProgress(id: string, updates: Partial<InsertUserSeasonalProgress>): Promise<UserSeasonalProgress | undefined> {
    const [updated] = await db
      .update(userSeasonalProgress)
      .set(updates)
      .where(eq(userSeasonalProgress.id, id))
      .returning();
    return updated;
  }

  // Direct Messaging
  async getDmConversation(conversationId: string): Promise<any | undefined> {
    const [convo] = await db
      .select()
      .from(dmConversations)
      .where(eq(dmConversations.id, conversationId));
    return convo;
  }

  async getDmConversations(userId: string): Promise<any[]> {
    const convos = await db
      .select()
      .from(dmConversations)
      .where(
        or(
          eq(dmConversations.participant1Id, userId),
          eq(dmConversations.participant2Id, userId)
        )
      )
      .orderBy(desc(dmConversations.lastMessageAt));
    
    const result = await Promise.all(
      convos.map(async (convo) => {
        const otherUserId = convo.participant1Id === userId ? convo.participant2Id : convo.participant1Id;
        const otherUser = await this.getUser(otherUserId);
        const messages = await db
          .select()
          .from(directMessages)
          .where(eq(directMessages.conversationId, convo.id))
          .orderBy(desc(directMessages.createdAt))
          .limit(1);
        return {
          ...convo,
          otherUser,
          lastMessage: messages[0],
          unreadCount: 0,
        };
      })
    );
    return result;
  }

  async findDmConversation(userId1: string, userId2: string): Promise<any | undefined> {
    const [convo] = await db
      .select()
      .from(dmConversations)
      .where(
        or(
          and(
            eq(dmConversations.participant1Id, userId1),
            eq(dmConversations.participant2Id, userId2)
          ),
          and(
            eq(dmConversations.participant1Id, userId2),
            eq(dmConversations.participant2Id, userId1)
          )
        )
      );
    return convo;
  }

  async createDmConversation(data: any): Promise<any> {
    const [convo] = await db.insert(dmConversations).values(data).returning();
    return convo;
  }

  async getDmMessages(conversationId: string): Promise<any[]> {
    const msgs = await db
      .select()
      .from(directMessages)
      .where(eq(directMessages.conversationId, conversationId))
      .orderBy(directMessages.createdAt);
    
    const result = await Promise.all(
      msgs.map(async (msg) => {
        const sender = await this.getUser(msg.senderId);
        return { ...msg, sender };
      })
    );
    return result;
  }

  async createDirectMessage(data: any): Promise<any> {
    const [msg] = await db.insert(directMessages).values(data).returning();
    return msg;
  }

  async updateDmConversationTimestamp(conversationId: string): Promise<void> {
    await db
      .update(dmConversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(dmConversations.id, conversationId));
  }

  // Mentorship
  async getUserMentorships(userId: string): Promise<any[]> {
    const ships = await db
      .select()
      .from(mentorships)
      .where(
        or(
          eq(mentorships.mentorId, userId),
          eq(mentorships.menteeId, userId)
        )
      );
    
    const result = await Promise.all(
      ships.map(async (ship) => {
        const mentor = ship.mentorId !== userId ? await this.getUser(ship.mentorId) : undefined;
        const mentee = ship.menteeId !== userId ? await this.getUser(ship.menteeId) : undefined;
        return { ...ship, mentor, mentee };
      })
    );
    return result;
  }

  async getAvailableMentors(userId: string): Promise<any[]> {
    const allProgress = await db
      .select()
      .from(userProgress)
      .where(gte(userProgress.level, 10))
      .orderBy(desc(userProgress.totalXp))
      .limit(20);
    
    const result = await Promise.all(
      allProgress
        .filter(p => p.userId !== userId)
        .map(async (p) => {
          const user = await this.getUser(p.userId);
          return {
            user,
            level: p.level || 1,
            totalXp: p.totalXp || 0,
            feedbackCount: 0,
          };
        })
    );
    return result.filter(r => r.user);
  }

  async getPendingMentorRequests(userId: string): Promise<any[]> {
    const pending = await db
      .select()
      .from(mentorships)
      .where(
        and(
          eq(mentorships.mentorId, userId),
          eq(mentorships.status, "pending")
        )
      );
    
    const result = await Promise.all(
      pending.map(async (ship) => {
        const mentee = await this.getUser(ship.menteeId);
        return { ...ship, mentee };
      })
    );
    return result;
  }

  async createMentorship(data: any): Promise<any> {
    const [ship] = await db.insert(mentorships).values(data).returning();
    return ship;
  }

  async getMentorshipById(id: string): Promise<any | undefined> {
    const [ship] = await db
      .select()
      .from(mentorships)
      .where(eq(mentorships.id, id));
    return ship;
  }

  async updateMentorship(id: string, updates: any): Promise<any | undefined> {
    const [ship] = await db
      .update(mentorships)
      .set(updates)
      .where(eq(mentorships.id, id))
      .returning();
    return ship;
  }

  // Voice Journal
  async getVoiceJournals(userId: string): Promise<any[]> {
    return db
      .select()
      .from(voiceJournals)
      .where(eq(voiceJournals.userId, userId))
      .orderBy(desc(voiceJournals.journalDate));
  }

  async createVoiceJournal(data: any): Promise<any> {
    const [entry] = await db.insert(voiceJournals).values(data).returning();
    return entry;
  }

  // Gratitude Entries
  async getGratitudeEntries(userId: string): Promise<any[]> {
    return db
      .select()
      .from(gratitudeEntries)
      .where(eq(gratitudeEntries.userId, userId))
      .orderBy(desc(gratitudeEntries.entryDate));
  }

  async createGratitudeEntry(data: any): Promise<any> {
    const [entry] = await db.insert(gratitudeEntries).values(data).returning();
    return entry;
  }

  // Calm Sessions
  async getCalmSessions(userId: string): Promise<any[]> {
    return db
      .select()
      .from(calmSessions)
      .where(eq(calmSessions.userId, userId))
      .orderBy(desc(calmSessions.createdAt));
  }

  async createCalmSession(data: any): Promise<any> {
    const [session] = await db.insert(calmSessions).values(data).returning();
    return session;
  }

  // Mood Streaks
  async getMoodStreaks(userId: string): Promise<any[]> {
    return db
      .select()
      .from(moodStreaks)
      .where(eq(moodStreaks.userId, userId))
      .orderBy(desc(moodStreaks.moodDate));
  }

  async createMoodStreak(data: any): Promise<any> {
    const [entry] = await db.insert(moodStreaks).values(data).returning();
    return entry;
  }

  // Pronunciation
  async getPronunciationPhrases(category?: string): Promise<any[]> {
    if (category) {
      return db
        .select()
        .from(pronunciationPhrases)
        .where(eq(pronunciationPhrases.category, category))
        .orderBy(pronunciationPhrases.difficulty);
    }
    return db
      .select()
      .from(pronunciationPhrases)
      .orderBy(pronunciationPhrases.difficulty);
  }

  async getPronunciationPhraseById(id: string): Promise<any | undefined> {
    const [phrase] = await db
      .select()
      .from(pronunciationPhrases)
      .where(eq(pronunciationPhrases.id, id));
    return phrase;
  }

  async createPronunciationPhrase(data: any): Promise<any> {
    const [phrase] = await db.insert(pronunciationPhrases).values(data).returning();
    return phrase;
  }

  async getUserPronunciationAttempts(userId: string): Promise<any[]> {
    const attempts = await db
      .select()
      .from(pronunciationAttempts)
      .where(eq(pronunciationAttempts.userId, userId))
      .orderBy(desc(pronunciationAttempts.createdAt));
    
    const result = await Promise.all(
      attempts.map(async (attempt) => {
        const phrase = await this.getPronunciationPhraseById(attempt.phraseId);
        return { ...attempt, phrase };
      })
    );
    return result;
  }

  async createPronunciationAttempt(data: any): Promise<any> {
    const [attempt] = await db.insert(pronunciationAttempts).values(data).returning();
    return attempt;
  }

  async getPhraseBestAttempt(userId: string, phraseId: string): Promise<any | undefined> {
    const [best] = await db
      .select()
      .from(pronunciationAttempts)
      .where(
        and(
          eq(pronunciationAttempts.userId, userId),
          eq(pronunciationAttempts.phraseId, phraseId)
        )
      )
      .orderBy(desc(pronunciationAttempts.accuracyScore))
      .limit(1);
    return best;
  }

  // Circle Challenges
  async createCircleChallenge(challenge: InsertCircleChallenge): Promise<CircleChallenge> {
    const [created] = await db.insert(circleChallenges).values(challenge).returning();
    return created;
  }

  async getCircleChallenges(circleId: string): Promise<CircleChallenge[]> {
    return db
      .select()
      .from(circleChallenges)
      .where(eq(circleChallenges.circleId, circleId))
      .orderBy(desc(circleChallenges.createdAt));
  }

  async getCircleChallenge(id: string): Promise<CircleChallenge | undefined> {
    const [challenge] = await db.select().from(circleChallenges).where(eq(circleChallenges.id, id));
    return challenge;
  }

  async getActiveCircleChallengesForUser(userId: string): Promise<{ challenge: CircleChallenge; circle: Circle }[]> {
    const userCircles = await this.getUserCircles(userId);
    const circleIds = userCircles.map(c => c.circle.id);
    
    if (circleIds.length === 0) return [];
    
    const now = new Date();
    const activeChallenges: { challenge: CircleChallenge; circle: Circle }[] = [];
    
    for (const { circle } of userCircles) {
      const challenges = await db
        .select()
        .from(circleChallenges)
        .where(
          and(
            eq(circleChallenges.circleId, circle.id),
            lte(circleChallenges.startDate, now),
            gte(circleChallenges.endDate, now)
          )
        );
      
      for (const challenge of challenges) {
        activeChallenges.push({ challenge, circle });
      }
    }
    
    return activeChallenges;
  }

  async joinCircleChallenge(data: InsertCircleChallengeProgress): Promise<CircleChallengeProgress> {
    const [created] = await db.insert(circleChallengeProgress).values(data).returning();
    return created;
  }

  async getCircleChallengeProgress(challengeId: string, userId: string): Promise<CircleChallengeProgress | undefined> {
    const [progress] = await db
      .select()
      .from(circleChallengeProgress)
      .where(
        and(
          eq(circleChallengeProgress.challengeId, challengeId),
          eq(circleChallengeProgress.userId, userId)
        )
      );
    return progress;
  }

  async updateCircleChallengeProgress(challengeId: string, userId: string, progress: number): Promise<CircleChallengeProgress | undefined> {
    const existing = await this.getCircleChallengeProgress(challengeId, userId);
    if (!existing) return undefined;
    
    const challenge = await this.getCircleChallenge(challengeId);
    const completed = challenge ? progress >= challenge.goal : false;
    
    const [updated] = await db
      .update(circleChallengeProgress)
      .set({ 
        progress, 
        completed,
        completedAt: completed && !existing.completed ? new Date() : existing.completedAt
      })
      .where(eq(circleChallengeProgress.id, existing.id))
      .returning();
    return updated;
  }

  async getCircleChallengeLeaderboard(challengeId: string): Promise<{ user: User; progress: CircleChallengeProgress }[]> {
    return db
      .select({ user: users, progress: circleChallengeProgress })
      .from(circleChallengeProgress)
      .innerJoin(users, eq(circleChallengeProgress.userId, users.id))
      .where(eq(circleChallengeProgress.challengeId, challengeId))
      .orderBy(desc(circleChallengeProgress.progress));
  }

  // Weekly Tournaments
  async createTournament(tournament: InsertWeeklyTournament): Promise<WeeklyTournament> {
    const [created] = await db.insert(weeklyTournaments).values(tournament).returning();
    return created;
  }

  async getTournament(id: string): Promise<WeeklyTournament | undefined> {
    const [tournament] = await db.select().from(weeklyTournaments).where(eq(weeklyTournaments.id, id));
    return tournament;
  }

  async getActiveTournament(): Promise<WeeklyTournament | undefined> {
    const now = new Date();
    const [tournament] = await db
      .select()
      .from(weeklyTournaments)
      .where(
        and(
          eq(weeklyTournaments.isActive, true),
          lte(weeklyTournaments.startDate, now),
          gte(weeklyTournaments.endDate, now)
        )
      )
      .orderBy(desc(weeklyTournaments.startDate))
      .limit(1);
    return tournament;
  }

  async getUpcomingTournaments(): Promise<WeeklyTournament[]> {
    const now = new Date();
    return db
      .select()
      .from(weeklyTournaments)
      .where(
        and(
          eq(weeklyTournaments.isActive, true),
          gte(weeklyTournaments.startDate, now)
        )
      )
      .orderBy(weeklyTournaments.startDate)
      .limit(5);
  }

  async getTournamentLeaderboard(tournamentId: string, limit = 50): Promise<{ user: User; participant: TournamentParticipant }[]> {
    return db
      .select({ user: users, participant: tournamentParticipants })
      .from(tournamentParticipants)
      .innerJoin(users, eq(tournamentParticipants.userId, users.id))
      .where(eq(tournamentParticipants.tournamentId, tournamentId))
      .orderBy(desc(tournamentParticipants.score))
      .limit(limit);
  }

  async joinTournament(tournamentId: string, userId: string): Promise<TournamentParticipant> {
    const [created] = await db.insert(tournamentParticipants).values({
      tournamentId,
      userId,
      score: 0,
      practiceCount: 0,
    }).returning();
    return created;
  }

  async getTournamentParticipant(tournamentId: string, userId: string): Promise<TournamentParticipant | undefined> {
    const [participant] = await db
      .select()
      .from(tournamentParticipants)
      .where(
        and(
          eq(tournamentParticipants.tournamentId, tournamentId),
          eq(tournamentParticipants.userId, userId)
        )
      );
    return participant;
  }

  async updateTournamentScore(tournamentId: string, userId: string, scoreToAdd: number): Promise<TournamentParticipant | undefined> {
    const existing = await this.getTournamentParticipant(tournamentId, userId);
    if (!existing) return undefined;

    const [updated] = await db
      .update(tournamentParticipants)
      .set({
        score: (existing.score || 0) + scoreToAdd,
        practiceCount: (existing.practiceCount || 0) + 1,
      })
      .where(eq(tournamentParticipants.id, existing.id))
      .returning();
    return updated;
  }

  async getUserTournamentRank(tournamentId: string, userId: string): Promise<{ rank: number; totalParticipants: number } | undefined> {
    const participant = await this.getTournamentParticipant(tournamentId, userId);
    if (!participant) return undefined;

    const result = await db.execute(
      sql`SELECT COUNT(*) as total FROM tournament_participants WHERE tournament_id = ${tournamentId}`
    );
    const totalParticipants = parseInt(result.rows[0]?.total as string || '0', 10);

    const rankResult = await db.execute(
      sql`SELECT COUNT(*) + 1 as rank FROM tournament_participants 
          WHERE tournament_id = ${tournamentId} AND score > ${participant.score || 0}`
    );
    const rank = parseInt(rankResult.rows[0]?.rank as string || '1', 10);

    return { rank, totalParticipants };
  }

  // Duo Practice Sessions
  async createDuoSession(hostUserId: string, partnerUserId: string, scenarioId: string): Promise<DuoSession> {
    const [created] = await db.insert(duoSessions).values({
      hostUserId,
      partnerUserId,
      scenarioId,
      status: "pending",
      currentTurn: "host",
      hostScore: 0,
      partnerScore: 0,
    }).returning();
    return created;
  }

  async getDuoSession(sessionId: string): Promise<DuoSession | undefined> {
    const [session] = await db.select().from(duoSessions).where(eq(duoSessions.id, sessionId));
    return session;
  }

  async getPendingDuoInvitations(userId: string): Promise<{ session: DuoSession; host: User }[]> {
    return db
      .select({ session: duoSessions, host: users })
      .from(duoSessions)
      .innerJoin(users, eq(duoSessions.hostUserId, users.id))
      .where(
        and(
          eq(duoSessions.partnerUserId, userId),
          eq(duoSessions.status, "pending")
        )
      )
      .orderBy(desc(duoSessions.createdAt));
  }

  async getActiveDuoSessions(userId: string): Promise<{ session: DuoSession; partner: User }[]> {
    const sessionsAsHost = await db
      .select({ session: duoSessions, partner: users })
      .from(duoSessions)
      .innerJoin(users, eq(duoSessions.partnerUserId, users.id))
      .where(
        and(
          eq(duoSessions.hostUserId, userId),
          eq(duoSessions.status, "active")
        )
      );
    
    const sessionsAsPartner = await db
      .select({ session: duoSessions, partner: users })
      .from(duoSessions)
      .innerJoin(users, eq(duoSessions.hostUserId, users.id))
      .where(
        and(
          eq(duoSessions.partnerUserId, userId),
          eq(duoSessions.status, "active")
        )
      );
    
    return [...sessionsAsHost, ...sessionsAsPartner].sort(
      (a, b) => new Date(b.session.createdAt!).getTime() - new Date(a.session.createdAt!).getTime()
    );
  }

  async acceptDuoInvitation(sessionId: string, userId: string): Promise<DuoSession | undefined> {
    const session = await this.getDuoSession(sessionId);
    if (!session || session.partnerUserId !== userId || session.status !== "pending") {
      return undefined;
    }
    
    const [updated] = await db
      .update(duoSessions)
      .set({ status: "active", startedAt: new Date() })
      .where(eq(duoSessions.id, sessionId))
      .returning();
    return updated;
  }

  async addDuoMessage(data: InsertDuoMessage): Promise<DuoMessage> {
    const [created] = await db.insert(duoMessages).values(data).returning();
    return created;
  }

  async getDuoMessages(sessionId: string): Promise<DuoMessage[]> {
    return db
      .select()
      .from(duoMessages)
      .where(eq(duoMessages.sessionId, sessionId))
      .orderBy(duoMessages.createdAt);
  }

  async updateDuoSession(sessionId: string, updates: Partial<InsertDuoSession>): Promise<DuoSession | undefined> {
    const [updated] = await db
      .update(duoSessions)
      .set(updates)
      .where(eq(duoSessions.id, sessionId))
      .returning();
    return updated;
  }

  async completeDuoSession(sessionId: string, hostScore: number, partnerScore: number): Promise<DuoSession | undefined> {
    const [updated] = await db
      .update(duoSessions)
      .set({
        status: "completed",
        hostScore,
        partnerScore,
        completedAt: new Date(),
      })
      .where(eq(duoSessions.id, sessionId))
      .returning();
    return updated;
  }

  // Mini-Games
  async getMiniGamePlaysToday(userId: string, gameType?: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const conditions = [
      eq(miniGameSessions.userId, userId),
      eq(miniGameSessions.completed, true),
      gte(miniGameSessions.playedAt, startOfDay)
    ];
    
    if (gameType) {
      conditions.push(eq(miniGameSessions.gameType, gameType));
    }
    
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(miniGameSessions)
      .where(and(...conditions));
    
    return result[0]?.count || 0;
  }

  async createMiniGameSession(session: InsertMiniGameSession): Promise<MiniGameSession> {
    const [created] = await db.insert(miniGameSessions).values(session).returning();
    return created;
  }

  async completeMiniGameSession(
    sessionId: string, 
    score: number, 
    duration: number,
    rewardItemId?: string,
    rewardXp?: number,
    rewardPp?: number
  ): Promise<MiniGameSession | undefined> {
    const [updated] = await db
      .update(miniGameSessions)
      .set({
        score,
        duration,
        completed: true,
        rewardItemId,
        rewardXp: rewardXp || 0,
        rewardPp: rewardPp || 0,
      })
      .where(eq(miniGameSessions.id, sessionId))
      .returning();
    return updated;
  }

  async getMiniGameSessions(userId: string, limit: number = 20): Promise<MiniGameSession[]> {
    return db
      .select()
      .from(miniGameSessions)
      .where(eq(miniGameSessions.userId, userId))
      .orderBy(desc(miniGameSessions.playedAt))
      .limit(limit);
  }

  async createMoodCheckin(userId: string, mood: string, intensity: number, note: string | null, weatherEffect: string): Promise<MoodCheckin | undefined> {
    const [checkin] = await db
      .insert(moodCheckins)
      .values({ userId, mood, intensity, note, weatherEffect })
      .returning();
    return checkin;
  }

  async getLatestMoodCheckin(userId: string): Promise<MoodCheckin | undefined> {
    const [checkin] = await db
      .select()
      .from(moodCheckins)
      .where(eq(moodCheckins.userId, userId))
      .orderBy(desc(moodCheckins.createdAt))
      .limit(1);
    return checkin;
  }

  async getMoodCheckinHistory(userId: string, limit: number = 7): Promise<MoodCheckin[]> {
    return db
      .select()
      .from(moodCheckins)
      .where(eq(moodCheckins.userId, userId))
      .orderBy(desc(moodCheckins.createdAt))
      .limit(limit);
  }

  async getRewardableCosmetic(userId: string, rarity: string): Promise<CosmeticItem | undefined> {
    const ownedItemIds = await this.getUserInventoryIds(userId);
    const hiddenCategories = ['avatar_accessories'];
    
    const availableItems = await db
      .select()
      .from(cosmeticItems)
      .where(
        and(
          eq(cosmeticItems.rarity, rarity),
          eq(cosmeticItems.isActive, true),
          sql`${cosmeticItems.category} NOT IN (${sql.join(hiddenCategories.map(c => sql`${c}`), sql`, `)})`
        )
      );
    
    const unownedItems = availableItems.filter(item => !ownedItemIds.includes(item.id));
    
    if (unownedItems.length === 0) return undefined;
    
    const randomIndex = Math.floor(Math.random() * unownedItems.length);
    return unownedItems[randomIndex];
  }

  async createBetaSignup(signup: InsertBetaSignup): Promise<BetaSignup> {
    const [created] = await db.insert(betaSignups).values(signup).returning();
    return created;
  }

  async getBetaSignups(): Promise<BetaSignup[]> {
    return await db.select().from(betaSignups).orderBy(desc(betaSignups.createdAt));
  }

  async getBetaSignupCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(betaSignups);
    return Number(result[0]?.count || 0);
  }

  // Testimonials
  async getTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials).orderBy(desc(testimonials.createdAt));
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return await db.select().from(testimonials)
      .where(eq(testimonials.approved, true))
      .orderBy(desc(testimonials.createdAt));
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [created] = await db.insert(testimonials).values(testimonial).returning();
    return created;
  }

  async updateTestimonial(id: string, updates: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [updated] = await db.update(testimonials)
      .set(updates)
      .where(eq(testimonials.id, id))
      .returning();
    return updated;
  }

  async deleteTestimonial(id: string): Promise<void> {
    await db.delete(testimonials).where(eq(testimonials.id, id));
  }

  async getPrototypeFeedback(limit: number = 200): Promise<PrototypeFeedback[]> {
    return await db
      .select()
      .from(prototypeFeedback)
      .orderBy(desc(prototypeFeedback.createdAt))
      .limit(limit);
  }

  async createPrototypeFeedback(entry: InsertPrototypeFeedback): Promise<PrototypeFeedback> {
    const [created] = await db.insert(prototypeFeedback).values(entry).returning();
    return created;
  }

  // Analytics
  async getAnalytics(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalBetaSignups: number;
    totalSessions: number;
    recentSignups: BetaSignup[];
    usersByDay: { date: string; count: number }[];
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [activeUsersResult] = await db.select({ count: sql<number>`count(*)` }).from(users)
      .where(gte(users.updatedAt, sevenDaysAgo));
    const [totalBetaResult] = await db.select({ count: sql<number>`count(*)` }).from(betaSignups);
    const [totalSessionsResult] = await db.select({ count: sql<number>`count(*)` }).from(practiceSessions);
    
    const recentSignups = await db.select().from(betaSignups)
      .orderBy(desc(betaSignups.createdAt))
      .limit(10);

    const usersByDay = await db.select({
      date: sql<string>`DATE(created_at)::text`,
      count: sql<number>`count(*)`
    })
      .from(users)
      .where(gte(users.createdAt, sevenDaysAgo))
      .groupBy(sql`DATE(created_at)`)
      .orderBy(sql`DATE(created_at)`);

    return {
      totalUsers: Number(totalUsersResult?.count || 0),
      activeUsers: Number(activeUsersResult?.count || 0),
      totalBetaSignups: Number(totalBetaResult?.count || 0),
      totalSessions: Number(totalSessionsResult?.count || 0),
      recentSignups,
      usersByDay: usersByDay.map(row => ({ date: row.date, count: Number(row.count) })),
    };
  }

  // User Feedback
  async createUserFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [created] = await db.insert(userFeedback).values(feedback).returning();
    return created;
  }

  async getUserFeedback(limit: number = 50): Promise<UserFeedback[]> {
    return await db.select().from(userFeedback)
      .orderBy(desc(userFeedback.createdAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
