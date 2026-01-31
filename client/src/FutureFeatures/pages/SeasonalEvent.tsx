import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Snowflake, 
  Gift, 
  Clock, 
  Check, 
  Lock, 
  Sparkles,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import type { SeasonalEvent, SeasonalReward, UserSeasonalProgress } from "@shared/schema";

interface EventData {
  event: SeasonalEvent | null;
  userProgress: UserSeasonalProgress | null;
  rewards: SeasonalReward[];
}

function getTimeRemaining(endDate: Date): { days: number; hours: number; minutes: number } {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0 };
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  return { days, hours, minutes };
}

function getRewardTypeIcon(type: string) {
  switch (type) {
    case "xp":
      return <Sparkles className="w-4 h-4" />;
    case "pp":
      return <Gift className="w-4 h-4" />;
    default:
      return <Gift className="w-4 h-4" />;
  }
}

function getRewardTypeLabel(type: string, value: number) {
  switch (type) {
    case "xp":
      return `+${value} XP`;
    case "pp":
      return `+${value} PP`;
    case "cosmetic":
      return "Cosmetic Item";
    case "badge":
      return "Special Badge";
    default:
      return "Reward";
  }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function SeasonalEvent() {
  const params = useParams();
  const eventId = params.id;
  const { toast } = useToast();

  const { data, isLoading } = useQuery<EventData>({
    queryKey: ["/api/events", eventId],
  });

  const claimMutation = useMutation({
    mutationFn: async (rewardId: string) => {
      const res = await apiRequest("POST", `/api/events/${eventId}/claim-reward`, { rewardId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Reward Claimed!",
        description: `You received ${data.reward.name}!`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data?.event) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Event not found</p>
          <Link href="/">
            <Button variant="ghost" className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { event, userProgress, rewards } = data;
  const progress = userProgress?.progress || 0;
  const claimedRewards = userProgress?.rewardsClaimed || [];
  const maxProgress = rewards.length > 0 
    ? Math.max(...rewards.map(r => r.requiredProgress))
    : 15;
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);
  const timeRemaining = getTimeRemaining(event.endDate);
  const isEventActive = new Date() >= new Date(event.startDate) && new Date() <= new Date(event.endDate);
  const accentColor = event.accentColor || "#8B5CF6";

  return (
    <div 
      data-testid="seasonal-event"
      className="min-h-screen pb-24 pt-4 px-4 space-y-6"
    >
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Seasonal Event</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${accentColor}25 0%, ${accentColor}10 50%, transparent 100%)`,
        }}
      >
        <div 
          className="absolute inset-0"
          style={{
            background: `radial-gradient(circle at 90% 10%, ${accentColor}30 0%, transparent 40%)`,
          }}
        />
        
        <div className="relative p-6 border rounded-2xl" style={{ borderColor: `${accentColor}30` }}>
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="p-3 rounded-xl" 
              style={{ backgroundColor: `${accentColor}30` }}
            >
              <Snowflake className="w-8 h-8" style={{ color: accentColor }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{event.name}</h2>
              <Badge variant="outline" className="mt-1" style={{ borderColor: accentColor, color: accentColor }}>
                {event.theme.charAt(0).toUpperCase() + event.theme.slice(1)} Event
              </Badge>
            </div>
          </div>

          <p className="text-muted-foreground mb-6">{event.description}</p>

          {isEventActive && (
            <div className="flex items-center gap-6 p-4 rounded-xl bg-background/50">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" style={{ color: accentColor }} />
                <span className="text-sm font-medium">Time Remaining</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: accentColor }}>{timeRemaining.days}</div>
                  <div className="text-xs text-muted-foreground">days</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: accentColor }}>{timeRemaining.hours}</div>
                  <div className="text-xs text-muted-foreground">hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold" style={{ color: accentColor }}>{timeRemaining.minutes}</div>
                  <div className="text-xs text-muted-foreground">mins</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Your Progress</h3>
          <span className="text-lg font-bold" style={{ color: accentColor }}>
            {progress} / {maxProgress}
          </span>
        </div>
        <Progress 
          value={progressPercent} 
          className="h-3 mb-2"
        />
        <p className="text-xs text-muted-foreground">
          Complete practices during the event to earn rewards
        </p>
      </GlassCard>

      <div>
        <h3 className="font-semibold mb-4">Rewards</h3>
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {rewards.map((reward) => {
            const isUnlocked = progress >= reward.requiredProgress;
            const isClaimed = claimedRewards.includes(reward.id);
            const canClaim = isUnlocked && !isClaimed && isEventActive;

            return (
              <motion.div key={reward.id} variants={staggerItem}>
                <GlassCard 
                  className={`p-4 transition-all ${isUnlocked ? '' : 'opacity-60'}`}
                  style={{
                    borderColor: isUnlocked && !isClaimed ? `${accentColor}50` : undefined,
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2 rounded-lg"
                        style={{ 
                          backgroundColor: isUnlocked ? `${accentColor}25` : 'hsl(var(--muted))',
                        }}
                      >
                        {isClaimed ? (
                          <Check className="w-5 h-5 text-green-500" />
                        ) : isUnlocked ? (
                          getRewardTypeIcon(reward.type)
                        ) : (
                          <Lock className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{reward.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {reward.description}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge 
                          variant="secondary"
                          style={isUnlocked ? { backgroundColor: `${accentColor}20`, color: accentColor } : {}}
                        >
                          {getRewardTypeLabel(reward.type, reward.value)}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {reward.requiredProgress} practices
                        </div>
                      </div>

                      {canClaim && (
                        <Button
                          size="sm"
                          onClick={() => claimMutation.mutate(reward.id)}
                          disabled={claimMutation.isPending}
                          style={{ backgroundColor: accentColor }}
                          data-testid={`button-claim-${reward.id}`}
                        >
                          {claimMutation.isPending ? "..." : "Claim"}
                        </Button>
                      )}

                      {isClaimed && (
                        <Badge variant="outline" className="text-green-500 border-green-500/50">
                          Claimed
                        </Badge>
                      )}
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {!isEventActive && (
        <GlassCard className="p-4 text-center">
          <p className="text-muted-foreground">
            This event has ended. Stay tuned for future seasonal events!
          </p>
        </GlassCard>
      )}
    </div>
  );
}
