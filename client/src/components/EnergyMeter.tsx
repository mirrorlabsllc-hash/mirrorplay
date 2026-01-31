import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserProgress } from "@shared/schema";

interface EnergyMeterProps {
  className?: string;
  compact?: boolean;
}

export function EnergyMeter({ className, compact = false }: EnergyMeterProps) {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const energy = progress?.dailyEnergy ?? 100;
  const maxEnergy = progress?.maxEnergy ?? 100;
  const percentage = Math.min((energy / maxEnergy) * 100, 100);

  const getEnergyColor = () => {
    if (percentage > 60) return "text-emerald-400";
    if (percentage > 30) return "text-amber-400";
    return "text-red-400";
  };

  const getBarColor = () => {
    if (percentage > 60) return "bg-emerald-400";
    if (percentage > 30) return "bg-amber-400";
    return "bg-red-400";
  };

  if (compact) {
    return (
      <motion.div 
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full bg-background/50 backdrop-blur-sm border border-white/10",
          className
        )}
        data-testid="energy-meter-compact"
      >
        <Zap className={cn("w-4 h-4", getEnergyColor())} />
        <span className={cn("text-xs font-medium", getEnergyColor())}>
          {energy}
        </span>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg bg-background/50 backdrop-blur-sm border border-white/10",
        className
      )}
      data-testid="energy-meter"
    >
      <Zap className={cn("w-5 h-5", getEnergyColor())} />
      
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">Energy</span>
          <span className={cn("text-xs font-medium", getEnergyColor())}>
            {energy}/{maxEnergy}
          </span>
        </div>
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full", getBarColor())}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
