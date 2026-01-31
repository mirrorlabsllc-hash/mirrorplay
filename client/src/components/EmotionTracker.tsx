import { useMemo } from "react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Smile,
  Frown,
  Angry,
  Heart,
  Zap,
  Meh,
  AlertCircle,
  Shield,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

interface EmotionScore {
  name: string;
  score: number;
  icon: React.ElementType;
  color: string;
}

interface EmotionAnalysis {
  primaryEmotion: string;
  emotionScores: EmotionScore[];
  variationIndex: number;
  trend: "improving" | "declining" | "stable";
  confidenceLevel: number;
}

interface EmotionTrackerProps {
  text: string;
  previousTexts?: string[];
  className?: string;
  compact?: boolean;
}

const EMOTION_KEYWORDS: Record<string, { keywords: string[]; icon: React.ElementType; color: string }> = {
  joy: {
    keywords: ["happy", "glad", "excited", "wonderful", "great", "love", "amazing", "fantastic", "delighted", "thrilled", "grateful", "thankful", "appreciate"],
    icon: Smile,
    color: "text-amber-400",
  },
  sadness: {
    keywords: ["sad", "disappointed", "upset", "hurt", "sorry", "regret", "miss", "lonely", "heartbroken", "depressed", "down"],
    icon: Frown,
    color: "text-blue-400",
  },
  anger: {
    keywords: ["angry", "frustrated", "annoyed", "irritated", "furious", "mad", "outraged", "resentful", "bitter"],
    icon: Angry,
    color: "text-rose-400",
  },
  fear: {
    keywords: ["afraid", "scared", "worried", "anxious", "nervous", "terrified", "concerned", "uneasy", "stressed"],
    icon: AlertCircle,
    color: "text-purple-400",
  },
  love: {
    keywords: ["care", "affection", "cherish", "adore", "devoted", "fond", "compassion", "warmth", "attached"],
    icon: Heart,
    color: "text-pink-400",
  },
  confidence: {
    keywords: ["confident", "sure", "certain", "believe", "trust", "capable", "strong", "determined", "assertive"],
    icon: Shield,
    color: "text-emerald-400",
  },
  neutral: {
    keywords: ["okay", "fine", "alright", "understand", "see", "think", "maybe", "perhaps", "consider"],
    icon: Meh,
    color: "text-muted-foreground",
  },
  energy: {
    keywords: ["motivated", "energized", "inspired", "pumped", "ready", "driven", "passionate", "eager"],
    icon: Zap,
    color: "text-yellow-400",
  },
};

function analyzeEmotion(text: string): EmotionScore[] {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);
  const totalWords = words.length;

  const scores: EmotionScore[] = Object.entries(EMOTION_KEYWORDS).map(([name, { keywords, icon, color }]) => {
    let matchCount = 0;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerText.match(regex);
      if (matches) matchCount += matches.length;
    });
    
    const rawScore = totalWords > 0 ? (matchCount / totalWords) * 100 : 0;
    const normalizedScore = Math.min(100, rawScore * 10);
    
    return {
      name: name.charAt(0).toUpperCase() + name.slice(1),
      score: Math.round(normalizedScore),
      icon,
      color,
    };
  });

  return scores.sort((a, b) => b.score - a.score);
}

function calculateVariation(texts: string[]): number {
  if (texts.length < 2) return 0;
  
  const emotionHistories = texts.map(t => analyzeEmotion(t));
  let totalVariation = 0;
  
  for (let i = 1; i < emotionHistories.length; i++) {
    const prev = emotionHistories[i - 1];
    const curr = emotionHistories[i];
    
    prev.forEach((prevEmotion, idx) => {
      const currEmotion = curr[idx];
      totalVariation += Math.abs(prevEmotion.score - currEmotion.score);
    });
  }
  
  const avgVariation = totalVariation / ((texts.length - 1) * Object.keys(EMOTION_KEYWORDS).length);
  return Math.min(100, avgVariation * 2);
}

function determineTrend(texts: string[]): "improving" | "declining" | "stable" {
  if (texts.length < 3) return "stable";
  
  const recentTexts = texts.slice(-3);
  const scores = recentTexts.map(t => {
    const emotions = analyzeEmotion(t);
    const positiveEmotions = emotions.filter(e => 
      ["Joy", "Love", "Confidence", "Energy"].includes(e.name)
    );
    return positiveEmotions.reduce((sum, e) => sum + e.score, 0) / positiveEmotions.length;
  });
  
  const trend = scores[2] - scores[0];
  if (trend > 10) return "improving";
  if (trend < -10) return "declining";
  return "stable";
}

export function EmotionTracker({ text, previousTexts = [], className, compact = false }: EmotionTrackerProps) {
  const analysis = useMemo((): EmotionAnalysis => {
    const allTexts = [...previousTexts, text];
    const emotionScores = analyzeEmotion(text);
    const primaryEmotion = emotionScores[0]?.name || "Neutral";
    const variationIndex = calculateVariation(allTexts);
    const trend = determineTrend(allTexts);
    const confidenceLevel = emotionScores[0]?.score > 30 ? 
      Math.min(100, emotionScores[0].score + 20) : 50;
    
    return {
      primaryEmotion,
      emotionScores,
      variationIndex,
      trend,
      confidenceLevel,
    };
  }, [text, previousTexts]);

  const TrendIcon = analysis.trend === "improving" ? TrendingUp : 
                   analysis.trend === "declining" ? TrendingDown : Minus;
  const trendColor = analysis.trend === "improving" ? "text-emerald-400" :
                    analysis.trend === "declining" ? "text-rose-400" : "text-muted-foreground";

  if (compact) {
    const topEmotions = analysis.emotionScores.slice(0, 3).filter(e => e.score > 5);
    
    return (
      <div className={cn("flex items-center gap-2 flex-wrap", className)}>
        {topEmotions.map((emotion) => {
          const Icon = emotion.icon;
          return (
            <Badge 
              key={emotion.name} 
              variant="outline" 
              className={cn("text-xs py-0 gap-1", emotion.color)}
            >
              <Icon className="w-3 h-3" />
              {emotion.name}
            </Badge>
          );
        })}
        <Badge variant="outline" className={cn("text-xs py-0 gap-1", trendColor)}>
          <TrendIcon className="w-3 h-3" />
          {analysis.trend}
        </Badge>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50",
        className
      )}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium" data-testid="text-emotion-heading">Emotion Analysis</h3>
        <Badge variant="outline" className={cn("text-xs gap-1", trendColor)}>
          <TrendIcon className="w-3 h-3" />
          {analysis.trend}
        </Badge>
      </div>

      <div className="space-y-3">
        {analysis.emotionScores.slice(0, 4).map((emotion) => {
          const Icon = emotion.icon;
          return (
            <div key={emotion.name} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className={cn("flex items-center gap-1.5", emotion.color)}>
                  <Icon className="w-3 h-3" />
                  {emotion.name}
                </span>
                <span className="text-muted-foreground">{emotion.score}%</span>
              </div>
              <Progress value={emotion.score} className="h-1.5" />
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Variation Index</span>
        <span className={cn(
          analysis.variationIndex > 50 ? "text-amber-400" : "text-muted-foreground"
        )}>
          {Math.round(analysis.variationIndex)}%
        </span>
      </div>
    </motion.div>
  );
}

export function analyzeTextEmotion(text: string) {
  return analyzeEmotion(text);
}
