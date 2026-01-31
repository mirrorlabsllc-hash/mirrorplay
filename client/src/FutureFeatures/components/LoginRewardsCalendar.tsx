import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { 
  Sparkles, 
  Heart, 
  Check, 
  Gift,
  Award,
  Flame
} from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DailyLoginReward } from "@shared/schema";
import { normalizeReward, formatRewardType } from "@shared/rewards";

interface LoginRewardsResponse {
  rewards: DailyLoginReward[];
  currentDay: number;
  claimedDays: number[];
  canClaimToday: boolean;
  cycleStartDate: string;
  streakCount: number;
}

export function LoginRewardsCalendar() {
  const { toast } = useToast();
  const [showCelebration, setShowCelebration] = useState(false);
  const [claimedReward, setClaimedReward] = useState<DailyLoginReward | null>(null);

  const { data, isLoading } = useQuery<LoginRewardsResponse>({
    queryKey: ["/api/login-rewards"],
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/login-rewards/claim");
      return response.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/login-rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      
      const normalized = normalizeReward(result.reward);
      if (!normalized) {
        toast({
          title: "Reward Claimed",
          description: "Your reward was claimed. Check your progress!",
        });
        return;
      }
      
      setClaimedReward(result.reward);
      setShowCelebration(true);
      
      setTimeout(() => {
        setShowCelebration(false);
        setClaimedReward(null);
      }, 3000);
      
      toast({
        title: "Reward Claimed!",
        description: `You earned ${normalized.description}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim reward. Try again later.",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !data) {
    return (
      <GlassCard variant="dark" className="animate-pulse">
        <div className="h-32 bg-muted/20 rounded-lg" />
      </GlassCard>
    );
  }

  const getRewardIcon = (rewardType: string, day: number) => {
    if (day === 7) return <Award className="w-5 h-5" />;
    if (rewardType === "xp") return <Sparkles className="w-5 h-5" />;
    if (rewardType === "pp") return <Heart className="w-5 h-5" />;
    return <Gift className="w-5 h-5" />;
  };

  const getRewardColor = (rewardType: string, day: number) => {
    if (day === 7) return "text-yellow-400";
    if (rewardType === "xp") return "text-violet-400";
    return "text-pink-400";
  };

  return (
    <GlassCard 
      variant="dark" 
      className="relative overflow-visible"
      data-testid="login-rewards-calendar"
    >
      <AnimatePresence>
        {showCelebration && claimedReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ duration: 0.5 }}
                className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center mb-4"
              >
                <Check className="w-10 h-10 text-white" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-lg font-bold"
              >
                {claimedReward.description}
              </motion.p>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex justify-center gap-1 mt-2"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ y: 0 }}
                    animate={{ y: [-10, 0, -5, 0] }}
                    transition={{ delay: 0.6 + i * 0.1, duration: 0.5 }}
                  >
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Daily Login Rewards</h3>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Flame className="w-4 h-4 text-orange-400" />
          <span>{data.streakCount} day{data.streakCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {data.rewards.map((reward) => {
          const normalized = normalizeReward(reward);
          const isClaimed = data.claimedDays.includes(reward.day);
          const isCurrentDay = reward.day === data.currentDay;
          const isFuture = reward.day > data.currentDay;
          const canClaim = isCurrentDay && data.canClaimToday;

          return (
            <motion.div
              key={reward.day}
              className={`flex-shrink-0 w-14 flex flex-col items-center p-2 rounded-lg transition-all ${
                isClaimed
                  ? "bg-green-500/20 border border-green-500/30"
                  : isCurrentDay
                  ? "bg-primary/20 border border-primary/50 shadow-lg shadow-primary/20"
                  : isFuture
                  ? "bg-muted/10 opacity-50"
                  : "bg-muted/20"
              }`}
              whileHover={canClaim ? { scale: 1.05 } : undefined}
              data-testid={`reward-day-${reward.day}`}
            >
              <span className="text-xs text-muted-foreground mb-1">Day {reward.day}</span>
              <div 
                className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  isClaimed 
                    ? "bg-green-500/30" 
                    : isCurrentDay 
                    ? "bg-primary/30"
                    : "bg-muted/20"
                }`}
              >
                {isClaimed ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <span className={getRewardColor(reward.rewardType, reward.day)}>
                    {getRewardIcon(reward.rewardType, reward.day)}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">
                {normalized?.value ?? 0} {formatRewardType(normalized?.type)}
              </span>
              {reward.day === 7 && !isClaimed && (
                <span className="text-[10px] text-yellow-400">+Badge</span>
              )}
            </motion.div>
          );
        })}
      </div>

      {data.canClaimToday && (
        <motion.div 
          className="mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="w-full bg-gradient-to-r from-violet-500 to-pink-500"
            data-testid="button-claim-reward"
          >
            {claimMutation.isPending ? (
              "Claiming..."
            ) : (
              <>
                <Gift className="w-4 h-4 mr-2" />
                Claim Day {data.currentDay} Reward
              </>
            )}
          </Button>
        </motion.div>
      )}

      {!data.canClaimToday && data.claimedDays.includes(data.currentDay) && (
        <p className="mt-3 text-center text-sm text-muted-foreground">
          Come back tomorrow for your next reward!
        </p>
      )}
    </GlassCard>
  );
}
