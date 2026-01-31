import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Snowflake, Gift, Clock, ChevronRight } from "lucide-react";
import type { SeasonalEvent, SeasonalReward, UserSeasonalProgress } from "@shared/schema";

interface EventData {
  event: SeasonalEvent | null;
  userProgress: UserSeasonalProgress | null;
  rewards: SeasonalReward[];
}

function getTimeRemaining(endDate: Date): string {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();
  
  if (diff <= 0) return "Event ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  
  if (days > 0) return `${days}d ${hours}h left`;
  return `${hours}h left`;
}

function getNextReward(rewards: SeasonalReward[], progress: number): SeasonalReward | null {
  const sorted = [...rewards].sort((a, b) => a.requiredProgress - b.requiredProgress);
  return sorted.find(r => r.requiredProgress > progress) || null;
}

export function EventBanner() {
  const { data, isLoading } = useQuery<EventData>({
    queryKey: ["/api/events/active"],
  });

  if (isLoading || !data?.event) {
    return null;
  }

  const { event, userProgress, rewards } = data;
  const progress = userProgress?.progress || 0;
  const nextReward = getNextReward(rewards, progress);
  const maxProgress = rewards.length > 0 
    ? Math.max(...rewards.map(r => r.requiredProgress))
    : 15;
  const progressPercent = Math.min((progress / maxProgress) * 100, 100);
  const unclaimedRewards = rewards.filter(r => 
    r.requiredProgress <= progress && 
    !userProgress?.rewardsClaimed?.includes(r.id)
  ).length;
  const accentColor = event.accentColor || "#8B5CF6";

  return (
    <Link href={`/events/${event.id}`}>
      <motion.div
        data-testid="event-banner"
        className="relative overflow-hidden rounded-xl cursor-pointer"
        style={{
          background: `linear-gradient(135deg, ${accentColor}20 0%, ${accentColor}10 100%)`,
          borderColor: `${accentColor}40`,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            background: `radial-gradient(circle at 80% 20%, ${accentColor}30 0%, transparent 50%)`,
          }}
        />
        
        <div className="relative p-4 border rounded-xl" style={{ borderColor: `${accentColor}40` }}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <div 
                className="p-2 rounded-lg" 
                style={{ backgroundColor: `${accentColor}30` }}
              >
                <Snowflake className="w-5 h-5" style={{ color: accentColor }} />
              </div>
              <div>
                <h3 className="font-semibold text-base">{event.name}</h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeRemaining(event.endDate)}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {unclaimedRewards > 0 && (
                <Badge 
                  variant="default" 
                  className="text-xs"
                  style={{ backgroundColor: accentColor }}
                >
                  <Gift className="w-3 h-3 mr-1" />
                  {unclaimedRewards} to claim
                </Badge>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {progress} / {maxProgress} practices
              </span>
              {nextReward && (
                <span style={{ color: accentColor }}>
                  Next: {nextReward.name} ({nextReward.requiredProgress - progress} more)
                </span>
              )}
            </div>
            <Progress 
              value={progressPercent} 
              className="h-2"
              style={{ 
                ["--progress-background" as string]: `${accentColor}30`,
                ["--progress-foreground" as string]: accentColor,
              }}
            />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
