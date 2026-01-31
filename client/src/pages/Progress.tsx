import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Flame, 
  Target, 
  Sparkles,
  Star,
  TrendingUp,
  MessageCircle,
  Clock,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import type { UserProgress, PracticeSession } from "@shared/schema";

const toneColors: Record<string, string> = {
  Calm: "bg-blue-500/20 text-blue-400",
  Assertive: "bg-emerald-500/20 text-emerald-400",
  Empathetic: "bg-pink-500/20 text-pink-400",
  Defensive: "bg-amber-500/20 text-amber-400",
  Confident: "bg-violet-500/20 text-violet-400",
  Aggressive: "bg-red-500/20 text-red-400",
  Passive: "bg-gray-500/20 text-gray-400",
  Anxious: "bg-orange-500/20 text-orange-400",
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-blue-500";
  if (score >= 40) return "text-amber-500";
  return "text-orange-500";
};

const getTimeAgo = (date: Date) => {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays}d ago`;
};

export default function Progress() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: sessions = [] } = useQuery<PracticeSession[]>({
    queryKey: ["/api/sessions/recent"],
  });

  const xpToNextLevel = 100;
  const currentLevelXp = progress ? (progress.totalXp || 0) % xpToNextLevel : 0;
  const levelProgress = (currentLevelXp / xpToNextLevel) * 100;

  const toneCounts = sessions.reduce((acc, session) => {
    if (session.tone) {
      acc[session.tone] = (acc[session.tone] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const topTones = Object.entries(toneCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const averageScore = sessions.length > 0
    ? Math.round(sessions.reduce((sum, s) => sum + (s.score || 0), 0) / sessions.length)
    : 0;

  const recentSessions = sessions.slice(0, 5);

  const getProgressMessage = () => {
    if (sessions.length === 0) return "Start practicing to see your insights!";
    if (averageScore >= 80) return "You're doing great! Keep it up.";
    if (averageScore >= 60) return "Good progress! Focus on your tips.";
    return "Every practice makes you stronger.";
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="progress-page">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Progress</h1>
        <p className="text-muted-foreground">Your journey so far</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="flex items-center gap-6">
          <div className="relative">
            <ProgressRing 
              progress={levelProgress} 
              size={80} 
              strokeWidth={6}
              showPercentage={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{progress?.level || 1}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Star className="w-5 h-5 text-amber-500" />
              <span className="text-xl font-bold">Level {progress?.level || 1}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              {currentLevelXp}/{xpToNextLevel} XP to next level
            </p>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div 
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard variant="dark" className="text-center py-5">
          <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-orange-500/20">
            <Flame className="w-5 h-5 text-orange-500" />
          </div>
          <p className="text-2xl font-bold">{progress?.currentStreak || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Day Streak</p>
        </GlassCard>

        <GlassCard variant="dark" className="text-center py-5">
          <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-emerald-500/20">
            <Target className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold">{progress?.practiceCount || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Sessions</p>
        </GlassCard>

        <GlassCard variant="dark" className="text-center py-5">
          <div className="w-10 h-10 rounded-xl mx-auto mb-2 flex items-center justify-center bg-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-500" />
          </div>
          <p className="text-2xl font-bold">{progress?.totalXp || 0}</p>
          <p className="text-xs text-muted-foreground mt-1">Total XP</p>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Link href="/tone-journey" data-testid="link-tone-journey">
          <GlassCard variant="dark" className="flex items-center justify-between hover-elevate cursor-pointer" data-testid="card-tone-journey">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/20" data-testid="icon-tone-journey">
                <BarChart3 className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="font-medium" data-testid="text-tone-journey-title">Your Tone Journey</p>
                <p className="text-xs text-muted-foreground" data-testid="text-tone-journey-subtitle">Track mastery across all tones</p>
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-muted-foreground" data-testid="icon-tone-journey-arrow" />
          </GlassCard>
        </Link>
      </motion.div>

      {sessions.length > 0 && (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <GlassCard variant="dark" className="space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h3 className="font-semibold">Your Tone Profile</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-3xl font-bold">{averageScore}%</p>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                </div>
                
                <div className="flex flex-wrap gap-2 justify-end">
                  {topTones.map(([tone, count]) => (
                    <Badge 
                      key={tone} 
                      className={toneColors[tone] || "bg-muted text-muted-foreground"}
                    >
                      {tone} ({count})
                    </Badge>
                  ))}
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground">
                {getProgressMessage()}
              </p>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recent Practice</h3>
            </div>
            
            <div className="space-y-2">
              {recentSessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                >
                  <GlassCard variant="dark" className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-violet-500/10`}>
                        <span className={`text-sm font-bold ${getScoreColor(session.score || 0)}`}>
                          {session.score || 0}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {session.tone && (
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${toneColors[session.tone] || ""}`}
                            >
                              {session.tone}
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground capitalize">
                            {session.category || "General"}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {session.prompt?.slice(0, 60)}...
                        </p>
                      </div>
                      
                      <div className="text-right shrink-0">
                        <p className="text-xs text-muted-foreground">
                          {getTimeAgo(session.createdAt as Date)}
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}

      {sessions.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard variant="dark" className="text-center py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-lg font-medium mb-2">Start your journey</p>
            <p className="text-muted-foreground text-sm">
              Complete a practice session to see your tone analysis and progress.
            </p>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
