import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { InteractiveGlassCard } from "@/components/InteractiveGlassCard";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  Wind,
  Play,
  Pause,
  RotateCcw,
  Check
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

interface BreathingExercise {
  id: string;
  name: string;
  description: string;
  pattern: { phase: string; duration: number }[];
  cycles: number;
}

const EXERCISES: BreathingExercise[] = [
  {
    id: "box_breathing",
    name: "Box Breathing",
    description: "4-4-4-4 pattern used by Navy SEALs for focus",
    pattern: [
      { phase: "Breathe In", duration: 4 },
      { phase: "Hold", duration: 4 },
      { phase: "Breathe Out", duration: 4 },
      { phase: "Hold", duration: 4 },
    ],
    cycles: 4,
  },
  {
    id: "4_7_8",
    name: "4-7-8 Relaxation",
    description: "Calming technique for anxiety and sleep",
    pattern: [
      { phase: "Breathe In", duration: 4 },
      { phase: "Hold", duration: 7 },
      { phase: "Breathe Out", duration: 8 },
    ],
    cycles: 4,
  },
  {
    id: "calm_breath",
    name: "Calm Breath",
    description: "Simple deep breathing for beginners",
    pattern: [
      { phase: "Breathe In", duration: 5 },
      { phase: "Breathe Out", duration: 5 },
    ],
    cycles: 6,
  },
];

export default function CalmMode() {
  const { toast } = useToast();
  const [selectedExercise, setSelectedExercise] = useState<BreathingExercise | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0);
  const [currentCycle, setCurrentCycle] = useState(1);
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (data: { exerciseType: string; duration: number; completedCycles: number }) => {
      const res = await apiRequest("POST", "/api/calm/sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/calm/sessions"] });
    },
  });

  useEffect(() => {
    if (!isRunning || !selectedExercise) return;

    const currentPhase = selectedExercise.pattern[currentPhaseIndex];
    setPhaseTimer(currentPhase.duration);

    intervalRef.current = setInterval(() => {
      setPhaseTimer((prev) => {
        if (prev <= 1) {
          // Move to next phase
          const nextPhaseIndex = currentPhaseIndex + 1;
          if (nextPhaseIndex >= selectedExercise.pattern.length) {
            // Completed a cycle
            const nextCycle = currentCycle + 1;
            if (nextCycle > selectedExercise.cycles) {
              // Exercise complete
              setIsRunning(false);
              setIsComplete(true);
              const totalDuration = selectedExercise.pattern.reduce((sum, p) => sum + p.duration, 0) * selectedExercise.cycles;
              saveMutation.mutate({
                exerciseType: selectedExercise.id,
                duration: totalDuration,
                completedCycles: selectedExercise.cycles,
              });
              toast({ title: "Exercise complete! Great job." });
              return 0;
            }
            setCurrentCycle(nextCycle);
            setCurrentPhaseIndex(0);
            return selectedExercise.pattern[0].duration;
          }
          setCurrentPhaseIndex(nextPhaseIndex);
          return selectedExercise.pattern[nextPhaseIndex].duration;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, currentPhaseIndex, currentCycle, selectedExercise]);

  const handleStart = (exercise: BreathingExercise) => {
    setSelectedExercise(exercise);
    setCurrentPhaseIndex(0);
    setCurrentCycle(1);
    setPhaseTimer(exercise.pattern[0].duration);
    setIsComplete(false);
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const handleResume = () => {
    setIsRunning(true);
  };

  const handleReset = () => {
    setIsRunning(false);
    setSelectedExercise(null);
    setCurrentPhaseIndex(0);
    setCurrentCycle(1);
    setPhaseTimer(0);
    setIsComplete(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const getCircleScale = () => {
    if (!selectedExercise || !isRunning) return 1;
    const currentPhase = selectedExercise.pattern[currentPhaseIndex];
    if (currentPhase.phase === "Breathe In") return 1.3;
    if (currentPhase.phase === "Breathe Out") return 0.8;
    return 1;
  };

  // Exercise Selection View
  if (!selectedExercise) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-2 mb-6">
            <Link href="/journey">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Calm Mode</h1>
              <p className="text-sm text-muted-foreground">
                Breathing exercises before practice
              </p>
            </div>
          </div>

          <p className="text-muted-foreground mb-6">
            Take a moment to center yourself with guided breathing exercises.
          </p>

          <div className="space-y-4">
            {EXERCISES.map((exercise) => (
              <InteractiveGlassCard
                key={exercise.id}
                className="p-6"
                onClick={() => handleStart(exercise)}
                data-testid={`exercise-${exercise.id}`}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <Wind className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{exercise.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {exercise.description}
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {exercise.cycles} cycles
                    </p>
                  </div>
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>
              </InteractiveGlassCard>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Exercise Running View
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex flex-col items-center justify-center p-4">
      <AnimatePresence mode="wait">
        {isComplete ? (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Well Done!</h2>
            <p className="text-muted-foreground mb-8">
              You completed {selectedExercise.cycles} cycles of {selectedExercise.name}
            </p>
            <div className="flex gap-4">
              <Button variant="outline" onClick={handleReset} data-testid="button-back-to-exercises">
                <ChevronLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Link href="/">
                <Button data-testid="button-start-practice">
                  Start Practice
                </Button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="exercise"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center w-full max-w-md"
          >
            <p className="text-sm text-muted-foreground mb-2">
              {selectedExercise.name} - Cycle {currentCycle}/{selectedExercise.cycles}
            </p>

            <div className="relative flex items-center justify-center my-12">
              <motion.div
                className="w-48 h-48 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center"
                animate={{ scale: getCircleScale() }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                <div className="text-center">
                  <p className="text-3xl font-bold">{phaseTimer}</p>
                  <p className="text-lg text-muted-foreground">
                    {selectedExercise.pattern[currentPhaseIndex].phase}
                  </p>
                </div>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-4">
              {isRunning ? (
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handlePause}
                  data-testid="button-pause"
                >
                  <Pause className="w-5 h-5 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={handleResume}
                  data-testid="button-resume"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Resume
                </Button>
              )}
              <Button
                size="lg"
                variant="ghost"
                onClick={handleReset}
                data-testid="button-reset"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
