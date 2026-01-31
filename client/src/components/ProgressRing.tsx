import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  label?: string;
  color?: "primary" | "pink" | "amber" | "green";
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  className,
  showPercentage = true,
  label,
  color = "primary",
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const colors = {
    primary: {
      stroke: "stroke-primary",
      glow: "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]",
    },
    pink: {
      stroke: "stroke-pink-500",
      glow: "drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]",
    },
    amber: {
      stroke: "stroke-amber-500",
      glow: "drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]",
    },
    green: {
      stroke: "stroke-emerald-500",
      glow: "drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]",
    },
  };

  const colorStyle = colors[color];

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} data-testid="progress-ring">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(colorStyle.stroke, colorStyle.glow)}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          style={{
            strokeDasharray: circumference,
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        {showPercentage && (
          <motion.span 
            className="text-2xl font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
          >
            {Math.round(progress)}
          </motion.span>
        )}
        {label && (
          <span className="text-xs text-muted-foreground">{label}</span>
        )}
      </div>
    </div>
  );
}
