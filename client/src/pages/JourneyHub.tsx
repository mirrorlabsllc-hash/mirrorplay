import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { InteractiveGlassCard } from "@/components/InteractiveGlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Trophy,
  Star,
  ChevronRight,
  Flame,
  Target,
  Sparkles,
} from "lucide-react";
import type { UserProgress } from "@shared/schema";

export default function JourneyHub() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: challengeData } = useQuery<{ count: number }>({
    queryKey: ["/api/weekly-challenges/uncompleted-count"],
  });

  const xpToNextLevel = 100;
  const currentLevelXp = progress ? (progress.totalXp || 0) % xpToNextLevel : 0;
  const levelProgress = (currentLevelXp / xpToNextLevel) * 100;

  const journeyItems = [
    {
      id: "story",
      icon: BookOpen,
      title: "Story Mode",
      description: "Guided emotional journey",
      href: "/story",
      color: "from-violet-500 to-purple-500",
      badge: "5 Chapters",
    },
    {
      id: "challenges",
      icon: Trophy,
      title: "Weekly Challenge",
      description: "One focus, one goal",
      href: "/challenges",
      color: "from-amber-500 to-orange-500",
      badge: challengeData?.count ? "Active" : null,
    },
  ];

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="journey-hub">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-bold">Journey</h1>
        <p className="text-muted-foreground">Your path to emotional mastery</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="relative overflow-visible">
          <div className="flex items-center gap-4">
            <div className="relative">
              <ProgressRing 
                progress={levelProgress} 
                size={70} 
                strokeWidth={5}
                showPercentage={false}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold">{progress?.level || 1}</span>
              </div>
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star className="w-4 h-4 text-primary" />
                <span className="font-semibold">Level {progress?.level || 1}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentLevelXp}/{xpToNextLevel} XP to next level
              </p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span className="text-sm">{progress?.currentStreak || 0} days</span>
                </div>
                <div className="flex items-center gap-1">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm">{progress?.practiceCount || 0} sessions</span>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="dark" className="text-center py-4">
            <Sparkles className="w-6 h-6 text-violet-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{progress?.totalXp || 0}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </GlassCard>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard variant="dark" className="text-center py-4">
            <Target className="w-6 h-6 text-pink-400 mx-auto mb-2" />
            <p className="text-2xl font-bold">{progress?.practiceCount || 0}</p>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </GlassCard>
        </motion.div>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-lg">Continue Your Journey</h2>
        
        {journeyItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
          >
            <Link to={item.href}>
              <InteractiveGlassCard 
                variant="dark" 
                data-testid={`journey-item-${item.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                    <item.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {item.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </InteractiveGlassCard>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
