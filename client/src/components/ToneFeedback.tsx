import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Zap, 
  Volume2, 
  Heart, 
  Sparkles, 
  ArrowRight,
  RefreshCw,
  Copy,
  Check,
  ThumbsUp,
  Target,
  Lightbulb,
  User
} from "lucide-react";
import { useState } from "react";
import type { WheelCategory } from "@/components/SpinWheel";

interface ToneAnalysis {
  primaryTone: string;
  secondaryTone?: string | null;
  toneScore: number;
  energy: "low" | "medium" | "high";
  pace: "slow" | "moderate" | "fast";
  emotionalClarity: number;
  strengths: string[];
  areasToImprove: string[];
  alternatives: string[];
  coachingTip: string;
  whyItMatters?: string;
  bodyLanguageTip?: string;
  xpEarned: number;
}

interface ToneFeedbackProps {
  analysis: ToneAnalysis;
  originalResponse: string;
  category: WheelCategory;
  onContinue: () => void;
  onTryAgain: () => void;
}

const TONE_COLORS: Record<string, string> = {
  calm: "#06b6d4",
  assertive: "#f59e0b",
  empathetic: "#ec4899",
  confident: "#10b981",
  defensive: "#f43f5e",
  anxious: "#a855f7",
  aggressive: "#ef4444",
  passive: "#6b7280",
};

const getEnergyIcon = (energy: string) => {
  switch (energy) {
    case "high": return <Zap className="w-4 h-4 text-yellow-400" />;
    case "medium": return <Volume2 className="w-4 h-4 text-blue-400" />;
    default: return <Heart className="w-4 h-4 text-pink-400" />;
  }
};

const getEnergyLabel = (energy: string) => {
  switch (energy) {
    case "high": return "High Energy";
    case "medium": return "Balanced";
    default: return "Calm & Grounded";
  }
};

const getPaceLabel = (pace: string) => {
  switch (pace) {
    case "fast": return "Quick pace";
    case "slow": return "Thoughtful pace";
    default: return "Steady pace";
  }
};

export function ToneFeedback({
  analysis,
  originalResponse,
  category,
  onContinue,
  onTryAgain,
}: ToneFeedbackProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const toneColor = TONE_COLORS[analysis.primaryTone.toLowerCase()] || "#8b5cf6";

  const copyAlternative = async (text: string, index: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg mx-auto px-4 space-y-6"
    >
      <div className="text-center space-y-2">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <Sparkles className="w-5 h-5" style={{ color: category.color }} />
          <span className="font-medium" style={{ color: category.color }}>
            +{analysis.xpEarned} XP
          </span>
        </motion.div>
      </div>

      <GlassCard className="p-5 space-y-4" data-testid="tone-analysis-card">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: toneColor }}
            />
            <span className="font-medium" data-testid="primary-tone">
              {analysis.primaryTone} tone
            </span>
            {analysis.secondaryTone && (
              <span className="text-sm text-muted-foreground" data-testid="secondary-tone">
                with {analysis.secondaryTone.toLowerCase()} undertones
              </span>
            )}
          </div>
          <Badge 
            variant="outline"
            style={{ borderColor: toneColor, color: toneColor }}
            data-testid="tone-score"
          >
            {analysis.toneScore}%
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5" data-testid="energy-indicator">
            {getEnergyIcon(analysis.energy)}
            <span>{getEnergyLabel(analysis.energy)}</span>
          </div>
          <div className="w-px h-4 bg-border" />
          <span data-testid="pace-indicator">{getPaceLabel(analysis.pace)}</span>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-muted-foreground">Emotional Clarity</span>
            <span className="font-medium">{analysis.emotionalClarity}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: category.color }}
              initial={{ width: 0 }}
              animate={{ width: `${analysis.emotionalClarity}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
              data-testid="clarity-bar"
            />
          </div>
        </div>
      </GlassCard>

      {analysis.strengths && analysis.strengths.length > 0 && (
        <GlassCard className="p-5 space-y-3" data-testid="strengths-card">
          <h3 className="font-medium flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-green-400" />
            What You Did Well
          </h3>
          <ul className="space-y-2">
            {analysis.strengths.map((strength, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
                data-testid={`strength-${i}`}
              >
                <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>{strength}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      )}

      {analysis.areasToImprove && analysis.areasToImprove.length > 0 && (
        <GlassCard className="p-5 space-y-3" data-testid="improvements-card">
          <h3 className="font-medium flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            Areas to Grow
          </h3>
          <ul className="space-y-2">
            {analysis.areasToImprove.map((area, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="flex items-start gap-2 text-sm text-muted-foreground"
                data-testid={`improvement-${i}`}
              >
                <Lightbulb className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span>{area}</span>
              </motion.li>
            ))}
          </ul>
        </GlassCard>
      )}

      <GlassCard className="p-5 space-y-3" data-testid="coaching-card">
        <h3 className="font-medium flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" />
          Coaching Insight
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed" data-testid="coaching-tip">
          {analysis.coachingTip}
        </p>
        
        {analysis.whyItMatters && (
          <div className="pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground/80 italic" data-testid="why-it-matters">
              <span className="font-medium text-muted-foreground">Why this matters:</span> {analysis.whyItMatters}
            </p>
          </div>
        )}
      </GlassCard>

      {analysis.bodyLanguageTip && (
        <GlassCard className="p-5 space-y-3" data-testid="body-language-card">
          <h3 className="font-medium flex items-center gap-2">
            <User className="w-4 h-4 text-cyan-400" />
            Delivery Tip
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="body-language-tip">
            {analysis.bodyLanguageTip}
          </p>
        </GlassCard>
      )}

      {analysis.alternatives && analysis.alternatives.length > 0 && (
        <GlassCard className="p-5 space-y-3" data-testid="alternatives-card">
          <h3 className="font-medium">Try saying it differently:</h3>
          <div className="space-y-2">
            {analysis.alternatives.map((alt, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 group"
                data-testid={`alternative-${i}`}
              >
                <span className="text-sm flex-1 italic">"{alt}"</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => copyAlternative(alt, i)}
                  data-testid={`copy-alternative-${i}`}
                >
                  {copiedIndex === i ? (
                    <Check className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={onTryAgain}
          className="flex-1 gap-2"
          data-testid="button-try-again"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
        <Button
          onClick={onContinue}
          className="flex-1 gap-2"
          data-testid="button-continue"
        >
          Next Spin
          <ArrowRight className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}
