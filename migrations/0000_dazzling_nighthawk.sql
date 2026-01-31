CREATE TABLE "avatar_presets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"name" varchar DEFAULT 'My Avatar' NOT NULL,
	"config" jsonb NOT NULL,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" varchar,
	"requirement" jsonb,
	"xp_reward" integer DEFAULT 0,
	"pp_reward" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "best_moments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar,
	"rehearsal_id" varchar,
	"title" text NOT NULL,
	"excerpt" text NOT NULL,
	"category" varchar NOT NULL,
	"score" integer NOT NULL,
	"ai_insight" text,
	"tags" text[],
	"is_public" boolean DEFAULT false,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "calm_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"exercise_type" varchar NOT NULL,
	"duration" integer NOT NULL,
	"completed_cycles" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenge_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"progress" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" varchar DEFAULT 'daily',
	"goal" integer NOT NULL,
	"goal_type" varchar DEFAULT 'practice_count',
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"reward_xp" integer DEFAULT 0,
	"reward_pp" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circle_challenge_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"progress" integer DEFAULT 0,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circle_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"goal" integer NOT NULL,
	"goal_type" varchar NOT NULL,
	"reward_xp" integer DEFAULT 0,
	"reward_pp" integer DEFAULT 0,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circle_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"circle_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar DEFAULT 'member',
	"joined_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "circles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"owner_id" varchar NOT NULL,
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "community_posts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"content" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"emotion_state" varchar DEFAULT 'calm',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "cosmetic_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" varchar NOT NULL,
	"rarity" varchar DEFAULT 'common',
	"price" integer NOT NULL,
	"image_url" varchar,
	"metadata" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_scenarios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar NOT NULL,
	"difficulty" varchar DEFAULT 'beginner',
	"context" text NOT NULL,
	"prompt" text NOT NULL,
	"sample_response" text,
	"tips" text[],
	"is_public" boolean DEFAULT false,
	"usage_count" integer DEFAULT 0,
	"rating" real,
	"rating_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_capsules" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"questions" text[],
	"selected_question_index" integer,
	"completed" boolean DEFAULT false,
	"capsule_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_login_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day" integer NOT NULL,
	"reward_type" varchar NOT NULL,
	"reward_value" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_wheel_spins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"reward_id" varchar,
	"reward_type" varchar NOT NULL,
	"reward_value" integer NOT NULL,
	"spin_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "direct_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" varchar NOT NULL,
	"sender_id" varchar NOT NULL,
	"content" text NOT NULL,
	"audio_url" varchar,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dm_conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant1_id" varchar NOT NULL,
	"participant2_id" varchar NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "duo_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"role" varchar NOT NULL,
	"message" text NOT NULL,
	"score" integer,
	"feedback" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "duo_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" varchar NOT NULL,
	"host_user_id" varchar NOT NULL,
	"partner_user_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"current_turn" varchar DEFAULT 'host',
	"host_score" integer DEFAULT 0,
	"partner_score" integer DEFAULT 0,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "equipped_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"equipped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "friendships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"friend_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gifts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_user_id" varchar NOT NULL,
	"to_user_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"message" text,
	"status" varchar DEFAULT 'pending',
	"pp_paid" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gratitude_entries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"audio_url" varchar,
	"transcription" text,
	"prompt" text,
	"entry_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mentorships" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mentor_id" varchar NOT NULL,
	"mentee_id" varchar NOT NULL,
	"status" varchar DEFAULT 'pending',
	"feedback_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"accepted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "mood_check_ins" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"mood" varchar NOT NULL,
	"note" text,
	"check_in_date" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "mood_streaks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"mood" varchar NOT NULL,
	"intensity" integer DEFAULT 5,
	"notes" text,
	"mood_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "post_reactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"type" varchar NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "practice_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"prompt" text NOT NULL,
	"response" text NOT NULL,
	"mode" varchar DEFAULT 'text',
	"category" varchar,
	"tone" varchar,
	"score" integer,
	"tips" text[],
	"example_responses" text[],
	"vocal_metrics" jsonb,
	"audio_duration" integer,
	"words_per_minute" integer,
	"filler_word_count" integer,
	"transcription" text,
	"is_favorite" boolean DEFAULT false,
	"xp_earned" integer DEFAULT 0,
	"pp_earned" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pronunciation_attempts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"phrase_id" varchar NOT NULL,
	"audio_url" varchar,
	"transcription" text,
	"accuracy_score" integer,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pronunciation_phrases" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phrase" text NOT NULL,
	"category" varchar NOT NULL,
	"difficulty" integer DEFAULT 1,
	"audio_url" varchar,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rehearsals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"scenario_id" varchar NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"current_phase" integer DEFAULT 0,
	"escalation_level" integer DEFAULT 1,
	"completed" boolean DEFAULT false,
	"score" integer,
	"feedback" jsonb,
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "scenario_ratings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scenario_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" varchar NOT NULL,
	"difficulty" integer DEFAULT 1,
	"required_level" integer DEFAULT 1,
	"phases" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasonal_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"theme" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"banner_image" varchar,
	"accent_color" varchar DEFAULT '#8B5CF6',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "seasonal_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" varchar NOT NULL,
	"value" integer NOT NULL,
	"description" text,
	"required_progress" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_chapters" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chapter_number" integer NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"theme" varchar NOT NULL,
	"scenario_ids" text[] NOT NULL,
	"xp_reward" integer DEFAULT 100,
	"pp_reward" integer DEFAULT 50,
	"unlock_level" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "story_chapters_chapter_number_unique" UNIQUE("chapter_number")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"tier" varchar DEFAULT 'free',
	"stripe_subscription_id" varchar,
	"stripe_price_id" varchar,
	"status" varchar DEFAULT 'inactive',
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "tournament_participants" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tournament_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"score" integer DEFAULT 0,
	"rank" integer,
	"practice_count" integer DEFAULT 0,
	"joined_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_avatar_settings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"skin_tone" varchar DEFAULT '#fad7c8',
	"hair_style" varchar DEFAULT 'short',
	"hair_color" varchar DEFAULT '#3d2314',
	"eye_style" varchar DEFAULT 'normal',
	"eye_color" varchar DEFAULT '#4a7c59',
	"mouth_style" varchar DEFAULT 'smile',
	"face_shape" varchar DEFAULT 'round',
	"accessory" varchar,
	"accessory_color" varchar,
	"blush" boolean DEFAULT false,
	"freckles" boolean DEFAULT false,
	"avatar_config_v2" jsonb,
	"active_preset_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_badges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"badge_id" varchar NOT NULL,
	"earned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_inventory" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"item_id" varchar NOT NULL,
	"purchased_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_login_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"claimed_day" integer NOT NULL,
	"claimed_at" timestamp DEFAULT now(),
	"cycle_start_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"total_xp" integer DEFAULT 0,
	"total_pp" integer DEFAULT 0,
	"level" integer DEFAULT 1,
	"current_streak" integer DEFAULT 0,
	"best_streak" integer DEFAULT 0,
	"last_check_in" timestamp,
	"practice_count" integer DEFAULT 0,
	"voice_onboarding_completed" boolean DEFAULT false,
	"daily_energy" integer DEFAULT 100,
	"max_energy" integer DEFAULT 100,
	"last_energy_recharge" timestamp,
	"text_input_enabled" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_seasonal_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"event_id" varchar NOT NULL,
	"progress" integer DEFAULT 0,
	"rewards_claimed" text[] DEFAULT '{}',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_story_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"chapter_id" varchar NOT NULL,
	"scenarios_completed" text[] DEFAULT '{}',
	"is_complete" boolean DEFAULT false,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_voice_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"selected_voice_id" varchar NOT NULL,
	"tts_enabled" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "user_voice_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_weekly_challenge_progress" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"challenge_id" varchar NOT NULL,
	"progress" integer DEFAULT 0,
	"progress_data" jsonb,
	"completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"rpm_avatar_url" varchar,
	"role" varchar DEFAULT 'free',
	"stripe_customer_id" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "voice_clone_samples" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"voice_clone_id" varchar,
	"sample_url" varchar,
	"duration" integer,
	"status" varchar DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_clones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"elevenlabs_voice_id" varchar,
	"name" varchar,
	"description" varchar,
	"status" varchar DEFAULT 'pending',
	"error_message" varchar,
	"sample_count" integer DEFAULT 0,
	"is_default" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "voice_journals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"audio_url" varchar,
	"transcription" text,
	"emotion_analysis" jsonb,
	"duration" integer,
	"journal_date" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_challenges" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"category" varchar,
	"goal_type" varchar NOT NULL,
	"goal_value" integer NOT NULL,
	"goal_threshold" integer,
	"xp_reward" integer DEFAULT 0,
	"pp_reward" integer DEFAULT 0,
	"week_start_date" timestamp NOT NULL,
	"week_end_date" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "weekly_tournaments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"title" text,
	"description" text,
	"theme" varchar NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"status" varchar DEFAULT 'upcoming',
	"rules" text[],
	"prizes" jsonb,
	"reward_badge_id" varchar,
	"reward_xp" integer DEFAULT 500,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "wheel_rewards" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" varchar NOT NULL,
	"value" integer NOT NULL,
	"weight" integer DEFAULT 100,
	"rarity" varchar DEFAULT 'common',
	"icon" varchar,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "avatar_presets" ADD CONSTRAINT "avatar_presets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_moments" ADD CONSTRAINT "best_moments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_moments" ADD CONSTRAINT "best_moments_session_id_practice_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."practice_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "best_moments" ADD CONSTRAINT "best_moments_rehearsal_id_rehearsals_id_fk" FOREIGN KEY ("rehearsal_id") REFERENCES "public"."rehearsals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calm_sessions" ADD CONSTRAINT "calm_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_participants" ADD CONSTRAINT "challenge_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_challenge_progress" ADD CONSTRAINT "circle_challenge_progress_challenge_id_circle_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."circle_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_challenge_progress" ADD CONSTRAINT "circle_challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_challenges" ADD CONSTRAINT "circle_challenges_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_circle_id_circles_id_fk" FOREIGN KEY ("circle_id") REFERENCES "public"."circles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circle_members" ADD CONSTRAINT "circle_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "circles" ADD CONSTRAINT "circles_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "custom_scenarios" ADD CONSTRAINT "custom_scenarios_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_capsules" ADD CONSTRAINT "daily_capsules_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_wheel_spins" ADD CONSTRAINT "daily_wheel_spins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_wheel_spins" ADD CONSTRAINT "daily_wheel_spins_reward_id_wheel_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."wheel_rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_conversation_id_dm_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."dm_conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_participant1_id_users_id_fk" FOREIGN KEY ("participant1_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dm_conversations" ADD CONSTRAINT "dm_conversations_participant2_id_users_id_fk" FOREIGN KEY ("participant2_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duo_messages" ADD CONSTRAINT "duo_messages_session_id_duo_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."duo_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duo_messages" ADD CONSTRAINT "duo_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duo_sessions" ADD CONSTRAINT "duo_sessions_host_user_id_users_id_fk" FOREIGN KEY ("host_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duo_sessions" ADD CONSTRAINT "duo_sessions_partner_user_id_users_id_fk" FOREIGN KEY ("partner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipped_items" ADD CONSTRAINT "equipped_items_item_id_cosmetic_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friendships" ADD CONSTRAINT "friendships_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gifts" ADD CONSTRAINT "gifts_item_id_cosmetic_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gratitude_entries" ADD CONSTRAINT "gratitude_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentor_id_users_id_fk" FOREIGN KEY ("mentor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mentorships" ADD CONSTRAINT "mentorships_mentee_id_users_id_fk" FOREIGN KEY ("mentee_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_check_ins" ADD CONSTRAINT "mood_check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mood_streaks" ADD CONSTRAINT "mood_streaks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_comments" ADD CONSTRAINT "post_comments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_post_id_community_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post_reactions" ADD CONSTRAINT "post_reactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_sessions" ADD CONSTRAINT "practice_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pronunciation_attempts" ADD CONSTRAINT "pronunciation_attempts_phrase_id_pronunciation_phrases_id_fk" FOREIGN KEY ("phrase_id") REFERENCES "public"."pronunciation_phrases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsals" ADD CONSTRAINT "rehearsals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rehearsals" ADD CONSTRAINT "rehearsals_scenario_id_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."scenarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_ratings" ADD CONSTRAINT "scenario_ratings_scenario_id_custom_scenarios_id_fk" FOREIGN KEY ("scenario_id") REFERENCES "public"."custom_scenarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenario_ratings" ADD CONSTRAINT "scenario_ratings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasonal_rewards" ADD CONSTRAINT "seasonal_rewards_event_id_seasonal_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."seasonal_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_tournament_id_weekly_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."weekly_tournaments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_participants" ADD CONSTRAINT "tournament_participants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_avatar_settings" ADD CONSTRAINT "user_avatar_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_badges_id_fk" FOREIGN KEY ("badge_id") REFERENCES "public"."badges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_inventory" ADD CONSTRAINT "user_inventory_item_id_cosmetic_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."cosmetic_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_login_rewards" ADD CONSTRAINT "user_login_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_seasonal_progress" ADD CONSTRAINT "user_seasonal_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_seasonal_progress" ADD CONSTRAINT "user_seasonal_progress_event_id_seasonal_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."seasonal_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_story_progress" ADD CONSTRAINT "user_story_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_story_progress" ADD CONSTRAINT "user_story_progress_chapter_id_story_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."story_chapters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_voice_preferences" ADD CONSTRAINT "user_voice_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_weekly_challenge_progress" ADD CONSTRAINT "user_weekly_challenge_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_weekly_challenge_progress" ADD CONSTRAINT "user_weekly_challenge_progress_challenge_id_weekly_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "public"."weekly_challenges"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_clone_samples" ADD CONSTRAINT "voice_clone_samples_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_clone_samples" ADD CONSTRAINT "voice_clone_samples_voice_clone_id_voice_clones_id_fk" FOREIGN KEY ("voice_clone_id") REFERENCES "public"."voice_clones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_clones" ADD CONSTRAINT "voice_clones_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "voice_journals" ADD CONSTRAINT "voice_journals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");