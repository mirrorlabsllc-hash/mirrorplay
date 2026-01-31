import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Award,
  Flame,
  Target,
  Star,
  Sparkles,
  Share2,
  Zap,
  Trophy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WeeklyRecapData {
  weekStart: string;
  weekEnd: string;
  totalSessions: number;
  averageScore: number;
  totalXpEarned: number;
  totalPpEarned: number;
  currentStreak: number;
  bestStreak: number;
  categoriesPracticed: string[];
  bestSession: { score: number; prompt: string; category: string } | null;
  bestMoment: { id: string; title: string; score: number; category: string; excerpt: string } | null;
  badgesEarned: { id: string; name: string; icon: string; earnedAt: string }[];
  trends: {
    sessions: number;
    score: number;
    xp: number;
    pp: number;
  };
  lastWeekStats: {
    totalSessions: number;
    averageScore: number;
    totalXpEarned: number;
    totalPpEarned: number;
  };
  encouragingMessage: string;
}

function TrendIndicator({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value > 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-500">
        <TrendingUp className="w-3 h-3" />
        +{value}{suffix}
      </span>
    );
  } else if (value < 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-red-400">
        <TrendingDown className="w-3 h-3" />
        {value}{suffix}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
      <Minus className="w-3 h-3" />
      0{suffix}
    </span>
  );
}

function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  trend, 
  trendSuffix = "",
  color,
  bgColor,
  delay 
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  trend?: number;
  trendSuffix?: string;
  color: string;
  bgColor: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 200 }}
    >
      <GlassCard variant="dark" className="text-center py-4 px-3">
        <div className={`w-10 h-10 rounded-lg mx-auto mb-2 flex items-center justify-center ${bgColor}`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        {trend !== undefined && (
          <TrendIndicator value={trend} suffix={trendSuffix} />
        )}
      </GlassCard>
    </motion.div>
  );
}

export function WeeklyRecap() {
  const { toast } = useToast();
  
  const { data: recap, isLoading, error } = useQuery<WeeklyRecapData>({
    queryKey: ["/api/weekly-recap"],
  });

  const handleShare = async () => {
    if (!recap) return;
    
    const shareText = `My Mirror Play Weekly Recap:\n${recap.totalSessions} sessions | Avg Score: ${recap.averageScore}% | ${recap.totalXpEarned} XP earned\n${recap.encouragingMessage}`;
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: "My Weekly Recap - Mirror Play",
          text: shareText,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied to clipboard!",
          description: "Share your weekly progress with others.",
        });
      }
    } catch {
      toast({
        title: "Share",
        description: shareText,
      });
    }
  };

  if (isLoading) {
    return (
      <GlassCard variant="glow" className="space-y-4" data-testid="weekly-recap-loading">
        <div className="flex items-center gap-2">
          <Skeleton className="w-6 h-6 rounded" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </GlassCard>
    );
  }

  if (error || !recap) {
    return null;
  }

  const formatDateRange = () => {
    const start = new Date(recap.weekStart);
    const end = new Date(recap.weekEnd);
    const options: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
  };

  const scoreProgress = Math.min((recap.averageScore / 100) * 100, 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="weekly-recap"
    >
      <GlassCard variant="glow" className="space-y-4">
        <motion.div 
          className="flex items-center justify-between gap-4 flex-wrap"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold" data-testid="text-weekly-recap-title">
                Weekly Recap
              </h2>
              <p className="text-xs text-muted-foreground" data-testid="text-weekly-recap-date">
                {formatDateRange()}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleShare}
            data-testid="button-share-weekly-recap"
          >
            <Share2 className="w-4 h-4 mr-1" />
            Share
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-primary/5 rounded-lg p-3"
        >
          <p 
            className="text-sm text-center"
            data-testid="text-encouraging-message"
          >
            <Sparkles className="w-4 h-4 inline mr-1 text-amber-500" />
            {recap.encouragingMessage}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Target}
            label="Sessions"
            value={recap.totalSessions}
            trend={recap.trends.sessions}
            color="text-emerald-500"
            bgColor="bg-emerald-500/20"
            delay={0.2}
          />
          <StatCard
            icon={Trophy}
            label="Avg Score"
            value={`${recap.averageScore}%`}
            trend={recap.trends.score}
            trendSuffix="%"
            color="text-amber-500"
            bgColor="bg-amber-500/20"
            delay={0.25}
          />
          <StatCard
            icon={Zap}
            label="XP Earned"
            value={recap.totalXpEarned}
            trend={recap.trends.xp}
            color="text-purple-500"
            bgColor="bg-purple-500/20"
            delay={0.3}
          />
          <StatCard
            icon={Star}
            label="Peace Points"
            value={recap.totalPpEarned}
            trend={recap.trends.pp}
            color="text-pink-500"
            bgColor="bg-pink-500/20"
            delay={0.35}
          />
        </div>

        {recap.currentStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
          >
            <GlassCard variant="dark" className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Flame className="w-6 h-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium" data-testid="text-streak-count">
                  {recap.currentStreak} Day Streak
                </p>
                <p className="text-xs text-muted-foreground">
                  Best: {recap.bestStreak} days
                </p>
              </div>
              {recap.currentStreak >= 7 && (
                <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
                  On Fire
                </Badge>
              )}
            </GlassCard>
          </motion.div>
        )}

        {recap.categoriesPracticed.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="space-y-2"
          >
            <p className="text-sm text-muted-foreground">Categories Practiced</p>
            <div className="flex flex-wrap gap-2">
              {recap.categoriesPracticed.map((category, index) => (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Badge 
                    variant="secondary" 
                    className="capitalize"
                    data-testid={`badge-category-${category}`}
                  >
                    {category}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {recap.bestMoment && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
          >
            <GlassCard variant="dark" className="space-y-2" data-testid="card-best-moment">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Best Moment</span>
                <Badge 
                  variant="outline" 
                  className="ml-auto text-xs text-amber-500 border-amber-500/30"
                >
                  Score: {recap.bestMoment.score}
                </Badge>
              </div>
              <p 
                className="text-sm font-medium"
                data-testid="text-best-moment-title"
              >
                {recap.bestMoment.title}
              </p>
              <p 
                className="text-xs text-muted-foreground italic"
                data-testid="text-best-moment-excerpt"
              >
                "{recap.bestMoment.excerpt}"
              </p>
            </GlassCard>
          </motion.div>
        )}

        <AnimatePresence>
          {recap.badgesEarned.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ delay: 0.6 }}
              className="space-y-2"
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Badges Earned This Week</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {recap.badgesEarned.map((badge, index) => (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ 
                      delay: 0.65 + index * 0.1,
                      type: "spring",
                      stiffness: 300
                    }}
                  >
                    <GlassCard 
                      variant="dark" 
                      className="flex items-center gap-2 py-2 px-3"
                      data-testid={`badge-earned-${badge.id}`}
                    >
                      <span className="text-xl">{badge.icon}</span>
                      <span className="text-xs font-medium">{badge.name}</span>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {recap.averageScore > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="flex items-center justify-center pt-2"
          >
            <div className="text-center">
              <ProgressRing
                progress={scoreProgress}
                size={80}
                strokeWidth={6}
                showPercentage={false}
              />
              <p className="text-xs text-muted-foreground mt-2">Overall Performance</p>
            </div>
          </motion.div>
        )}
      </GlassCard>
    </motion.div>
  );
}
