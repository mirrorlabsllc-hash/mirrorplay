import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, index, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table with multi-provider auth support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  passwordHash: varchar("password_hash"), // For email/password auth
  authProvider: varchar("auth_provider").default("email"), // email, google, apple
  authProviderId: varchar("auth_provider_id"), // External provider user ID
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  rpmAvatarUrl: varchar("rpm_avatar_url"),
  role: varchar("role").default("free"), // free, peace_plus, pro_mind
  stripeCustomerId: varchar("stripe_customer_id"),
  emailVerified: boolean("email_verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User progress tracking
export const userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  totalXp: integer("total_xp").default(0),
  totalPp: integer("total_pp").default(0), // Peace Points
  level: integer("level").default(1),
  currentStreak: integer("current_streak").default(0),
  bestStreak: integer("best_streak").default(0),
  lastCheckIn: timestamp("last_check_in"),
  practiceCount: integer("practice_count").default(0),
  voiceOnboardingCompleted: boolean("voice_onboarding_completed").default(false),
  dailyEnergy: integer("daily_energy").default(100),
  maxEnergy: integer("max_energy").default(100),
  lastEnergyRecharge: timestamp("last_energy_recharge"),
  textInputEnabled: boolean("text_input_enabled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Practice sessions
export const practiceSessions = pgTable("practice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  prompt: text("prompt").notNull(),
  response: text("response").notNull(),
  mode: varchar("mode").default("text"), // text or voice
  category: varchar("category"),
  tone: varchar("tone"),
  score: integer("score"),
  tips: text("tips").array(),
  exampleResponses: text("example_responses").array(),
  vocalMetrics: jsonb("vocal_metrics"),
  audioDuration: integer("audio_duration"), // in seconds, for voice mode
  wordsPerMinute: integer("words_per_minute"), // speaking pace, for voice mode
  fillerWordCount: integer("filler_word_count"), // count of filler words, for voice mode
  transcription: text("transcription"), // speech-to-text transcription, for voice mode
  isFavorite: boolean("is_favorite").default(false),
  xpEarned: integer("xp_earned").default(0),
  ppEarned: integer("pp_earned").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily capsules
export const dailyCapsules = pgTable("daily_capsules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: varchar("category").notNull(),
  questions: text("questions").array(),
  selectedQuestionIndex: integer("selected_question_index"),
  completed: boolean("completed").default(false),
  capsuleDate: timestamp("capsule_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI Conversations
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  messages: jsonb("messages").default([]),
  emotionState: varchar("emotion_state").default("calm"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Scenarios for role-play practice
export const scenarios = pgTable("scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // workplace, relationship, co-parenting, general
  difficulty: integer("difficulty").default(1), // 1-5
  requiredLevel: integer("required_level").default(1), // level required to unlock
  phases: jsonb("phases").default([]),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Rehearsal sessions (scenario practice)
export const rehearsals = pgTable("rehearsals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  scenarioId: varchar("scenario_id").notNull().references(() => scenarios.id),
  messages: jsonb("messages").default([]),
  currentPhase: integer("current_phase").default(0),
  escalationLevel: integer("escalation_level").default(1),
  completed: boolean("completed").default(false),
  score: integer("score"),
  feedback: jsonb("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Cosmetic items
export const cosmeticItems = pgTable("cosmetic_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  category: varchar("category").notNull(), // avatar_accessories, backgrounds, themes, sound_badges, quotes, profile_decorations, particle_effects
  rarity: varchar("rarity").default("common"), // common, rare, epic, legendary
  price: integer("price").notNull(), // in Peace Points
  imageUrl: varchar("image_url"),
  metadata: jsonb("metadata"),
  loreOrigin: text("lore_origin"), // Backstory of where item comes from
  loreFlavor: text("lore_flavor"), // Flavor text shown on unlock
  loreCollection: varchar("lore_collection"), // Which collection this belongs to (e.g., "Mystic Forest", "Cosmic Dreams")
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User inventory
export const userInventory = pgTable("user_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  itemId: varchar("item_id").notNull().references(() => cosmeticItems.id),
  purchasedAt: timestamp("purchased_at").defaultNow(),
});

// Equipped items
export const equippedItems = pgTable("equipped_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  category: varchar("category").notNull(),
  itemId: varchar("item_id").notNull().references(() => cosmeticItems.id),
  equippedAt: timestamp("equipped_at").defaultNow(),
});

// Badges/Achievements
export const badges = pgTable("badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  icon: varchar("icon"),
  requirement: jsonb("requirement"),
  xpReward: integer("xp_reward").default(0),
  ppReward: integer("pp_reward").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// User badges
export const userBadges = pgTable("user_badges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  badgeId: varchar("badge_id").notNull().references(() => badges.id),
  earnedAt: timestamp("earned_at").defaultNow(),
});

// Subscriptions
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  tier: varchar("tier").default("free"), // free, peace_plus, pro_mind
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"),
  status: varchar("status").default("inactive"), // active, inactive, cancelled
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Voice clones
export const voiceClones = pgTable("voice_clones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  elevenLabsVoiceId: varchar("elevenlabs_voice_id"),
  name: varchar("name"),
  description: varchar("description"),
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  errorMessage: varchar("error_message"),
  sampleCount: integer("sample_count").default(0),
  isDefault: boolean("is_default").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Avatar customization
export const userAvatarSettings = pgTable("user_avatar_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  skinTone: varchar("skin_tone").default("#fad7c8"),
  hairStyle: varchar("hair_style").default("short"),
  hairColor: varchar("hair_color").default("#3d2314"),
  eyeStyle: varchar("eye_style").default("normal"),
  eyeColor: varchar("eye_color").default("#4a7c59"),
  mouthStyle: varchar("mouth_style").default("smile"),
  faceShape: varchar("face_shape").default("round"),
  accessory: varchar("accessory"),
  accessoryColor: varchar("accessory_color"),
  blush: boolean("blush").default(false),
  freckles: boolean("freckles").default(false),
  avatarConfigV2: jsonb("avatar_config_v2"),
  activePresetId: varchar("active_preset_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const avatarPresets = pgTable("avatar_presets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: varchar("name").notNull().default("My Avatar"),
  config: jsonb("config").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gifts - cosmetic items sent between users
export const gifts = pgTable("gifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  fromUserId: varchar("from_user_id").notNull().references(() => users.id),
  toUserId: varchar("to_user_id").notNull().references(() => users.id),
  itemId: varchar("item_id").notNull().references(() => cosmeticItems.id),
  message: text("message"),
  status: varchar("status").default("pending"), // pending, accepted, rejected
  ppPaid: integer("pp_paid"), // Peace Points paid if bought to gift (for refund on rejection)
  createdAt: timestamp("created_at").defaultNow(),
});

// Mood check-ins for emotional tracking
export const moodCheckIns = pgTable("mood_check_ins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mood: varchar("mood").notNull(), // calm, happy, anxious, frustrated, sad, energized, tired, hopeful
  note: text("note"),
  checkInDate: timestamp("check_in_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  progress: one(userProgress, {
    fields: [users.id],
    references: [userProgress.userId],
  }),
  sessions: many(practiceSessions),
  capsules: many(dailyCapsules),
  conversations: many(conversations),
  rehearsals: many(rehearsals),
  inventory: many(userInventory),
  equipped: many(equippedItems),
  badges: many(userBadges),
  subscription: one(subscriptions, {
    fields: [users.id],
    references: [subscriptions.userId],
  }),
  voiceClone: one(voiceClones, {
    fields: [users.id],
    references: [voiceClones.userId],
  }),
}));

export const userProgressRelations = relations(userProgress, ({ one }) => ({
  user: one(users, {
    fields: [userProgress.userId],
    references: [users.id],
  }),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  user: one(users, {
    fields: [practiceSessions.userId],
    references: [users.id],
  }),
}));

export const dailyCapsulesRelations = relations(dailyCapsules, ({ one }) => ({
  user: one(users, {
    fields: [dailyCapsules.userId],
    references: [users.id],
  }),
}));

export const conversationsRelations = relations(conversations, ({ one }) => ({
  user: one(users, {
    fields: [conversations.userId],
    references: [users.id],
  }),
}));

export const rehearsalsRelations = relations(rehearsals, ({ one }) => ({
  user: one(users, {
    fields: [rehearsals.userId],
    references: [users.id],
  }),
  scenario: one(scenarios, {
    fields: [rehearsals.scenarioId],
    references: [scenarios.id],
  }),
}));

export const userInventoryRelations = relations(userInventory, ({ one }) => ({
  user: one(users, {
    fields: [userInventory.userId],
    references: [users.id],
  }),
  item: one(cosmeticItems, {
    fields: [userInventory.itemId],
    references: [cosmeticItems.id],
  }),
}));

export const equippedItemsRelations = relations(equippedItems, ({ one }) => ({
  user: one(users, {
    fields: [equippedItems.userId],
    references: [users.id],
  }),
  item: one(cosmeticItems, {
    fields: [equippedItems.itemId],
    references: [cosmeticItems.id],
  }),
}));

export const userBadgesRelations = relations(userBadges, ({ one }) => ({
  user: one(users, {
    fields: [userBadges.userId],
    references: [users.id],
  }),
  badge: one(badges, {
    fields: [userBadges.badgeId],
    references: [badges.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  user: one(users, {
    fields: [subscriptions.userId],
    references: [users.id],
  }),
}));

export const voiceClonesRelations = relations(voiceClones, ({ one }) => ({
  user: one(users, {
    fields: [voiceClones.userId],
    references: [users.id],
  }),
}));

// User voice preferences for TTS
export const userVoicePreferences = pgTable("user_voice_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  selectedVoiceId: varchar("selected_voice_id").notNull(),
  ttsEnabled: boolean("tts_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Mood check-ins for weather effects
export const moodCheckins = pgTable("mood_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mood: varchar("mood").notNull(), // calm, happy, anxious, sad, energized, peaceful, stressed, hopeful
  intensity: integer("intensity").default(5), // 1-10 scale
  note: text("note"), // Optional journal entry
  weatherEffect: varchar("weather_effect"), // Derived weather: sunny, rain, snow, clouds, aurora, starry, mist, rainbow
  createdAt: timestamp("created_at").defaultNow(),
});

export const moodCheckinsRelations = relations(moodCheckins, ({ one }) => ({
  user: one(users, {
    fields: [moodCheckins.userId],
    references: [users.id],
  }),
}));

export const userVoicePreferencesRelations = relations(userVoicePreferences, ({ one }) => ({
  user: one(users, {
    fields: [userVoicePreferences.userId],
    references: [users.id],
  }),
}));

// Friendships - friend connections between users
export const friendships = pgTable("friendships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  friendId: varchar("friend_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // pending, accepted, blocked
  createdAt: timestamp("created_at").defaultNow(),
});

// Circles - friend groups
export const circles = pgTable("circles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  ownerId: varchar("owner_id").notNull().references(() => users.id),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Circle members
export const circleMembers = pgTable("circle_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  circleId: varchar("circle_id").notNull().references(() => circles.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").default("member"), // owner, admin, member
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Community challenges
export const challenges = pgTable("challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: varchar("type").default("daily"), // daily, weekly, monthly, special
  goal: integer("goal").notNull(),
  goalType: varchar("goal_type").default("practice_count"), // practice_count, min_score, streak_days
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  rewardXp: integer("reward_xp").default(0),
  rewardPp: integer("reward_pp").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Challenge participants
export const challengeParticipants = pgTable("challenge_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => challenges.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  joinedAt: timestamp("joined_at").defaultNow(),
});

// Relations for social features
export const friendshipsRelations = relations(friendships, ({ one }) => ({
  user: one(users, {
    fields: [friendships.userId],
    references: [users.id],
  }),
  friend: one(users, {
    fields: [friendships.friendId],
    references: [users.id],
  }),
}));

export const circlesRelations = relations(circles, ({ one, many }) => ({
  owner: one(users, {
    fields: [circles.ownerId],
    references: [users.id],
  }),
  members: many(circleMembers),
}));

export const circleMembersRelations = relations(circleMembers, ({ one }) => ({
  circle: one(circles, {
    fields: [circleMembers.circleId],
    references: [circles.id],
  }),
  user: one(users, {
    fields: [circleMembers.userId],
    references: [users.id],
  }),
}));

export const challengesRelations = relations(challenges, ({ many }) => ({
  participants: many(challengeParticipants),
}));

export const challengeParticipantsRelations = relations(challengeParticipants, ({ one }) => ({
  challenge: one(challenges, {
    fields: [challengeParticipants.challengeId],
    references: [challenges.id],
  }),
  user: one(users, {
    fields: [challengeParticipants.userId],
    references: [users.id],
  }),
}));

export const giftsRelations = relations(gifts, ({ one }) => ({
  fromUser: one(users, {
    fields: [gifts.fromUserId],
    references: [users.id],
  }),
  toUser: one(users, {
    fields: [gifts.toUserId],
    references: [users.id],
  }),
  item: one(cosmeticItems, {
    fields: [gifts.itemId],
    references: [cosmeticItems.id],
  }),
}));

export const moodCheckInsRelations = relations(moodCheckIns, ({ one }) => ({
  user: one(users, {
    fields: [moodCheckIns.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserProgressSchema = createInsertSchema(userProgress).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).omit({ id: true, createdAt: true });
export const insertDailyCapsuleSchema = createInsertSchema(dailyCapsules).omit({ id: true, createdAt: true });
export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScenarioSchema = createInsertSchema(scenarios).omit({ id: true, createdAt: true });
export const insertRehearsalSchema = createInsertSchema(rehearsals).omit({ id: true, createdAt: true });
export const insertCosmeticItemSchema = createInsertSchema(cosmeticItems).omit({ id: true, createdAt: true });
export const insertUserInventorySchema = createInsertSchema(userInventory).omit({ id: true, purchasedAt: true });
export const insertEquippedItemSchema = createInsertSchema(equippedItems).omit({ id: true, equippedAt: true });
export const insertBadgeSchema = createInsertSchema(badges).omit({ id: true, createdAt: true });
export const insertUserBadgeSchema = createInsertSchema(userBadges).omit({ id: true, earnedAt: true });
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ id: true, createdAt: true, updatedAt: true });
export const insertVoiceCloneSchema = createInsertSchema(voiceClones).omit({ id: true, createdAt: true });
export const insertGiftSchema = createInsertSchema(gifts).omit({ id: true, createdAt: true });
export const insertUserAvatarSettingsSchema = createInsertSchema(userAvatarSettings).omit({ id: true, createdAt: true, updatedAt: true });
export const insertUserVoicePreferencesSchema = createInsertSchema(userVoicePreferences).omit({ id: true, createdAt: true, updatedAt: true });
export const insertFriendshipSchema = createInsertSchema(friendships).omit({ id: true, createdAt: true });
export const insertCircleSchema = createInsertSchema(circles).omit({ id: true, createdAt: true });
export const insertCircleMemberSchema = createInsertSchema(circleMembers).omit({ id: true, joinedAt: true });
export const insertChallengeSchema = createInsertSchema(challenges).omit({ id: true, createdAt: true });
export const insertChallengeParticipantSchema = createInsertSchema(challengeParticipants).omit({ id: true, joinedAt: true });
export const insertAvatarPresetSchema = createInsertSchema(avatarPresets).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMoodCheckInSchema = createInsertSchema(moodCheckIns).omit({ id: true, createdAt: true });

// Mood types
export const MOOD_TYPES = ["calm", "happy", "anxious", "frustrated", "sad", "energized", "tired", "hopeful"] as const;
export type MoodType = typeof MOOD_TYPES[number];

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type DailyCapsule = typeof dailyCapsules.$inferSelect;
export type InsertDailyCapsule = z.infer<typeof insertDailyCapsuleSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Scenario = typeof scenarios.$inferSelect;
export type InsertScenario = z.infer<typeof insertScenarioSchema>;
export type Rehearsal = typeof rehearsals.$inferSelect;
export type InsertRehearsal = z.infer<typeof insertRehearsalSchema>;
export type CosmeticItem = typeof cosmeticItems.$inferSelect;
export type InsertCosmeticItem = z.infer<typeof insertCosmeticItemSchema>;
export type UserInventoryItem = typeof userInventory.$inferSelect;
export type InsertUserInventory = z.infer<typeof insertUserInventorySchema>;
export type EquippedItem = typeof equippedItems.$inferSelect;
export type InsertEquippedItem = z.infer<typeof insertEquippedItemSchema>;
export type Badge = typeof badges.$inferSelect;
export type InsertBadge = z.infer<typeof insertBadgeSchema>;
export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = z.infer<typeof insertUserBadgeSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type VoiceClone = typeof voiceClones.$inferSelect;
export type InsertVoiceClone = z.infer<typeof insertVoiceCloneSchema>;
export type Gift = typeof gifts.$inferSelect;
export type InsertGift = z.infer<typeof insertGiftSchema>;
export type UserAvatarSettings = typeof userAvatarSettings.$inferSelect;
export type InsertUserAvatarSettings = z.infer<typeof insertUserAvatarSettingsSchema>;
export type UserVoicePreference = typeof userVoicePreferences.$inferSelect;
export type InsertUserVoicePreference = z.infer<typeof insertUserVoicePreferencesSchema>;
export type Friendship = typeof friendships.$inferSelect;
export type InsertFriendship = z.infer<typeof insertFriendshipSchema>;
export type Circle = typeof circles.$inferSelect;
export type InsertCircle = z.infer<typeof insertCircleSchema>;
export type CircleMember = typeof circleMembers.$inferSelect;
export type InsertCircleMember = z.infer<typeof insertCircleMemberSchema>;
export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = z.infer<typeof insertChallengeSchema>;
export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type InsertChallengeParticipant = z.infer<typeof insertChallengeParticipantSchema>;
export type AvatarPreset = typeof avatarPresets.$inferSelect;
export type InsertAvatarPreset = z.infer<typeof insertAvatarPresetSchema>;
export type MoodCheckIn = typeof moodCheckIns.$inferSelect;
export type InsertMoodCheckIn = z.infer<typeof insertMoodCheckInSchema>;

// New mood checkins for weather effects
export type MoodCheckin = typeof moodCheckins.$inferSelect;

// Custom scenarios created by users
export const customScenarios = pgTable("custom_scenarios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  creatorId: varchar("creator_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: varchar("category").notNull(), // workplace, relationships, boundaries, emotional, assertive, mindful, resilience, conflict
  difficulty: varchar("difficulty").default("beginner"), // beginner, intermediate, advanced
  context: text("context").notNull(), // the situation setup
  prompt: text("prompt").notNull(), // what the user should respond to
  sampleResponse: text("sample_response"), // example good response
  tips: text("tips").array(), // tips for responding
  isPublic: boolean("is_public").default(false),
  usageCount: integer("usage_count").default(0),
  rating: real("rating"), // average rating
  ratingCount: integer("rating_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Ratings for custom scenarios
export const scenarioRatings = pgTable("scenario_ratings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull().references(() => customScenarios.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // 1-5
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for custom scenarios
export const customScenariosRelations = relations(customScenarios, ({ one, many }) => ({
  creator: one(users, {
    fields: [customScenarios.creatorId],
    references: [users.id],
  }),
  ratings: many(scenarioRatings),
}));

export const scenarioRatingsRelations = relations(scenarioRatings, ({ one }) => ({
  scenario: one(customScenarios, {
    fields: [scenarioRatings.scenarioId],
    references: [customScenarios.id],
  }),
  user: one(users, {
    fields: [scenarioRatings.userId],
    references: [users.id],
  }),
}));

// Insert schemas for custom scenarios
export const insertCustomScenarioSchema = createInsertSchema(customScenarios).omit({ id: true, createdAt: true, updatedAt: true });
export const insertScenarioRatingSchema = createInsertSchema(scenarioRatings).omit({ id: true, createdAt: true });

// Types for custom scenarios
export type CustomScenario = typeof customScenarios.$inferSelect;
export type InsertCustomScenario = z.infer<typeof insertCustomScenarioSchema>;
export type ScenarioRating = typeof scenarioRatings.$inferSelect;
export type InsertScenarioRating = z.infer<typeof insertScenarioRatingSchema>;

// Question categories
export const QUESTION_CATEGORIES = [
  "workplace",
  "relationships",
  "family",
  "social",
  "self-advocacy",
] as const;

export type QuestionCategory = typeof QUESTION_CATEGORIES[number];

// Tone labels
export const TONE_LABELS = [
  "calm",
  "assertive",
  "empathetic",
  "defensive",
  "aggressive",
  "passive",
  "confident",
  "anxious",
] as const;

export type ToneLabel = typeof TONE_LABELS[number];

// Community Posts
export const communityPosts = pgTable("community_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // achievement, milestone, tip, encouragement, practice_share
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // for badges earned, level reached, streak info, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

// Post Reactions
export const postReactions = pgTable("post_reactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: varchar("type").notNull(), // heart, celebrate, support, inspire
  createdAt: timestamp("created_at").defaultNow(),
});

// Post Comments
export const postComments = pgTable("post_comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  postId: varchar("post_id").notNull().references(() => communityPosts.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for community features
export const communityPostsRelations = relations(communityPosts, ({ one, many }) => ({
  user: one(users, {
    fields: [communityPosts.userId],
    references: [users.id],
  }),
  reactions: many(postReactions),
  comments: many(postComments),
}));

export const postReactionsRelations = relations(postReactions, ({ one }) => ({
  post: one(communityPosts, {
    fields: [postReactions.postId],
    references: [communityPosts.id],
  }),
  user: one(users, {
    fields: [postReactions.userId],
    references: [users.id],
  }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(communityPosts, {
    fields: [postComments.postId],
    references: [communityPosts.id],
  }),
  user: one(users, {
    fields: [postComments.userId],
    references: [users.id],
  }),
}));

// Insert schemas for community
export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true });
export const insertPostReactionSchema = createInsertSchema(postReactions).omit({ id: true, createdAt: true });
export const insertPostCommentSchema = createInsertSchema(postComments).omit({ id: true, createdAt: true });

// Types for community
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;
export type PostReaction = typeof postReactions.$inferSelect;
export type InsertPostReaction = z.infer<typeof insertPostReactionSchema>;
export type PostComment = typeof postComments.$inferSelect;
export type InsertPostComment = z.infer<typeof insertPostCommentSchema>;

// Post types enum
export const POST_TYPES = ["achievement", "milestone", "tip", "encouragement", "practice_share"] as const;
export type PostType = typeof POST_TYPES[number];

// Reaction types enum  
export const REACTION_TYPES = ["heart", "celebrate", "support", "inspire"] as const;
export type ReactionType = typeof REACTION_TYPES[number];

// Best Moments - AI-captured highlights when users excel
export const bestMoments = pgTable("best_moments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").references(() => practiceSessions.id),
  rehearsalId: varchar("rehearsal_id").references(() => rehearsals.id),
  title: text("title").notNull(),
  excerpt: text("excerpt").notNull(), // Key quote or response that was excellent
  category: varchar("category").notNull(), // empathy, assertiveness, boundaries, etc.
  score: integer("score").notNull(), // Score that triggered the highlight (85+)
  aiInsight: text("ai_insight"), // AI's explanation of what made it great
  tags: text("tags").array(), // calm, confident, empathetic, etc.
  isPublic: boolean("is_public").default(false), // Shareable with community
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily Wheel Rewards - available rewards for spinning
export const wheelRewards = pgTable("wheel_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  type: varchar("type").notNull(), // xp, peace_points, challenge, cosmetic, bonus_spin
  value: integer("value").notNull(), // Amount of XP/PP or itemId reference
  weight: integer("weight").default(100), // Probability weight (higher = more likely)
  rarity: varchar("rarity").default("common"), // common, rare, epic, legendary
  icon: varchar("icon"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Daily Wheel Spins - track user spins
export const dailyWheelSpins = pgTable("daily_wheel_spins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  rewardId: varchar("reward_id").references(() => wheelRewards.id),
  rewardType: varchar("reward_type").notNull(),
  rewardValue: integer("reward_value").notNull(),
  spinDate: timestamp("spin_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Voice Clone Samples - track uploaded samples for cloning
export const voiceCloneSamples = pgTable("voice_clone_samples", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  voiceCloneId: varchar("voice_clone_id").references(() => voiceClones.id),
  sampleUrl: varchar("sample_url"),
  duration: integer("duration"), // seconds
  status: varchar("status").default("pending"), // pending, processing, completed, failed
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new tables
export const bestMomentsRelations = relations(bestMoments, ({ one }) => ({
  user: one(users, {
    fields: [bestMoments.userId],
    references: [users.id],
  }),
  session: one(practiceSessions, {
    fields: [bestMoments.sessionId],
    references: [practiceSessions.id],
  }),
  rehearsal: one(rehearsals, {
    fields: [bestMoments.rehearsalId],
    references: [rehearsals.id],
  }),
}));

export const dailyWheelSpinsRelations = relations(dailyWheelSpins, ({ one }) => ({
  user: one(users, {
    fields: [dailyWheelSpins.userId],
    references: [users.id],
  }),
  reward: one(wheelRewards, {
    fields: [dailyWheelSpins.rewardId],
    references: [wheelRewards.id],
  }),
}));

export const voiceCloneSamplesRelations = relations(voiceCloneSamples, ({ one }) => ({
  user: one(users, {
    fields: [voiceCloneSamples.userId],
    references: [users.id],
  }),
  voiceClone: one(voiceClones, {
    fields: [voiceCloneSamples.voiceCloneId],
    references: [voiceClones.id],
  }),
}));

// Insert schemas for new tables
export const insertBestMomentSchema = createInsertSchema(bestMoments).omit({ id: true, createdAt: true });
export const insertWheelRewardSchema = createInsertSchema(wheelRewards).omit({ id: true, createdAt: true });
export const insertDailyWheelSpinSchema = createInsertSchema(dailyWheelSpins).omit({ id: true, createdAt: true });
export const insertVoiceCloneSampleSchema = createInsertSchema(voiceCloneSamples).omit({ id: true, createdAt: true });

// Types for new tables
export type BestMoment = typeof bestMoments.$inferSelect;
export type InsertBestMoment = z.infer<typeof insertBestMomentSchema>;
export type WheelReward = typeof wheelRewards.$inferSelect;
export type InsertWheelReward = z.infer<typeof insertWheelRewardSchema>;
export type DailyWheelSpin = typeof dailyWheelSpins.$inferSelect;
export type InsertDailyWheelSpin = z.infer<typeof insertDailyWheelSpinSchema>;
export type VoiceCloneSample = typeof voiceCloneSamples.$inferSelect;
export type InsertVoiceCloneSample = z.infer<typeof insertVoiceCloneSampleSchema>;

// Wheel reward types enum
export const WHEEL_REWARD_TYPES = ["xp", "peace_points", "challenge", "cosmetic", "bonus_spin"] as const;
export type WheelRewardType = typeof WHEEL_REWARD_TYPES[number];

// Daily Login Rewards - the 7-day reward cycle definition
export const dailyLoginRewards = pgTable("daily_login_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  day: integer("day").notNull(), // 1-7
  rewardType: varchar("reward_type").notNull(), // xp, pp, cosmetic
  rewardValue: integer("reward_value").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Login Rewards - tracks user's claimed rewards
export const userLoginRewards = pgTable("user_login_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  claimedDay: integer("claimed_day").notNull(), // 1-7
  claimedAt: timestamp("claimed_at").defaultNow(),
  cycleStartDate: timestamp("cycle_start_date").notNull(),
});

// Relations for login rewards
export const userLoginRewardsRelations = relations(userLoginRewards, ({ one }) => ({
  user: one(users, {
    fields: [userLoginRewards.userId],
    references: [users.id],
  }),
}));

// Insert schemas for login rewards
export const insertDailyLoginRewardSchema = createInsertSchema(dailyLoginRewards).omit({ id: true, createdAt: true });
export const insertUserLoginRewardSchema = createInsertSchema(userLoginRewards).omit({ id: true, claimedAt: true });

// Types for login rewards
export type DailyLoginReward = typeof dailyLoginRewards.$inferSelect;
export type InsertDailyLoginReward = z.infer<typeof insertDailyLoginRewardSchema>;
export type UserLoginReward = typeof userLoginRewards.$inferSelect;
export type InsertUserLoginReward = z.infer<typeof insertUserLoginRewardSchema>;

// Weekly Challenges - themed goals that refresh each week
export const weeklyChallenges = pgTable("weekly_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  category: varchar("category"), // workplace, relationships, voice, general
  goalType: varchar("goal_type").notNull(), // practice_count, score_threshold, streak, voice_practice, category_variety
  goalValue: integer("goal_value").notNull(), // target number
  goalThreshold: integer("goal_threshold"), // for score_threshold type: minimum score required
  xpReward: integer("xp_reward").default(0),
  ppReward: integer("pp_reward").default(0),
  weekStartDate: timestamp("week_start_date").notNull(),
  weekEndDate: timestamp("week_end_date").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// User Weekly Challenge Progress - tracks user progress on weekly challenges
export const userWeeklyChallengeProgress = pgTable("user_weekly_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  challengeId: varchar("challenge_id").notNull().references(() => weeklyChallenges.id),
  progress: integer("progress").default(0),
  progressData: jsonb("progress_data"), // for tracking complex goals like categories practiced
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  rewardClaimed: boolean("reward_claimed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for weekly challenges
export const weeklyChallengesRelations = relations(weeklyChallenges, ({ many }) => ({
  userProgress: many(userWeeklyChallengeProgress),
}));

export const userWeeklyChallengeProgressRelations = relations(userWeeklyChallengeProgress, ({ one }) => ({
  user: one(users, {
    fields: [userWeeklyChallengeProgress.userId],
    references: [users.id],
  }),
  challenge: one(weeklyChallenges, {
    fields: [userWeeklyChallengeProgress.challengeId],
    references: [weeklyChallenges.id],
  }),
}));

// Insert schemas for weekly challenges
export const insertWeeklyChallengeSchema = createInsertSchema(weeklyChallenges).omit({ id: true, createdAt: true });
export const insertUserWeeklyChallengeProgressSchema = createInsertSchema(userWeeklyChallengeProgress).omit({ id: true, createdAt: true });

// Types for weekly challenges
export type WeeklyChallenge = typeof weeklyChallenges.$inferSelect;
export type InsertWeeklyChallenge = z.infer<typeof insertWeeklyChallengeSchema>;
export type UserWeeklyChallengeProgress = typeof userWeeklyChallengeProgress.$inferSelect;
export type InsertUserWeeklyChallengeProgress = z.infer<typeof insertUserWeeklyChallengeProgressSchema>;

// Weekly challenge goal types
export const WEEKLY_CHALLENGE_GOAL_TYPES = [
  "practice_count",
  "score_threshold", 
  "streak",
  "voice_practice",
  "category_variety",
] as const;
export type WeeklyChallengeGoalType = typeof WEEKLY_CHALLENGE_GOAL_TYPES[number];

// Story Mode - Guided emotional intelligence journey
export const storyChapters = pgTable("story_chapters", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chapterNumber: integer("chapter_number").notNull().unique(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  theme: varchar("theme").notNull(), // empathy, assertiveness, listening, conflict, leadership
  scenarioIds: text("scenario_ids").array().notNull(), // array of scenario IDs
  xpReward: integer("xp_reward").default(100),
  ppReward: integer("pp_reward").default(50),
  unlockLevel: integer("unlock_level").default(1),
  createdAt: timestamp("created_at").defaultNow(),
});

// User's progress through story chapters
export const userStoryProgress = pgTable("user_story_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  chapterId: varchar("chapter_id").notNull().references(() => storyChapters.id),
  scenariosCompleted: text("scenarios_completed").array().default([]), // array of completed scenario IDs
  isComplete: boolean("is_complete").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for story mode
export const storyChaptersRelations = relations(storyChapters, ({ many }) => ({
  userProgress: many(userStoryProgress),
}));

export const userStoryProgressRelations = relations(userStoryProgress, ({ one }) => ({
  user: one(users, {
    fields: [userStoryProgress.userId],
    references: [users.id],
  }),
  chapter: one(storyChapters, {
    fields: [userStoryProgress.chapterId],
    references: [storyChapters.id],
  }),
}));

// Insert schemas for story mode
export const insertStoryChapterSchema = createInsertSchema(storyChapters).omit({ id: true, createdAt: true });
export const insertUserStoryProgressSchema = createInsertSchema(userStoryProgress).omit({ id: true, createdAt: true });

// Types for story mode
export type StoryChapter = typeof storyChapters.$inferSelect;
export type InsertStoryChapter = z.infer<typeof insertStoryChapterSchema>;
export type UserStoryProgress = typeof userStoryProgress.$inferSelect;
export type InsertUserStoryProgress = z.infer<typeof insertUserStoryProgressSchema>;

// Story theme types
export const STORY_THEMES = ["assertiveness", "empathy", "listening", "conflict", "leadership"] as const;
export type StoryTheme = typeof STORY_THEMES[number];

// Seasonal Events - holiday-themed events with special rewards
export const seasonalEvents = pgTable("seasonal_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  theme: varchar("theme").notNull(), // winter, spring, summer, autumn, holiday
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  bannerImage: varchar("banner_image"),
  accentColor: varchar("accent_color").default("#8B5CF6"), // hex color
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Seasonal Rewards - rewards for completing event progress
export const seasonalRewards = pgTable("seasonal_rewards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventId: varchar("event_id").notNull().references(() => seasonalEvents.id),
  name: text("name").notNull(),
  type: varchar("type").notNull(), // xp, pp, cosmetic, badge
  value: integer("value").notNull(), // amount for xp/pp, or reference ID for cosmetic/badge
  description: text("description"),
  requiredProgress: integer("required_progress").notNull(), // practices needed to unlock
  createdAt: timestamp("created_at").defaultNow(),
});

// User Seasonal Progress - tracks user progress in events
export const userSeasonalProgress = pgTable("user_seasonal_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  eventId: varchar("event_id").notNull().references(() => seasonalEvents.id),
  progress: integer("progress").default(0), // number of practices completed during event
  rewardsClaimed: text("rewards_claimed").array().default([]), // array of reward IDs claimed
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for seasonal events
export const seasonalEventsRelations = relations(seasonalEvents, ({ many }) => ({
  rewards: many(seasonalRewards),
  userProgress: many(userSeasonalProgress),
}));

export const seasonalRewardsRelations = relations(seasonalRewards, ({ one }) => ({
  event: one(seasonalEvents, {
    fields: [seasonalRewards.eventId],
    references: [seasonalEvents.id],
  }),
}));

export const userSeasonalProgressRelations = relations(userSeasonalProgress, ({ one }) => ({
  user: one(users, {
    fields: [userSeasonalProgress.userId],
    references: [users.id],
  }),
  event: one(seasonalEvents, {
    fields: [userSeasonalProgress.eventId],
    references: [seasonalEvents.id],
  }),
}));

// Insert schemas for seasonal events
export const insertSeasonalEventSchema = createInsertSchema(seasonalEvents).omit({ id: true, createdAt: true });
export const insertSeasonalRewardSchema = createInsertSchema(seasonalRewards).omit({ id: true, createdAt: true });
export const insertUserSeasonalProgressSchema = createInsertSchema(userSeasonalProgress).omit({ id: true, createdAt: true });

// Types for seasonal events
export type SeasonalEvent = typeof seasonalEvents.$inferSelect;
export type InsertSeasonalEvent = z.infer<typeof insertSeasonalEventSchema>;
export type SeasonalReward = typeof seasonalRewards.$inferSelect;
export type InsertSeasonalReward = z.infer<typeof insertSeasonalRewardSchema>;
export type UserSeasonalProgress = typeof userSeasonalProgress.$inferSelect;
export type InsertUserSeasonalProgress = z.infer<typeof insertUserSeasonalProgressSchema>;

// Seasonal event types
export const SEASONAL_REWARD_TYPES = ["xp", "pp", "cosmetic", "badge"] as const;
export type SeasonalRewardType = typeof SEASONAL_REWARD_TYPES[number];

// Direct Message Conversations
export const dmConversations = pgTable("dm_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  participant1Id: varchar("participant1_id").notNull().references(() => users.id),
  participant2Id: varchar("participant2_id").notNull().references(() => users.id),
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Direct Messages
export const directMessages = pgTable("direct_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => dmConversations.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  audioUrl: varchar("audio_url"), // For TTS playback
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mentorship relationships
export const mentorships = pgTable("mentorships", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  mentorId: varchar("mentor_id").notNull().references(() => users.id),
  menteeId: varchar("mentee_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // pending, active, completed
  feedbackCount: integer("feedback_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
});

// Voice Journal entries
export const voiceJournals = pgTable("voice_journals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  audioUrl: varchar("audio_url"),
  transcription: text("transcription"),
  emotionAnalysis: jsonb("emotion_analysis"), // AI analysis of emotions
  duration: integer("duration"), // in seconds
  journalDate: timestamp("journal_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Pronunciation practice phrases
export const pronunciationPhrases = pgTable("pronunciation_phrases", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  phrase: text("phrase").notNull(),
  category: varchar("category").notNull(), // workplace, assertive, empathetic
  difficulty: integer("difficulty").default(1),
  audioUrl: varchar("audio_url"), // Reference pronunciation
  createdAt: timestamp("created_at").defaultNow(),
});

// User pronunciation practice attempts
export const pronunciationAttempts = pgTable("pronunciation_attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  phraseId: varchar("phrase_id").notNull().references(() => pronunciationPhrases.id),
  audioUrl: varchar("audio_url"),
  transcription: text("transcription"),
  accuracyScore: integer("accuracy_score"), // 0-100
  feedback: jsonb("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Circle Challenges (exclusive to circles)
export const circleChallenges = pgTable("circle_challenges", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  circleId: varchar("circle_id").notNull().references(() => circles.id),
  title: text("title").notNull(),
  description: text("description"),
  goal: integer("goal").notNull(), // target count
  goalType: varchar("goal_type").notNull(), // practices, xp, streak_days
  rewardXp: integer("reward_xp").default(0),
  rewardPp: integer("reward_pp").default(0),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Circle Challenge Progress
export const circleChallengeProgress = pgTable("circle_challenge_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  challengeId: varchar("challenge_id").notNull().references(() => circleChallenges.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  progress: integer("progress").default(0),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Weekly Tournaments
export const weeklyTournaments = pgTable("weekly_tournaments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title"), // Alternative display name
  description: text("description"),
  theme: varchar("theme").notNull(), // empathy, assertiveness, workplace, listening, conflict
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: varchar("status").default("upcoming"), // upcoming, active, completed
  rules: text("rules").array(),
  prizes: jsonb("prizes"), // { first: { xp, pp, badge }, second: {...}, third: {...} }
  rewardBadgeId: varchar("reward_badge_id"),
  rewardXp: integer("reward_xp").default(500),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tournament Participants
export const tournamentParticipants = pgTable("tournament_participants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tournamentId: varchar("tournament_id").notNull().references(() => weeklyTournaments.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  score: integer("score").default(0),
  rank: integer("rank"),
  practiceCount: integer("practice_count").default(0),
  joinedAt: timestamp("joined_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Duo Sessions - collaborative partner practice
export const duoSessions = pgTable("duo_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  scenarioId: varchar("scenario_id").notNull(),
  hostUserId: varchar("host_user_id").notNull().references(() => users.id),
  partnerUserId: varchar("partner_user_id").notNull().references(() => users.id),
  status: varchar("status").default("pending"), // pending, active, completed
  currentTurn: varchar("current_turn").default("host"), // host or partner
  hostScore: integer("host_score").default(0),
  partnerScore: integer("partner_score").default(0),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Duo Messages - messages exchanged during duo practice
export const duoMessages = pgTable("duo_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => duoSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  role: varchar("role").notNull(), // Person A or Person B
  message: text("message").notNull(),
  score: integer("score"),
  feedback: text("feedback"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Mood Streaks - daily emotion tracking
export const moodStreaks = pgTable("mood_streaks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  mood: varchar("mood").notNull(), // happy, calm, anxious, sad, confident, etc
  intensity: integer("intensity").default(5), // 1-10
  notes: text("notes"),
  moodDate: timestamp("mood_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Gratitude entries
export const gratitudeEntries = pgTable("gratitude_entries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  audioUrl: varchar("audio_url"),
  transcription: text("transcription"),
  prompt: text("prompt"), // Daily gratitude prompt
  entryDate: timestamp("entry_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calm mode sessions (breathing exercises)
export const calmSessions = pgTable("calm_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  exerciseType: varchar("exercise_type").notNull(), // box_breathing, 4_7_8, calm_breath
  duration: integer("duration").notNull(), // in seconds
  completedCycles: integer("completed_cycles").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas for new features
export const insertDmConversationSchema = createInsertSchema(dmConversations).omit({ id: true, createdAt: true, lastMessageAt: true });
export const insertDirectMessageSchema = createInsertSchema(directMessages).omit({ id: true, createdAt: true });
export const insertMentorshipSchema = createInsertSchema(mentorships).omit({ id: true, createdAt: true, acceptedAt: true });
export const insertVoiceJournalSchema = createInsertSchema(voiceJournals).omit({ id: true, createdAt: true });
export const insertPronunciationPhraseSchema = createInsertSchema(pronunciationPhrases).omit({ id: true, createdAt: true });
export const insertPronunciationAttemptSchema = createInsertSchema(pronunciationAttempts).omit({ id: true, createdAt: true });
export const insertCircleChallengeSchema = createInsertSchema(circleChallenges).omit({ id: true, createdAt: true });
export const insertCircleChallengeProgressSchema = createInsertSchema(circleChallengeProgress).omit({ id: true, createdAt: true });
export const insertWeeklyTournamentSchema = createInsertSchema(weeklyTournaments).omit({ id: true, createdAt: true });
export const insertTournamentParticipantSchema = createInsertSchema(tournamentParticipants).omit({ id: true, createdAt: true });
export const insertDuoSessionSchema = createInsertSchema(duoSessions).omit({ id: true, createdAt: true });
export const insertDuoMessageSchema = createInsertSchema(duoMessages).omit({ id: true, createdAt: true });
export const insertMoodStreakSchema = createInsertSchema(moodStreaks).omit({ id: true, createdAt: true });
export const insertGratitudeEntrySchema = createInsertSchema(gratitudeEntries).omit({ id: true, createdAt: true });
export const insertCalmSessionSchema = createInsertSchema(calmSessions).omit({ id: true, createdAt: true });

// Types for new features
export type DmConversation = typeof dmConversations.$inferSelect;
export type InsertDmConversation = z.infer<typeof insertDmConversationSchema>;
export type DirectMessage = typeof directMessages.$inferSelect;
export type InsertDirectMessage = z.infer<typeof insertDirectMessageSchema>;
export type Mentorship = typeof mentorships.$inferSelect;
export type InsertMentorship = z.infer<typeof insertMentorshipSchema>;
export type VoiceJournal = typeof voiceJournals.$inferSelect;
export type InsertVoiceJournal = z.infer<typeof insertVoiceJournalSchema>;
export type PronunciationPhrase = typeof pronunciationPhrases.$inferSelect;
export type InsertPronunciationPhrase = z.infer<typeof insertPronunciationPhraseSchema>;
export type PronunciationAttempt = typeof pronunciationAttempts.$inferSelect;
export type InsertPronunciationAttempt = z.infer<typeof insertPronunciationAttemptSchema>;
export type CircleChallenge = typeof circleChallenges.$inferSelect;
export type InsertCircleChallenge = z.infer<typeof insertCircleChallengeSchema>;
export type CircleChallengeProgress = typeof circleChallengeProgress.$inferSelect;
export type InsertCircleChallengeProgress = z.infer<typeof insertCircleChallengeProgressSchema>;
export type WeeklyTournament = typeof weeklyTournaments.$inferSelect;
export type InsertWeeklyTournament = z.infer<typeof insertWeeklyTournamentSchema>;
export type TournamentParticipant = typeof tournamentParticipants.$inferSelect;
export type InsertTournamentParticipant = z.infer<typeof insertTournamentParticipantSchema>;
export type DuoSession = typeof duoSessions.$inferSelect;
export type InsertDuoSession = z.infer<typeof insertDuoSessionSchema>;
export type DuoMessage = typeof duoMessages.$inferSelect;
export type InsertDuoMessage = z.infer<typeof insertDuoMessageSchema>;
export type MoodStreak = typeof moodStreaks.$inferSelect;
export type InsertMoodStreak = z.infer<typeof insertMoodStreakSchema>;
export type GratitudeEntry = typeof gratitudeEntries.$inferSelect;
export type InsertGratitudeEntry = z.infer<typeof insertGratitudeEntrySchema>;
export type CalmSession = typeof calmSessions.$inferSelect;
export type InsertCalmSession = z.infer<typeof insertCalmSessionSchema>;

// Mini-Games - fun games to earn cosmetic items
export const MINI_GAME_TYPES = ["emotion_match", "tone_challenge", "empathy_ladder"] as const;
export type MiniGameType = typeof MINI_GAME_TYPES[number];

export const miniGameSessions = pgTable("mini_game_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  gameType: varchar("game_type").notNull(), // emotion_match, tone_challenge, empathy_ladder
  score: integer("score").default(0),
  maxScore: integer("max_score").default(100),
  duration: integer("duration"), // in seconds
  completed: boolean("completed").default(false),
  rewardItemId: varchar("reward_item_id").references(() => cosmeticItems.id),
  rewardXp: integer("reward_xp").default(0),
  rewardPp: integer("reward_pp").default(0),
  playedAt: timestamp("played_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const miniGameSessionsRelations = relations(miniGameSessions, ({ one }) => ({
  user: one(users, {
    fields: [miniGameSessions.userId],
    references: [users.id],
  }),
  rewardItem: one(cosmeticItems, {
    fields: [miniGameSessions.rewardItemId],
    references: [cosmeticItems.id],
  }),
}));

export const insertMiniGameSessionSchema = createInsertSchema(miniGameSessions).omit({ id: true, createdAt: true });

export type MiniGameSession = typeof miniGameSessions.$inferSelect;
export type InsertMiniGameSession = z.infer<typeof insertMiniGameSessionSchema>;

// Beta Signups for landing page
export const betaSignups = pgTable("beta_signups", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull().unique(),
  source: varchar("source").default("landing"), // landing, referral, etc.
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBetaSignupSchema = createInsertSchema(betaSignups).omit({ id: true, createdAt: true });

export type BetaSignup = typeof betaSignups.$inferSelect;
export type InsertBetaSignup = z.infer<typeof insertBetaSignupSchema>;

// Testimonials for landing page
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  role: varchar("role"), // e.g., "Student", "Professional"
  content: text("content").notNull(),
  rating: integer("rating").default(5), // 1-5 stars
  featured: boolean("featured").default(false),
  approved: boolean("approved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true, createdAt: true });

export type Testimonial = typeof testimonials.$inferSelect;
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;

// User Feedback for collecting user input
export const userFeedback = pgTable("user_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  category: varchar("category").notNull(), // bug, feature, improvement, other
  message: text("message").notNull(),
  rating: integer("rating"), // 1-5 optional satisfaction rating
  page: varchar("page"), // page where feedback was submitted
  status: varchar("status").default("new"), // new, reviewed, resolved
  createdAt: timestamp("created_at").defaultNow(),
});

export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, {
    fields: [userFeedback.userId],
    references: [users.id],
  }),
}));

export const insertUserFeedbackSchema = createInsertSchema(userFeedback).omit({ id: true, createdAt: true });

export type UserFeedback = typeof userFeedback.$inferSelect;
export type InsertUserFeedback = z.infer<typeof insertUserFeedbackSchema>;

export const FEEDBACK_CATEGORIES = ["bug", "feature", "improvement", "other"] as const;
export type FeedbackCategory = typeof FEEDBACK_CATEGORIES[number];

// Prototype feedback for internal improvement signal (not testimonials)
export const prototypeFeedback = pgTable("prototype_feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow(),
  platform: varchar("platform"),
  feedbackText: text("feedback_text").notNull(),
  tags: text("tags").array(),
  category: varchar("category"),
  difficulty: varchar("difficulty"),
  type: varchar("type"),
  consentPublic: boolean("consent_public").default(false),
  scenarioId: varchar("scenario_id"),
  appVersion: varchar("app_version"),
  anonymousUserId: varchar("anonymous_user_id"),
});

export type PrototypeFeedback = typeof prototypeFeedback.$inferSelect;
export type InsertPrototypeFeedback = typeof prototypeFeedback.$inferInsert;
