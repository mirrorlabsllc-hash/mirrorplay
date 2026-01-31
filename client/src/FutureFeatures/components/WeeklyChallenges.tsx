import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Target, 
  Flame, 
  Mic, 
  Trophy,
  Clock,
  Sparkles,
  Check,
  Gift,
  Loader2
} from "lucide-react";
import confetti from "canvas-confetti";
import { useState, useEffect } from "react";

interface WeeklyChallengeData {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  goalType: string;
  goalValue: number;
  goalThreshold: number | null;
  xpReward: number | null;
  ppReward: number | null;
  weekStartDate: string;
  weekEndDate: string;
  userProgress: number;
  completed: boolean;
  completedAt: string | null;
  rewardClaimed: boolean;
}

interface WeeklyChallengesResponse {
  challenges: WeeklyChallengeData[];
  daysRemaining: number;
  weekEndDate: string;
}

function getChallengeIcon(goalType: string) {
  switch (goalType) {
    case "practice_count":
      return <Target className="w-4 h-4" />;
    case "score_threshold":
      return <Trophy className="w-4 h-4" />;
    case "streak":
      return <Flame className="w-4 h-4" />;
    case "voice_practice":
      return <Mic className="w-4 h-4" />;
    case "category_variety":
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Target className="w-4 h-4" />;
  }
}

function ChallengeItem({ 
  challenge, 
  onClaimSuccess 
}: { 
  challenge: WeeklyChallengeData;
  onClaimSuccess: () => void;
}) {
  const { toast } = useToast();
  const [justCompleted, setJustCompleted] = useState(false);
  
  const claimMutation = useMutation({
    mutationFn: async () => {
      return apiRequest(`/api/weekly-challenges/${challenge.id}/claim`, { method: "POST" });
    },
    onSuccess: (data: any) => {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#8b5cf6', '#ec4899', '#f59e0b'],
      });
      toast({ 
        title: "Reward Claimed!", 
        description: `+${data.xpEarned} XP, +${data.ppEarned} PP` 
      });
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-challenges"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      onClaimSuccess();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const progressPercent = Math.min((challenge.userProgress / challenge.goalValue) * 100, 100);
  const isCompleted = challenge.completed;
  const canClaim = isCompleted && !challenge.rewardClaimed;

  useEffect(() => {
    if (isCompleted && !challenge.rewardClaimed) {
      setJustCompleted(true);
    }
  }, [isCompleted, challenge.rewardClaimed]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-3 rounded-lg border transition-all ${
        isCompleted 
          ? "bg-primary/5 border-primary/20" 
          : "bg-card/50 border-border/50"
      }`}
      data-testid={`weekly-challenge-${challenge.id}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
          isCompleted 
            ? "bg-primary/20 text-primary" 
            : "bg-muted text-muted-foreground"
        }`}>
          {challenge.rewardClaimed ? (
            <Check className="w-4 h-4" />
          ) : (
            getChallengeIcon(challenge.goalType)
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-sm font-medium ${isCompleted ? "text-primary" : ""}`}>
              {challenge.title}
            </h4>
            {challenge.rewardClaimed && (
              <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                Claimed
              </span>
            )}
          </div>
          
          {!challenge.rewardClaimed && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {challenge.userProgress} / {challenge.goalValue}
                </span>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {challenge.xpReward} XP
                  {(challenge.ppReward || 0) > 0 && (
                    <span className="ml-1 text-purple-400">+{challenge.ppReward} PP</span>
                  )}
                </span>
              </div>
              <Progress 
                value={progressPercent} 
                className="h-1.5" 
              />
            </div>
          )}
          
          <AnimatePresence>
            {canClaim && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <Button
                  size="sm"
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  className="w-full"
                  data-testid={`button-claim-${challenge.id}`}
                >
                  {claimMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Gift className="w-3 h-3 mr-1" />
                  )}
                  Claim Reward
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

export function WeeklyChallenges() {
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery<WeeklyChallengesResponse>({
    queryKey: ["/api/weekly-challenges"],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/weekly-challenges/seed", { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/weekly-challenges"] });
      toast({ title: "Challenges created for this week!" });
    },
  });

  useEffect(() => {
    if (data && data.challenges.length === 0 && !seedMutation.isPending) {
      seedMutation.mutate();
    }
  }, [data, seedMutation.isPending]);

  const handleClaimSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/weekly-challenges/uncompleted-count"] });
  };

  if (isLoading) {
    return (
      <GlassCard className="p-4" data-testid="weekly-challenges">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="font-semibold">Weekly Challenges</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
          ))}
        </div>
      </GlassCard>
    );
  }

  if (error || !data) {
    return null;
  }

  const { challenges, daysRemaining } = data;
  const completedCount = challenges.filter(c => c.rewardClaimed).length;

  return (
    <GlassCard className="p-4" data-testid="weekly-challenges">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-primary/20 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="font-semibold">Weekly Challenges</h3>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>{daysRemaining}d left</span>
        </div>
      </div>

      {challenges.length === 0 ? (
        <div className="text-center py-6 text-muted-foreground text-sm">
          {seedMutation.isPending ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating challenges...</span>
            </div>
          ) : (
            <span>No challenges available this week</span>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted-foreground">
              {completedCount} of {challenges.length} completed
            </span>
            <div className="flex gap-1">
              {challenges.map((c, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${
                    c.rewardClaimed 
                      ? "bg-primary" 
                      : c.completed 
                        ? "bg-primary/50" 
                        : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {challenges.map((challenge) => (
              <ChallengeItem 
                key={challenge.id} 
                challenge={challenge}
                onClaimSuccess={handleClaimSuccess}
              />
            ))}
          </div>
        </>
      )}
    </GlassCard>
  );
}
