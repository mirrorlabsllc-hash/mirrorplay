import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import confetti from "canvas-confetti";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getRandomHandoffLine, DEFAULT_HANDOFF_LINE } from "@shared/promptBank";
import { PRACTICE_CATEGORIES, type PracticeCategory } from "@shared/categories";
import { Zap, Play, Pause, Send, RefreshCw, Sparkles, TrendingUp, MessageCircle } from "lucide-react";

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

const toneDescriptions: Record<string, string> = {
  Calm: "Your response shows composure and thoughtfulness",
  Assertive: "You communicated your needs clearly and respectfully",
  Empathetic: "You showed understanding of the other person's feelings",
  Defensive: "Consider acknowledging the other perspective first",
  Confident: "Your self-assured approach came through clearly",
  Aggressive: "Try softening your language while keeping your point",
  Passive: "It's okay to express your needs more directly",
  Anxious: "Practice slowing down and grounding your response",
};

const getScoreLabel = (score: number) => {
  if (score >= 90) return { label: "Excellent", color: "text-emerald-500" };
  if (score >= 75) return { label: "Great", color: "text-blue-500" };
  if (score >= 60) return { label: "Good", color: "text-violet-500" };
  if (score >= 40) return { label: "Fair", color: "text-amber-500" };
  return { label: "Keep Practicing", color: "text-orange-500" };
};

const QUICK_PRACTICE_DURATION = 30;

interface QuickAnalysisResult {
  tone: string;
  score: number;
  tip: string;
  xpEarned: number;
  ppEarned: number;
  currentStreak: number;
}

export function QuickPractice() {
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUICK_PRACTICE_DURATION);
  const [response, setResponse] = useState("");
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<PracticeCategory | null>(null);
  const [result, setResult] = useState<QuickAnalysisResult | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const getNewPrompt = useCallback(() => {
    const randomCategory = PRACTICE_CATEGORIES[Math.floor(Math.random() * PRACTICE_CATEGORIES.length)].id;
    const prompt = getRandomHandoffLine(randomCategory) || DEFAULT_HANDOFF_LINE;
    setCurrentCategory(randomCategory);
    setCurrentPrompt(prompt);
    setTimeLeft(QUICK_PRACTICE_DURATION);
    setResponse("");
    setResult(null);
    setHasSubmitted(false);
    setIsPaused(false);
  }, []);

  const startPractice = useCallback(() => {
    if (!currentPrompt) {
      getNewPrompt();
    }
    setIsActive(true);
    setIsPaused(false);
  }, [currentPrompt, getNewPrompt]);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const resetPractice = useCallback(() => {
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(QUICK_PRACTICE_DURATION);
    setResponse("");
    setResult(null);
    setHasSubmitted(false);
    getNewPrompt();
  }, [getNewPrompt]);

  useEffect(() => {
    if (isActive && !isPaused && timeLeft > 0 && !hasSubmitted) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, timeLeft, hasSubmitted]);

  const analyzeMutation = useMutation({
    mutationFn: async (data: { prompt: string; response: string; category: string; quickMode: boolean }) => {
      const res = await apiRequest("POST", "/api/practice/analyze", data);
      if (!res.ok) {
        throw new Error("Analysis failed");
      }
      return res.json() as Promise<QuickAnalysisResult>;
    },
    onSuccess: (data) => {
      setResult(data);
      setHasSubmitted(true);
      setIsActive(false);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#a855f7", "#ec4899", "#f59e0b"],
      });

      toast({
        title: `+${data.xpEarned} XP`,
        description: `Score: ${data.score}% - Quick practice complete!`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!currentPrompt || !response.trim() || !currentCategory) return;

    analyzeMutation.mutate({
      prompt: currentPrompt,
      response: response.trim(),
      category: currentCategory,
      quickMode: true,
    });
  };

  const progress = (timeLeft / QUICK_PRACTICE_DURATION) * 100;
  const radius = 28;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const getTimerColor = () => {
    if (timeLeft <= 5) return "stroke-red-500";
    if (timeLeft <= 10) return "stroke-amber-500";
    return "stroke-primary";
  };

  useEffect(() => {
    getNewPrompt();
  }, []);

  if (!currentPrompt) {
    return null;
  }

  return (
    <GlassCard 
      variant="glow" 
      className="relative overflow-visible"
      data-testid="quick-practice"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Quick Practice</h3>
          <p className="text-xs text-muted-foreground">30-second micro-session</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {result ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between" data-testid="score-display">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-violet-500/20 flex items-center justify-center">
                    <span className={`text-xl font-bold ${getScoreLabel(result.score).color}`} data-testid="text-score-value">
                      {result.score}
                    </span>
                  </div>
                </div>
                <div>
                  <p className={`font-semibold ${getScoreLabel(result.score).color}`} data-testid="text-score-label">
                    {getScoreLabel(result.score).label}
                  </p>
                  <div className="flex items-center gap-1 text-primary mt-0.5">
                    <Sparkles className="w-3 h-3" />
                    <span className="text-xs font-medium" data-testid="text-xp-earned">+{result.xpEarned} XP earned</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 space-y-2" data-testid="tone-analysis">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">Tone Analysis</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={toneColors[result.tone] || "bg-muted text-muted-foreground"} data-testid="badge-tone">
                  {result.tone}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground" data-testid="text-tone-description">
                {toneDescriptions[result.tone] || "Your communication style was noted."}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-primary/5 border border-primary/10" data-testid="improvement-tip">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs text-primary font-medium">How to Improve</span>
              </div>
              <p className="text-sm" data-testid="text-tip">{result.tip}</p>
            </div>

            <Button
              onClick={resetPractice}
              variant="outline"
              className="w-full gap-2"
              data-testid="button-another-one"
            >
              <RefreshCw className="w-4 h-4" />
              Practice Again
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="practice"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <p className="text-sm leading-relaxed">{currentPrompt}</p>

            {!isActive ? (
              <Button
                onClick={startPractice}
                className="w-full gap-2"
                data-testid="button-start-quick"
              >
                <Play className="w-4 h-4" />
                Start 30s Challenge
              </Button>
            ) : (
              <>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your quick response..."
                  className="min-h-[80px] resize-none text-sm"
                  disabled={analyzeMutation.isPending || hasSubmitted}
                  data-testid="input-quick-response"
                />

                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePause}
                    data-testid="button-pause-timer"
                  >
                    {isPaused ? (
                      <Play className="w-4 h-4" />
                    ) : (
                      <Pause className="w-4 h-4" />
                    )}
                  </Button>

                  <div className="flex-1 relative flex items-center justify-center">
                    <svg width="70" height="70" className="-rotate-90">
                      <circle
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted/30"
                      />
                      <motion.circle
                        cx="35"
                        cy="35"
                        r={radius}
                        fill="none"
                        strokeWidth="4"
                        strokeLinecap="round"
                        className={getTimerColor()}
                        style={{
                          strokeDasharray: circumference,
                          strokeDashoffset: offset,
                        }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`text-lg font-bold ${timeLeft <= 5 ? "text-red-500" : ""}`}>
                        {timeLeft}
                      </span>
                    </div>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!response.trim() || analyzeMutation.isPending}
                    className="gap-2"
                    data-testid="button-quick-submit"
                  >
                    {analyzeMutation.isPending ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </motion.div>
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Submit
                  </Button>
                </div>

                {isPaused && (
                  <p className="text-xs text-center text-muted-foreground">
                    Timer paused - press play to continue
                  </p>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
