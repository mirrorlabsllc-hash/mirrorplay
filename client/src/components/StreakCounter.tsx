import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  streak: number;
  className?: string;
}

export function StreakCounter({ streak, className }: StreakCounterProps) {
  const getIntensity = () => {
    if (streak >= 100) return "legendary";
    if (streak >= 30) return "epic";
    if (streak >= 14) return "hot";
    if (streak >= 7) return "warm";
    if (streak >= 3) return "lit";
    return "cold";
  };

  const intensity = getIntensity();

  const intensityStyles = {
    cold: {
      flame: "text-muted-foreground",
      glow: "",
      bg: "bg-muted/50",
    },
    lit: {
      flame: "text-orange-400",
      glow: "drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]",
      bg: "bg-orange-500/10",
    },
    warm: {
      flame: "text-orange-500",
      glow: "drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]",
      bg: "bg-orange-500/15",
    },
    hot: {
      flame: "text-red-500",
      glow: "drop-shadow-[0_0_16px_rgba(239,68,68,0.7)]",
      bg: "bg-red-500/20",
    },
    epic: {
      flame: "text-amber-400",
      glow: "drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] drop-shadow-[0_0_40px_rgba(251,191,36,0.4)]",
      bg: "bg-amber-500/20",
    },
    legendary: {
      flame: "text-yellow-300",
      glow: "drop-shadow-[0_0_24px_rgba(253,224,71,0.9)] drop-shadow-[0_0_48px_rgba(253,224,71,0.5)]",
      bg: "bg-yellow-400/25",
    },
  };

  const styles = intensityStyles[intensity];

  return (
    <motion.div 
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        styles.bg,
        className
      )}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      data-testid="streak-counter"
    >
      <motion.div
        animate={streak > 0 ? {
          scale: [1, 1.1, 1],
          rotate: [0, -5, 5, 0],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <Flame 
          className={cn(
            "w-5 h-5",
            styles.flame,
            styles.glow
          )} 
        />
      </motion.div>
      <div className="flex flex-col">
        <span className="text-lg font-bold leading-none">{streak}</span>
        <span className="text-xs text-muted-foreground">day streak</span>
      </div>
    </motion.div>
  );
}
