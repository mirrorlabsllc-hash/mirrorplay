import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  Heart, 
  Users, 
  Sparkles,
  Star,
  Play,
  PlusCircle,
  Lock
} from "lucide-react";
import { type Scenario } from "@shared/scenarios";
import confetti from "canvas-confetti";

interface ScenarioWithLockStatus extends Scenario {
  isLocked: boolean;
  requiredLevel: number;
}

const categoryConfig = {
  workplace: { 
    icon: Briefcase, 
    color: "text-blue-500 bg-blue-500/20",
    label: "Workplace" 
  },
  relationship: { 
    icon: Heart, 
    color: "text-pink-500 bg-pink-500/20",
    label: "Relationship" 
  },
  "co-parenting": { 
    icon: Users, 
    color: "text-emerald-500 bg-emerald-500/20",
    label: "Co-Parenting" 
  },
  general: { 
    icon: Sparkles, 
    color: "text-violet-500 bg-violet-500/20",
    label: "General" 
  },
};

export default function Scenarios() {
  const [, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [previousLevel, setPreviousLevel] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: scenarios = [], isLoading } = useQuery<ScenarioWithLockStatus[]>({
    queryKey: ["/api/scenarios"],
  });

  const { data: progress } = useQuery<{ level: number }>({
    queryKey: ["/api/progress"],
  });

  useEffect(() => {
    if (progress?.level && previousLevel !== null && progress.level > previousLevel) {
      const newlyUnlocked = scenarios.filter(
        s => s.requiredLevel > previousLevel && s.requiredLevel <= progress.level
      );
      
      if (newlyUnlocked.length > 0) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
        
        newlyUnlocked.forEach((scenario) => {
          toast({
            title: "New scenario unlocked!",
            description: scenario.title,
          });
        });
      }
    }
    if (progress?.level) {
      setPreviousLevel(progress.level);
    }
  }, [progress?.level, scenarios, previousLevel, toast]);

  const categories = Object.keys(categoryConfig);
  
  const filteredScenarios = selectedCategory 
    ? scenarios.filter(s => s.category === selectedCategory)
    : scenarios;

  const handleScenarioClick = (scenario: ScenarioWithLockStatus) => {
    if (scenario.isLocked) {
      toast({
        title: "Scenario Locked",
        description: `Reach Level ${scenario.requiredLevel} to unlock "${scenario.title}"`,
        variant: "default",
      });
      return;
    }
    navigate(`/rehearsal/${scenario.id}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 flex items-center justify-center">
        <div className="text-muted-foreground">Loading scenarios...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">Role-Play Scenarios</h1>
          <p className="text-muted-foreground">Practice real-world conversations</p>
        </div>
        <Link to="/scenarios/builder">
          <Button variant="outline" size="sm" data-testid="button-scenario-builder">
            <PlusCircle className="w-4 h-4 mr-1" />
            Create
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden"
      >
        <Button
          variant={selectedCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setSelectedCategory(null)}
          data-testid="button-filter-all"
        >
          All
        </Button>
        {categories.map((cat) => {
          const config = categoryConfig[cat as keyof typeof categoryConfig];
          const Icon = config.icon;
          return (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0"
              data-testid={`button-filter-${cat}`}
            >
              <Icon className="w-4 h-4 mr-1" />
              {config.label}
            </Button>
          );
        })}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        {filteredScenarios.map((scenario, index) => {
          const config = categoryConfig[scenario.category as keyof typeof categoryConfig];
          const Icon = config.icon;
          const isLocked = scenario.isLocked;
          
          return (
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              data-testid={isLocked ? `scenario-locked-${scenario.id}` : `scenario-${scenario.id}`}
            >
              <GlassCard 
                variant="dark" 
                hover={!isLocked}
                className={`cursor-pointer relative ${isLocked ? "opacity-60" : ""}`}
                onClick={() => handleScenarioClick(scenario)}
              >
                {isLocked && (
                  <div className="absolute inset-0 flex items-center justify-center z-10 bg-background/30 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                        <Lock className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Unlock at Level {scenario.requiredLevel}
                      </Badge>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${config.color.split(" ")[1]}`}>
                    <Icon className={`w-6 h-6 ${config.color.split(" ")[0]}`} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{scenario.title}</h3>
                      <Badge variant="secondary" className="text-xs">
                        {scenario.phases.length} phases
                      </Badge>
                      {isLocked && (
                        <Badge variant="outline" className="text-xs">
                          <Lock className="w-3 h-3 mr-1" />
                          Level {scenario.requiredLevel}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                      {scenario.description}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star 
                            key={i}
                            className={`w-3 h-3 ${
                              i < scenario.difficulty 
                                ? "text-amber-500 fill-amber-500" 
                                : "text-muted-foreground/30"
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Difficulty {scenario.difficulty}/5
                      </span>
                    </div>
                  </div>
                  
                  <Button 
                    size="icon" 
                    variant="ghost" 
                    className="shrink-0"
                    disabled={isLocked}
                    data-testid={`button-play-${scenario.id}`}
                  >
                    {isLocked ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
