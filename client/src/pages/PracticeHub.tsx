import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { SpinWheel, WheelCategory, WHEEL_CATEGORIES } from "@/components/SpinWheel";
import { VoicePracticeSession } from "@/components/VoicePracticeSession";
import { ToneFeedback } from "@/components/ToneFeedback";
import { MysticalOrb } from "@/components/MysticalOrb";
import { GlassCard } from "@/components/GlassCard";
import { InteractiveCard, transitionVariants, getRandomTransition, type TransitionType } from "@/components/InteractiveCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { playSound } from "@/lib/sounds";
import confetti from "canvas-confetti";
import { 
  Flame, 
  Sparkles, 
  Clock,
  Gift,
  Star,
  Medal,
  Lock,
  Briefcase,
  Heart,
  HandHeart,
  Shield,
  Handshake,
  Check,
  MessageSquare,
  Zap,
  Crown,
} from "lucide-react";
import { getRandomHandoff, type PracticeHandoff } from "@shared/promptBank";
import { normalizeReward, formatRewardLabel, type RawDatabaseReward } from "@shared/rewards";
import type { UserProgress, DailyLoginReward } from "@shared/schema";
import { useAuth } from "@/hooks/useAuth";

type PracticePhase = "loading" | "greeting" | "reward" | "hub" | "practice" | "feedback" | "locked" | "signup";

interface ToneAnalysis {
  primaryTone: string;
  secondaryTone?: string | null;
  toneScore: number;
  energy: "low" | "medium" | "high";
  pace: "slow" | "moderate" | "fast";
  emotionalClarity: number;
  strengths: string[];
  areasToImprove: string[];
  alternatives: string[];
  coachingTip: string;
  whyItMatters?: string;
  bodyLanguageTip?: string;
  xpEarned: number;
}

interface UsageData {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: string;
  usedToday: number;
}

interface LoginRewardsResponse {
  currentDay: number;
  canClaimToday: boolean;
  rewards: DailyLoginReward[];
  claimedDays: number[];
}

interface PracticeCategory {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  isNew?: boolean;
  requiredLevel?: number;
  requiresSubscription?: boolean;
  questionCount: number;
}

const PRACTICE_CATEGORIES: PracticeCategory[] = [
  {
    id: "empathy",
    name: "Emotional Support",
    description: "Offer compassion and understanding",
    icon: HandHeart,
    iconBg: "#10b981",
    isNew: true,
    questionCount: 5,
  },
  {
    id: "relationships",
    name: "Personal Connections",
    description: "Strengthen friendships and family bonds",
    icon: Heart,
    iconBg: "#ec4899",
    isNew: true,
    questionCount: 5,
  },
  {
    id: "empathy",
    name: "Addressing Conflict",
    description: "Resolve a disagreement directly with the person involved.",
    icon: MessageSquare,
    iconBg: "#f97316",
    isNew: true,
    questionCount: 5,
  },
];

const LOCKED_CATEGORIES: PracticeCategory[] = [
  {
    id: "workplace",
    name: "Workplace Dynamics",
    description: "Navigate professional conflicts and difficult conversations",
    icon: Briefcase,
    iconBg: "#dc2626",
    requiredLevel: 2,
    questionCount: 5,
  },
  {
    id: "accountability",
    name: "Taking Accountability",
    description: "Own mistakes and make amends",
    icon: Check,
    iconBg: "#6366f1",
    requiredLevel: 3,
    questionCount: 5,
  },
  {
    id: "boundaries",
    name: "Healthy Boundaries",
    description: "Set limits and advocate for yourself",
    icon: Shield,
    iconBg: "#6366f1",
    requiredLevel: 4,
    questionCount: 5,
  },
  {
    id: "feedback",
    name: "Receiving Feedback",
    description: "Accept criticism with grace",
    icon: MessageSquare,
    iconBg: "#8b5cf6",
    requiredLevel: 5,
    questionCount: 5,
  },
  {
    id: "negotiation",
    name: "Negotiation Skills",
    description: "Persuade and find win-win solutions",
    icon: Handshake,
    iconBg: "#ec4899",
    requiredLevel: 6,
    questionCount: 5,
  },
  {
    id: "needs",
    name: "Expressing Needs",
    description: "Communicate desires and ask for help",
    icon: Zap,
    iconBg: "#f59e0b",
    requiredLevel: 7,
    questionCount: 5,
  },
];

const SUBSCRIPTION_CATEGORIES: PracticeCategory[] = [
  {
    id: "leadership",
    name: "Leadership Voice",
    description: "Inspire and guide others with confidence",
    icon: Crown,
    iconBg: "#f59e0b",
    requiresSubscription: true,
    questionCount: 5,
  },
];

export default function PracticeHub() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [phase, setPhase] = useState<PracticePhase>("loading");
  const [claimedReward, setClaimedReward] = useState<RawDatabaseReward | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<WheelCategory | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<PracticeHandoff | null>(null);
  const [lastResponse, setLastResponse] = useState("");
  const [toneAnalysis, setToneAnalysis] = useState<ToneAnalysis | null>(null);
  const [pendingCategory, setPendingCategory] = useState<PracticeCategory | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [wheelSpinsUsed, setWheelSpinsUsed] = useState(0);
  const [categorySessionsUsed, setCategorySessionsUsed] = useState(0);
  const [exitTransition, setExitTransition] = useState<TransitionType | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const isAnonymous = !user;
  const MAX_ANONYMOUS_SESSIONS = 3;
  const MAX_FREE_WHEEL_SPINS = 2;

  const { data: progress, isLoading: progressLoading } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
    enabled: !isAnonymous,
  });

  const { data: loginData, isLoading: loginLoading } = useQuery<LoginRewardsResponse>({
    queryKey: ["/api/login-rewards"],
    enabled: !isAnonymous,
  });

  const { data: usageData, refetch: refetchUsage } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
    enabled: !isAnonymous,
  });

  const isPaidUser = usageData?.tier === "peace_plus" || usageData?.tier === "pro_mind";
  const userLevel = progress?.level || 1;

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/login-rewards/claim");
      return response.json();
    },
    onSuccess: (result) => {
      if (!result.reward || !normalizeReward(result.reward)) {
        setPhase("hub");
        queryClient.invalidateQueries({ queryKey: ["/api/login-rewards"] });
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        return;
      }
      
      setClaimedReward(result.reward);
      setPhase("reward");
      playSound("reward");
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#8B5CF6", "#EC4899", "#06B6D4"],
      });

      queryClient.invalidateQueries({ queryKey: ["/api/login-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });

      setTimeout(() => {
        setPhase("hub");
      }, 3000);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
      setPhase("hub");
    },
  });

  useEffect(() => {
    if (isAnonymous) {
      setPhase("hub");
      return;
    }

    if (!progressLoading && !loginLoading && loginData) {
      if (!loginData.canClaimToday) {
        setPhase("hub");
      } else {
        setPhase("greeting");
        setTimeout(() => {
          claimMutation.mutate();
        }, 2000);
      }
    }
  }, [progressLoading, loginLoading, loginData, isAnonymous]);

  useEffect(() => {
    if (!isAnonymous && !isPaidUser && usageData && !usageData.allowed && phase === "hub") {
      setPhase("locked");
    }
  }, [usageData, isPaidUser, phase, isAnonymous]);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { response: string; prompt: string; category: string; audioBase64?: string; duration?: number }) => {
      const res = await apiRequest("POST", "/api/practice/analyze-voice", data);
      return res.json();
    },
    onSuccess: (result) => {
      setToneAnalysis({
        primaryTone: result.tone || "Neutral",
        secondaryTone: result.secondaryTone || null,
        toneScore: result.score || 75,
        energy: result.energy || "medium",
        pace: result.pace || "moderate",
        emotionalClarity: result.emotionalClarity || result.clarity || 70,
        strengths: result.strengths || [],
        areasToImprove: result.areasToImprove || [],
        alternatives: result.exampleResponses || result.alternatives || [],
        coachingTip:
          result.coachingInsight ||
          result.tip ||
          "You kept your presence steady. Let it land with a clear finish, then add one line to guide the next step.",
        whyItMatters: result.whyItMatters || null,
        bodyLanguageTip: result.bodyLanguageTip || null,
        xpEarned: result.xpEarned || 10,
      });
      setPhase("feedback");
      playSound("success");
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: [selectedCategory?.color || "#8b5cf6", "#ec4899", "#06b6d4"],
      });

      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/usage"] });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCategorySelected = (category: WheelCategory) => {
    if (isAnonymous && wheelSpinsUsed >= 1) {
      setPhase("signup");
      return;
    }

    if (!isAnonymous && !isPaidUser && wheelSpinsUsed >= MAX_FREE_WHEEL_SPINS) {
      setPhase("locked");
      return;
    }

    setWheelSpinsUsed(s => s + 1);
    setSelectedCategory(category);
    const prompt = getRandomHandoff(category.id);
    setCurrentPrompt(prompt);
    
    setTimeout(() => {
      setPhase("practice");
    }, 500);
  };

  const handleCardCategoryClick = (category: PracticeCategory) => {
    if (category.requiredLevel && userLevel < category.requiredLevel) {
      toast({
        title: "Category Locked",
        description: `Reach Level ${category.requiredLevel} to unlock this category.`,
      });
      return;
    }

    if (category.requiresSubscription && !isPaidUser) {
      toast({
        title: "Premium Category",
        description: "Upgrade to Mirror Play+ to access this category.",
      });
      navigate("/subscribe");
      return;
    }

    setPendingCategory(category);
    setShowConfirmModal(true);
  };

  const handleConfirmCategory = () => {
    if (!pendingCategory) return;

    if (isAnonymous && categorySessionsUsed >= MAX_ANONYMOUS_SESSIONS) {
      setShowConfirmModal(false);
      setPhase("signup");
      return;
    }

    setCategorySessionsUsed(s => s + 1);

    const wheelCategory = WHEEL_CATEGORIES.find(c => c.id === pendingCategory.id);
    const categoryToUse = wheelCategory || WHEEL_CATEGORIES[0];
    
    setSelectedCategory(categoryToUse);
    const prompt = getRandomHandoff(categoryToUse.id);
    setCurrentPrompt(prompt);
    setShowConfirmModal(false);
    
    const transition = getRandomTransition();
    setExitTransition(transition);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setPhase("practice");
      setIsTransitioning(false);
      setExitTransition(null);
    }, transition === "genie" ? 600 : transition === "bounce" ? 500 : 400);
  };

  const handlePracticeComplete = (response: string, audioData?: string, duration?: number) => {
    setLastResponse(response);
    
    if (selectedCategory && currentPrompt) {
      analyzeMutation.mutate({
        response,
        prompt: currentPrompt.line,
        category: selectedCategory.id,
        audioBase64: audioData,
        duration,
      });
    }
  };

  const handleSkipPrompt = () => {
    if (selectedCategory) {
      const newPrompt = getRandomHandoff(selectedCategory.id);
      setCurrentPrompt(newPrompt);
    }
  };

  const handleTryAgain = () => {
    setPhase("practice");
    setToneAnalysis(null);
  };

  const handleContinue = async () => {
    if (!isAnonymous) {
      await refetchUsage();
    }
    
    if (isAnonymous && categorySessionsUsed >= MAX_ANONYMOUS_SESSIONS) {
      setPhase("signup");
      return;
    }

    if (!isAnonymous && !isPaidUser && usageData && !usageData.allowed) {
      setPhase("locked");
    } else {
      setPhase("hub");
      setSelectedCategory(null);
      setCurrentPrompt(null);
      setToneAnalysis(null);
    }
  };

  const handleDailyCheckIn = () => {
    if (isAnonymous) {
      navigate("/login");
      return;
    }
    
    if (loginData?.canClaimToday) {
      claimMutation.mutate();
    } else {
      toast({
        title: "Already checked in!",
        description: "Come back tomorrow for your next reward.",
      });
    }
  };

  const getStreakMultiplier = (streak: number) => {
    if (streak >= 30) return 5;
    if (streak >= 14) return 3;
    if (streak >= 7) return 2;
    return 1;
  };

  const streakMultiplier = getStreakMultiplier(progress?.currentStreak || 0);

  if (phase === "loading" || phase === "greeting" || phase === "reward") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          {phase === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
            >
              <MysticalOrb size="lg" isActive className="mx-auto mb-6" />
              <p className="text-muted-foreground">Preparing your session...</p>
            </motion.div>
          )}

          {phase === "greeting" && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="text-center"
              data-testid="checkin-greeting"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <MysticalOrb size="lg" isActive isSpeaking className="mx-auto mb-6" />
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold mb-2"
              >
                Ready to level up?
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-muted-foreground mb-3"
              >
                Let's claim your reward and get started.
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex items-center justify-center gap-2"
              >
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-lg">
                  {progress?.currentStreak || 0} day streak
                </span>
                {streakMultiplier > 1 && (
                  <Badge className="bg-gradient-to-r from-violet-500 to-pink-500">
                    {streakMultiplier}x XP
                  </Badge>
                )}
              </motion.div>
            </motion.div>
          )}

          {phase === "reward" && claimedReward && normalizeReward(claimedReward) && (
            <motion.div
              key="reward"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="text-center"
              data-testid="checkin-reward"
            >
              <motion.div
                className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <Gift className="w-12 h-12 text-white" />
              </motion.div>
              
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl font-bold mb-2"
              >
                Daily Reward!
              </motion.h2>
              
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-lg text-muted-foreground"
              >
                Day {normalizeReward(claimedReward)!.day}: {normalizeReward(claimedReward)!.description}
              </motion.p>
              
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring" }}
                className="mt-4"
              >
                <Badge className="text-lg px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500">
                  {formatRewardLabel(normalizeReward(claimedReward))}
                </Badge>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (phase === "signup") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6 max-w-md"
        >
          <MysticalOrb size="lg" isActive className="mx-auto" />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">You're doing great!</h2>
            <p className="text-muted-foreground">
              Create a free account to continue practicing and track your progress.
            </p>
          </div>

          <div className="pt-4 space-y-3">
            <Button onClick={() => navigate("/login")} className="w-full gap-2">
              <Sparkles className="w-4 h-4" />
              Create Free Account
            </Button>
            <p className="text-xs text-muted-foreground">
              Free accounts get 2 wheel spins per day
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (phase === "locked") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-6"
        >
          <MysticalOrb size="lg" isActive={false} className="mx-auto" />
          
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Nice work today!</h2>
            <p className="text-muted-foreground max-w-sm">
              You've completed your daily practice. Come back tomorrow to continue your journey.
            </p>
          </div>

          <GlassCard className="p-4 inline-flex items-center gap-3">
            <Clock className="w-5 h-5 text-violet-400" />
            <span className="text-sm">Resets at midnight</span>
          </GlassCard>

          <div className="pt-4">
            <Button onClick={() => navigate("/subscribe")} className="gap-2">
              <Sparkles className="w-4 h-4" />
              Unlock Unlimited Practice
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 relative overflow-hidden" data-testid="practice-hub">
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0.3, 0.5, 0.3],
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        style={{
          background: "radial-gradient(ellipse at center, rgba(168, 85, 247, 0.1) 0%, transparent 60%)",
        }}
      />

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="sm:max-w-md" data-testid="category-confirm-modal">
          <DialogHeader>
            <div className="flex items-center gap-3">
              {pendingCategory && (
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: pendingCategory.iconBg }}
                >
                  <pendingCategory.icon className="w-5 h-5 text-white" />
                </div>
              )}
              <DialogTitle>Start {pendingCategory?.name} now.</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              {pendingCategory?.description}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              You'll run {pendingCategory?.questionCount || 5} scenario reps in this category.
              This choice is locked for today unless you use a reroll.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmModal(false)} data-testid="button-cancel">
              Cancel
            </Button>
            <Button onClick={handleConfirmCategory} data-testid="button-confirm">
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AnimatePresence mode="wait">
        {phase === "hub" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="flex flex-col items-center px-4 pt-8 relative z-10"
          >
            <motion.div 
              className="text-center mb-8"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 
                className="text-3xl font-bold bg-gradient-to-r from-violet-400 via-purple-400 to-violet-400 bg-clip-text text-transparent"
                data-testid="text-title"
              >
                Mirror Play
              </h1>
              <p className="text-muted-foreground mt-1" data-testid="text-subtitle">
                Practice with your AI companion to build emotional awareness
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-3 gap-3 w-full max-w-md mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card/50 border-border/50 p-4 text-center" data-testid="stat-streak">
                <Flame className="w-5 h-5 text-orange-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">{isAnonymous ? 0 : (progress?.currentStreak || 0)}</div>
                <div className="text-xs text-muted-foreground">Day Streak</div>
              </Card>

              <Card className="bg-card/50 border-border/50 p-4 text-center" data-testid="stat-practices">
                <Medal className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{isAnonymous ? categorySessionsUsed : (progress?.practiceCount || 0)}</div>
                <div className="text-xs text-muted-foreground">Practices</div>
              </Card>

              <Card className="bg-card/50 border-border/50 p-4 text-center" data-testid="stat-points">
                <Star className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <div className="text-2xl font-bold">{isAnonymous ? 0 : (progress?.totalXp || 0)}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </Card>
            </motion.div>

            <motion.div
              className="w-full max-w-md mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {!isAnonymous && loginData && !loginData.canClaimToday ? (
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-green-500/10 border-green-500/30 text-green-400 cursor-default"
                  disabled
                  data-testid="button-daily-checkin-done"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Checked In
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full h-12 bg-card/30 border-border/50 hover:bg-card/50"
                  onClick={handleDailyCheckIn}
                  data-testid="button-daily-checkin"
                >
                  <Flame className="w-4 h-4 mr-2 text-orange-400" />
                  Daily Check-In
                </Button>
              )}
            </motion.div>

            <motion.div 
              className="relative mb-4"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <SpinWheel
                onCategorySelected={handleCategorySelected}
                disabled={analyzeMutation.isPending}
                hideInstructions
              />
              
              <motion.div 
                className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-20 h-20"
                animate={{
                  opacity: [0.4, 0.7, 0.4],
                  scale: [1, 1.1, 1],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  background: "radial-gradient(circle, rgba(168, 85, 247, 0.6) 0%, transparent 70%)",
                  filter: "blur(8px)",
                }}
              />
            </motion.div>

            <motion.div
              className="text-center mt-12 mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-xl font-semibold mb-1" data-testid="text-category-heading">
                Choose Your Practice Category
              </h2>
              <p className="text-sm text-muted-foreground">
                Select a communication skill to focus on today
              </p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={isTransitioning && exitTransition ? transitionVariants[exitTransition].exit : { opacity: 1, y: 0 }}
              transition={{ delay: isTransitioning ? 0 : 0.6 }}
            >
              {PRACTICE_CATEGORIES.map((category) => (
                <InteractiveCard 
                  key={category.id}
                  className="bg-card/50 border-border/50 p-4"
                  onClick={() => handleCardCategoryClick(category)}
                  data-testid={`card-category-${category.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: category.iconBg }}
                    >
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    {category.isNew && (
                      <Badge variant="secondary" className="text-xs bg-muted/50">
                        <Sparkles className="w-3 h-3 mr-1" />
                        New
                      </Badge>
                    )}
                  </div>
                  <h3 className="font-semibold mb-1">{category.name}</h3>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                </InteractiveCard>
              ))}
            </motion.div>

            <motion.div
              className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Lock className="w-4 h-4" />
              <span>Level up to unlock more categories!</span>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={isTransitioning && exitTransition ? transitionVariants[exitTransition].exit : { opacity: 1, y: 0 }}
              transition={{ delay: isTransitioning ? 0 : 0.8 }}
            >
              {LOCKED_CATEGORIES.map((category) => (
                <Card 
                  key={category.id}
                  className="bg-card/20 border-border/20 p-4 opacity-40"
                  data-testid={`card-category-locked-${category.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center opacity-50"
                      style={{ backgroundColor: category.iconBg }}
                    >
                      <category.icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground/50">
                        <Lock className="w-3 h-3 mr-1" />
                        Lvl {category.requiredLevel}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold mb-1 text-muted-foreground/60">{category.name}</h3>
                  <p className="text-sm text-muted-foreground/40">{category.description}</p>
                </Card>
              ))}
            </motion.div>

            {SUBSCRIPTION_CATEGORIES.length > 0 && (
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl"
                initial={{ opacity: 0, y: 20 }}
                animate={isTransitioning && exitTransition ? transitionVariants[exitTransition].exit : { opacity: 1, y: 0 }}
                transition={{ delay: isTransitioning ? 0 : 0.9 }}
              >
                {SUBSCRIPTION_CATEGORIES.map((category) => (
                  <Card 
                    key={category.id}
                    className="bg-card/20 border-border/20 p-4 opacity-40"
                    data-testid={`card-category-premium-${category.id}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center opacity-50"
                        style={{ backgroundColor: category.iconBg }}
                      >
                        <category.icon className="w-5 h-5 text-white" />
                      </div>
                      <Badge className="text-xs bg-muted/50 text-muted-foreground/50">
                        <Lock className="w-3 h-3 mr-1" />
                        Pro
                      </Badge>
                    </div>
                    <h3 className="font-semibold mb-1 text-muted-foreground/60">{category.name}</h3>
                    <p className="text-sm text-muted-foreground/40">{category.description}</p>
                  </Card>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}

        {phase === "practice" && selectedCategory && currentPrompt && (
          <motion.div
            key="practice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="px-4 pt-4"
          >
            <VoicePracticeSession
              category={selectedCategory}
              prompt={currentPrompt}
              onComplete={handlePracticeComplete}
              onSkip={handleSkipPrompt}
              isProcessing={analyzeMutation.isPending}
            />
          </motion.div>
        )}

        {phase === "feedback" && selectedCategory && toneAnalysis && (
          <motion.div
            key="feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="px-4 pt-4"
          >
            <ToneFeedback
              analysis={toneAnalysis}
              originalResponse={lastResponse}
              category={selectedCategory}
              onContinue={handleContinue}
              onTryAgain={handleTryAgain}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
