import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  MessageCircle, 
  Sparkles,
  Clock,
  TrendingUp,
  Heart,
  Zap,
  ChevronUp,
  ChevronDown
} from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface CoachingMetrics {
  empathyScore: number;
  clarityScore: number;
  assertivenessScore: number;
  paceScore: number;
  wordCount: number;
  avgWordsPerMessage: number;
  positiveWords: number;
  fillerWords: number;
  questionCount: number;
  iStatements: number;
}

interface CoachingOverlayProps {
  messages: Message[];
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

const POSITIVE_WORDS = [
  "thank", "appreciate", "understand", "feel", "empathize", "help", "support",
  "great", "good", "wonderful", "excellent", "agree", "absolutely", "yes",
  "love", "care", "respect", "value", "trust", "confident", "hope"
];

const FILLER_WORDS = [
  "um", "uh", "like", "you know", "basically", "actually", "literally",
  "kind of", "sort of", "i mean", "just"
];

function analyzeMessages(messages: Message[]): CoachingMetrics {
  const userMessages = messages.filter(m => m.role === "user");
  const allUserText = userMessages.map(m => m.content).join(" ").toLowerCase();
  const words = allUserText.split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  let positiveCount = 0;
  let fillerCount = 0;
  let questionCount = 0;
  let iStatementCount = 0;

  POSITIVE_WORDS.forEach(pw => {
    const regex = new RegExp(`\\b${pw}\\b`, "gi");
    const matches = allUserText.match(regex);
    if (matches) positiveCount += matches.length;
  });

  FILLER_WORDS.forEach(fw => {
    const regex = new RegExp(`\\b${fw}\\b`, "gi");
    const matches = allUserText.match(regex);
    if (matches) fillerCount += matches.length;
  });

  userMessages.forEach(m => {
    if (m.content.includes("?")) questionCount++;
    const iRegex = /\bi\s+(feel|think|believe|want|need|am|would|understand)/gi;
    const iMatches = m.content.match(iRegex);
    if (iMatches) iStatementCount += iMatches.length;
  });

  const avgWordsPerMessage = userMessages.length > 0 
    ? Math.round(wordCount / userMessages.length) 
    : 0;

  const empathyBase = Math.min(100, (positiveCount * 15) + (iStatementCount * 20));
  const clarityBase = Math.min(100, Math.max(0, 100 - (fillerCount * 10)));
  const assertivenessBase = Math.min(100, (iStatementCount * 25) + (questionCount * 10));
  const paceBase = avgWordsPerMessage > 0 
    ? Math.min(100, Math.max(40, 100 - Math.abs(avgWordsPerMessage - 25) * 2))
    : 50;

  return {
    empathyScore: Math.max(20, empathyBase),
    clarityScore: Math.max(20, clarityBase),
    assertivenessScore: Math.max(20, assertivenessBase),
    paceScore: Math.max(20, paceBase),
    wordCount,
    avgWordsPerMessage,
    positiveWords: positiveCount,
    fillerWords: fillerCount,
    questionCount,
    iStatements: iStatementCount,
  };
}

function getScoreColor(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-rose-400";
}

function getProgressColor(score: number) {
  if (score >= 75) return "bg-emerald-500";
  if (score >= 50) return "bg-amber-500";
  return "bg-rose-500";
}

function getQuickTip(metrics: CoachingMetrics): string {
  if (metrics.fillerWords > 3) {
    return "Try reducing filler words like 'um' and 'like'";
  }
  if (metrics.iStatements < 2 && metrics.wordCount > 30) {
    return "Use more 'I feel...' statements to express yourself";
  }
  if (metrics.questionCount === 0 && metrics.wordCount > 50) {
    return "Ask questions to show you're listening";
  }
  if (metrics.positiveWords < 2 && metrics.wordCount > 40) {
    return "Include more affirming language";
  }
  if (metrics.avgWordsPerMessage > 50) {
    return "Keep responses concise for better clarity";
  }
  if (metrics.avgWordsPerMessage < 10 && metrics.wordCount > 10) {
    return "Add more detail to your responses";
  }
  return "Great job! Keep practicing";
}

export function CoachingOverlay({ 
  messages, 
  isMinimized = false, 
  onToggleMinimize,
  className 
}: CoachingOverlayProps) {
  const [animatedMetrics, setAnimatedMetrics] = useState<CoachingMetrics | null>(null);
  
  const metrics = useMemo(() => analyzeMessages(messages), [messages]);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedMetrics(metrics);
    }, 100);
    return () => clearTimeout(timer);
  }, [metrics]);

  const displayMetrics = animatedMetrics || metrics;
  const quickTip = getQuickTip(displayMetrics);
  const userMessageCount = messages.filter(m => m.role === "user").length;

  if (userMessageCount === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "fixed right-4 top-20 z-40 w-64",
        "bg-background/95 backdrop-blur-lg border border-border/50 rounded-lg shadow-lg",
        className
      )}
    >
      <div 
        className="flex items-center justify-between p-3 border-b border-border/50 cursor-pointer hover-elevate"
        onClick={onToggleMinimize}
        data-testid="button-coaching-toggle"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Live Coaching</span>
        </div>
        {isMinimized ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        )}
      </div>

      <AnimatePresence>
        {!isMinimized && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Heart className="w-3 h-3" /> Empathy
                  </span>
                  <span className={cn("font-medium", getScoreColor(displayMetrics.empathyScore))}>
                    {displayMetrics.empathyScore}%
                  </span>
                </div>
                <Progress 
                  value={displayMetrics.empathyScore} 
                  className="h-1.5"
                  data-testid="progress-empathy"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Sparkles className="w-3 h-3" /> Clarity
                  </span>
                  <span className={cn("font-medium", getScoreColor(displayMetrics.clarityScore))}>
                    {displayMetrics.clarityScore}%
                  </span>
                </div>
                <Progress 
                  value={displayMetrics.clarityScore} 
                  className="h-1.5"
                  data-testid="progress-clarity"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="w-3 h-3" /> Assertiveness
                  </span>
                  <span className={cn("font-medium", getScoreColor(displayMetrics.assertivenessScore))}>
                    {displayMetrics.assertivenessScore}%
                  </span>
                </div>
                <Progress 
                  value={displayMetrics.assertivenessScore} 
                  className="h-1.5"
                  data-testid="progress-assertiveness"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="w-3 h-3" /> Pace
                  </span>
                  <span className={cn("font-medium", getScoreColor(displayMetrics.paceScore))}>
                    {displayMetrics.paceScore}%
                  </span>
                </div>
                <Progress 
                  value={displayMetrics.paceScore} 
                  className="h-1.5"
                  data-testid="progress-pace"
                />
              </div>

              <div className="pt-2 border-t border-border/50">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  <Badge variant="outline" className="text-xs py-0">
                    <MessageCircle className="w-3 h-3 mr-1" />
                    {displayMetrics.wordCount} words
                  </Badge>
                  <Badge variant="outline" className="text-xs py-0">
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {displayMetrics.iStatements} I-statements
                  </Badge>
                </div>
              </div>

              <div className="p-2 rounded-md bg-primary/10 border border-primary/20">
                <p className="text-xs text-muted-foreground" data-testid="text-coaching-tip">
                  {quickTip}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
