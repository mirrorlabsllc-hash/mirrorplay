import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { MysticalOrb } from "@/components/MysticalOrb";
import { GlassCard } from "@/components/GlassCard";
import { StreakCounter } from "@/components/StreakCounter";
import { StreakMultiplier } from "@/components/StreakMultiplier";
import { ProgressRing } from "@/components/ProgressRing";
import { DailyWheel } from "@/FutureFeatures/components/DailyWheel";
import { LoginRewardsCalendar } from "@/FutureFeatures/components/LoginRewardsCalendar";
import { MoodCheckIn } from "@/components/MoodCheckIn";
import { QuickPractice } from "@/components/QuickPractice";
import { WeeklyChallenges } from "@/FutureFeatures/components/WeeklyChallenges";
import { EventBanner } from "@/components/EventBanner";
import { Button } from "@/components/ui/button";
import { 
  MessageCircle, 
  Target, 
  Calendar, 
  Trophy,
  ChevronRight,
  Sparkles,
  Brain,
  Users,
  BookOpen
} from "lucide-react";
import type { UserProgress, DailyCapsule } from "@shared/schema";

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  },
};

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: capsule } = useQuery<DailyCapsule>({
    queryKey: ["/api/daily-capsule"],
  });

  const xpToNextLevel = 100;
  const currentLevelXp = progress ? (progress.totalXp || 0) % xpToNextLevel : 0;
  const levelProgress = (currentLevelXp / xpToNextLevel) * 100;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleOrbClick = () => {
    setLocation("/chat");
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user?.firstName || "Friend"}
          </h1>
          <p className="text-muted-foreground text-sm">Ready to grow today?</p>
        </div>
        <StreakCounter streak={progress?.currentStreak || 0} />
      </motion.div>

      {/* Seasonal Event Banner */}
      <EventBanner />

      {/* Mirror AI Orb Section */}
      <motion.div 
        className="flex flex-col items-center py-8"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
      >
        <MysticalOrb 
          size="xl" 
          isActive={true}
          onClick={handleOrbClick}
          data-testid="orb-main"
        />
        <motion.p 
          className="mt-8 text-center text-muted-foreground max-w-xs"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          I'm here to help you communicate with confidence and clarity.
        </motion.p>
        <motion.span 
          className="text-xs text-primary/70 mt-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          Tap the orb to begin
        </motion.span>
      </motion.div>

      {/* Stats Row */}
      <motion.div 
        className="grid grid-cols-3 gap-3"
        variants={staggerContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={staggerItem}>
          <GlassCard variant="dark" className="flex flex-col items-center py-4">
            <ProgressRing 
              progress={levelProgress} 
              size={60} 
              strokeWidth={5}
              showPercentage={false}
            />
            <span className="mt-2 text-lg font-bold">Lvl {progress?.level || 1}</span>
            <span className="text-xs text-muted-foreground">Level</span>
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <GlassCard variant="dark" className="flex flex-col items-center py-4">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <span className="mt-2 text-lg font-bold">{progress?.totalXp || 0}</span>
            <span className="text-xs text-muted-foreground">Total XP</span>
          </GlassCard>
        </motion.div>

        <motion.div variants={staggerItem}>
          <GlassCard variant="dark" className="flex flex-col items-center py-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
            </div>
            <span className="mt-2 text-lg font-bold">{progress?.totalPp || 0}</span>
            <span className="text-xs text-muted-foreground">Peace Pts</span>
          </GlassCard>
        </motion.div>
      </motion.div>

      {/* Streak Multiplier Display */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.28 }}
      >
        <StreakMultiplier 
          streak={progress?.currentStreak || 0} 
          showMilestone={true}
        />
      </motion.div>

      {/* Mood Check-in Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.29 }}
        data-testid="section-mood-checkin"
      >
        <MoodCheckIn />
      </motion.div>

      {/* Quick Practice Widget */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.295 }}
        data-testid="section-quick-practice"
      >
        <QuickPractice />
      </motion.div>

      {/* Weekly Challenges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.297 }}
        data-testid="section-weekly-challenges"
      >
        <WeeklyChallenges />
      </motion.div>

      {/* Daily Capsule CTA */}
      {capsule && !capsule.completed && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link to="/practice/capsule">
            <GlassCard 
              variant="glow" 
              hover 
              className="cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <Calendar className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Daily Practice</h3>
                  <p className="text-sm text-muted-foreground">
                    Your personalized prompt awaits
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </GlassCard>
          </Link>
        </motion.div>
      )}

      {/* Daily Wheel */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.32 }}
        data-testid="section-daily-wheel"
      >
        <DailyWheel />
      </motion.div>

      {/* Login Rewards Calendar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.34 }}
      >
        <LoginRewardsCalendar />
      </motion.div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <motion.h2 
          className="text-lg font-semibold"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          Quick Actions
        </motion.h2>
        
        <motion.div 
          className="grid grid-cols-2 gap-3"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <Link to="/practice">
              <GlassCard variant="dark" hover className="cursor-pointer h-full">
                <div className="flex flex-col items-center text-center py-2 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Practice</h3>
                    <p className="text-xs text-muted-foreground">Build your skills</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Link to="/chat">
              <GlassCard variant="dark" hover className="cursor-pointer h-full">
                <div className="flex flex-col items-center text-center py-2 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">AI Coach</h3>
                    <p className="text-xs text-muted-foreground">Get guidance</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Link to="/scenarios">
              <GlassCard variant="dark" hover className="cursor-pointer h-full">
                <div className="flex flex-col items-center text-center py-2 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                    <Users className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Role-Play</h3>
                    <p className="text-xs text-muted-foreground">Real scenarios</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Link to="/progress">
              <GlassCard variant="dark" hover className="cursor-pointer h-full">
                <div className="flex flex-col items-center text-center py-2 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Progress</h3>
                    <p className="text-xs text-muted-foreground">Track growth</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div variants={staggerItem}>
            <Link to="/story" data-testid="link-story-mode">
              <GlassCard variant="dark" hover className="cursor-pointer h-full">
                <div className="flex flex-col items-center text-center py-2 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-violet-500" />
                  </div>
                  <div>
                    <h3 className="font-medium">Story Mode</h3>
                    <p className="text-xs text-muted-foreground">EQ journey</p>
                  </div>
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Practice Count */}
      {progress && (progress.practiceCount || 0) > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard variant="dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Practice Sessions</p>
                <p className="text-2xl font-bold">{progress.practiceCount}</p>
              </div>
              <Link to="/practice/history">
                <Button variant="ghost" size="sm">
                  View History <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
