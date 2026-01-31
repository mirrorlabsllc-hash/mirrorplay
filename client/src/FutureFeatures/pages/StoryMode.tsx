import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useState } from "react";
import confetti from "canvas-confetti";
import {
  BookOpen,
  Lock,
  Check,
  ChevronRight,
  ArrowLeft,
  Heart,
  Shield,
  Ear,
  Scale,
  Crown,
  Sparkles,
  Trophy,
  Play,
} from "lucide-react";

interface ChapterProgress {
  scenariosCompleted: string[];
  isComplete: boolean;
}

interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  description: string;
  theme: string;
  scenarioIds: string[];
  xpReward: number;
  ppReward: number;
  unlockLevel: number;
  progress: ChapterProgress | null;
  isUnlocked: boolean;
  completedCount: number;
  totalScenarios: number;
}

interface ChapterDetail extends StoryChapter {
  scenarios: {
    id: string;
    title: string;
    description: string;
    category: string;
    isCompleted: boolean;
  }[];
}

const themeIcons: Record<string, typeof Heart> = {
  assertiveness: Shield,
  empathy: Heart,
  listening: Ear,
  conflict: Scale,
  leadership: Crown,
};

const themeColors: Record<string, string> = {
  assertiveness: "from-emerald-500 to-teal-600",
  empathy: "from-pink-500 to-rose-600",
  listening: "from-blue-500 to-indigo-600",
  conflict: "from-orange-500 to-amber-600",
  leadership: "from-violet-500 to-purple-600",
};

const themeBgColors: Record<string, string> = {
  assertiveness: "bg-emerald-500/20",
  empathy: "bg-pink-500/20",
  listening: "bg-blue-500/20",
  conflict: "bg-orange-500/20",
  leadership: "bg-violet-500/20",
};

const themeTextColors: Record<string, string> = {
  assertiveness: "text-emerald-500",
  empathy: "text-pink-500",
  listening: "text-blue-500",
  conflict: "text-orange-500",
  leadership: "text-violet-500",
};

export default function StoryMode() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [selectedChapter, setSelectedChapter] = useState<ChapterDetail | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationData, setCelebrationData] = useState<{ xp: number; pp: number } | null>(null);

  const { data: chapters = [], isLoading } = useQuery<StoryChapter[]>({
    queryKey: ["/api/story"],
  });

  const seedMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/story/seed"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/story"] });
      toast({ title: "Story chapters seeded!" });
    },
  });

  const completeScenarioMutation = useMutation({
    mutationFn: ({ chapterId, scenarioId }: { chapterId: string; scenarioId: string }) =>
      apiRequest("POST", `/api/story/${chapterId}/complete-scenario`, { scenarioId }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/story"] });
      if (selectedChapter) {
        queryClient.invalidateQueries({ queryKey: ["/api/story", selectedChapter.id] });
      }
      
      if (data.chapterJustCompleted) {
        setCelebrationData({ xp: data.xpEarned, pp: data.ppEarned });
        setShowCelebration(true);
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    },
  });

  const handleChapterClick = async (chapter: StoryChapter) => {
    if (!chapter.isUnlocked) {
      toast({
        title: "Chapter Locked",
        description: `Reach level ${chapter.unlockLevel} and complete previous chapters to unlock.`,
        variant: "destructive",
      });
      return;
    }

    const response = await fetch(`/api/story/${chapter.id}`, { credentials: "include" });
    if (response.ok) {
      const details = await response.json();
      setSelectedChapter(details);
    }
  };

  const handleScenarioClick = (scenario: { id: string; isCompleted: boolean }) => {
    if (selectedChapter && !scenario.isCompleted) {
      setLocation(`/rehearsal/${scenario.id}?storyChapter=${selectedChapter.id}`);
    }
  };

  const handleMarkComplete = (scenarioId: string) => {
    if (selectedChapter) {
      completeScenarioMutation.mutate({ chapterId: selectedChapter.id, scenarioId });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading story...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4" data-testid="story-mode">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Link to="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Story Mode</h1>
          <p className="text-muted-foreground text-sm">Your emotional intelligence journey</p>
        </div>
      </motion.div>

      {chapters.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No chapters yet</h2>
          <p className="text-muted-foreground mb-6">Start your journey by seeding the story chapters.</p>
          <Button 
            onClick={() => seedMutation.mutate()} 
            disabled={seedMutation.isPending}
            data-testid="button-seed-story"
          >
            {seedMutation.isPending ? "Creating..." : "Begin Your Journey"}
          </Button>
        </motion.div>
      )}

      {chapters.length > 0 && (
        <div className="space-y-4">
          {chapters.map((chapter, index) => {
            const Icon = themeIcons[chapter.theme] || BookOpen;
            const colorClass = themeColors[chapter.theme] || "from-gray-500 to-gray-600";
            const bgColorClass = themeBgColors[chapter.theme] || "bg-gray-500/20";
            const textColorClass = themeTextColors[chapter.theme] || "text-gray-500";
            const isComplete = chapter.progress?.isComplete || false;

            return (
              <motion.div
                key={chapter.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                data-testid={`chapter-${chapter.id}`}
              >
                <GlassCard
                  variant={chapter.isUnlocked ? (isComplete ? "glow" : "dark") : "dark"}
                  hover={chapter.isUnlocked}
                  className={`cursor-pointer transition-all ${!chapter.isUnlocked ? "opacity-60" : ""}`}
                  onClick={() => handleChapterClick(chapter)}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      {index > 0 && (
                        <div className="absolute -top-8 left-1/2 w-0.5 h-6 bg-muted-foreground/30" />
                      )}
                      <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClass} flex items-center justify-center relative`}>
                        {!chapter.isUnlocked ? (
                          <Lock className="w-6 h-6 text-white" />
                        ) : isComplete ? (
                          <Check className="w-6 h-6 text-white" />
                        ) : (
                          <Icon className="w-6 h-6 text-white" />
                        )}
                        <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-xs font-bold">
                          {chapter.chapterNumber}
                        </span>
                      </div>
                      {index < chapters.length - 1 && (
                        <div className="absolute top-16 left-1/2 w-0.5 h-6 bg-muted-foreground/30" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{chapter.title}</h3>
                        {isComplete && (
                          <Badge variant="secondary" className={`${bgColorClass} ${textColorClass}`}>
                            Complete
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {chapter.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className={`capitalize ${textColorClass}`}>{chapter.theme}</span>
                        <span>Level {chapter.unlockLevel}+</span>
                        <span>{chapter.completedCount}/{chapter.totalScenarios} scenarios</span>
                      </div>
                      {chapter.isUnlocked && !isComplete && chapter.totalScenarios > 0 && (
                        <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full bg-gradient-to-r ${colorClass} transition-all`}
                            style={{ width: `${(chapter.completedCount / chapter.totalScenarios) * 100}%` }}
                          />
                        </div>
                      )}
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: chapters.length * 0.1 + 0.2 }}
            className="text-center py-6"
          >
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm">More chapters coming soon</span>
            </div>
          </motion.div>
        </div>
      )}

      <Dialog open={!!selectedChapter} onOpenChange={(open) => !open && setSelectedChapter(null)}>
        <DialogContent className="max-w-md">
          {selectedChapter && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${themeColors[selectedChapter.theme] || "from-gray-500 to-gray-600"} flex items-center justify-center`}>
                    {(() => {
                      const Icon = themeIcons[selectedChapter.theme] || BookOpen;
                      return <Icon className="w-5 h-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <div className="text-lg">{selectedChapter.title}</div>
                    <div className="text-sm text-muted-foreground font-normal capitalize">
                      {selectedChapter.theme}
                    </div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">{selectedChapter.description}</p>
                
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {selectedChapter.xpReward} XP
                  </span>
                  <span className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    {selectedChapter.ppReward} PP
                  </span>
                </div>

                <div className="border-t border-border pt-4 mt-4">
                  <h4 className="font-medium mb-3">Scenarios</h4>
                  <div className="space-y-2">
                    {selectedChapter.scenarios.map((scenario) => (
                      <div
                        key={scenario.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          scenario.isCompleted
                            ? "bg-muted/50 border-muted"
                            : "bg-card border-border hover-elevate cursor-pointer"
                        }`}
                        onClick={() => !scenario.isCompleted && handleScenarioClick(scenario)}
                        data-testid={`scenario-${scenario.id}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          scenario.isCompleted
                            ? "bg-primary/20 text-primary"
                            : "bg-muted"
                        }`}>
                          {scenario.isCompleted ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{scenario.title}</div>
                          <div className="text-xs text-muted-foreground truncate">{scenario.description}</div>
                        </div>
                        {!scenario.isCompleted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkComplete(scenario.id);
                            }}
                            disabled={completeScenarioMutation.isPending}
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AnimatePresence>
        {showCelebration && celebrationData && (
          <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
            <DialogContent className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="py-6"
              >
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-violet-600 flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Chapter Complete!</h2>
                <p className="text-muted-foreground mb-6">
                  You've mastered this chapter. Keep up the great work!
                </p>
                <div className="flex items-center justify-center gap-6 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">+{celebrationData.xp}</div>
                    <div className="text-xs text-muted-foreground">XP Earned</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-amber-500">+{celebrationData.pp}</div>
                    <div className="text-xs text-muted-foreground">Peace Points</div>
                  </div>
                </div>
                <Button onClick={() => {
                  setShowCelebration(false);
                  setSelectedChapter(null);
                }}>
                  Continue Journey
                </Button>
              </motion.div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
}
