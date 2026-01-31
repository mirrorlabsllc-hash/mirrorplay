import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/GlassCard";
import { Badge } from "@/components/ui/badge";

interface StreakMultiplierProps {
  streak: number;
  className?: string;
  showMilestone?: boolean;
}

function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 5;
  if (streakDays >= 14) return 3;
  if (streakDays >= 7) return 2;
  return 1;
}

function getNextMultiplierMilestone(streakDays: number): { daysUntil: number; nextMultiplier: number } | null {
  if (streakDays >= 30) return null;
  if (streakDays >= 14) return { daysUntil: 30 - streakDays, nextMultiplier: 5 };
  if (streakDays >= 7) return { daysUntil: 14 - streakDays, nextMultiplier: 3 };
  return { daysUntil: 7 - streakDays, nextMultiplier: 2 };
}

export function StreakMultiplier({ streak, className, showMilestone = true }: StreakMultiplierProps) {
  const multiplier = getStreakMultiplier(streak);
  const nextMilestone = getNextMultiplierMilestone(streak);
  const isMultiplierActive = multiplier > 1;

  const getFlameStyles = () => {
    if (multiplier >= 5) {
      return {
        flame: "text-yellow-300",
        glow: "drop-shadow-[0_0_24px_rgba(253,224,71,0.9)] drop-shadow-[0_0_48px_rgba(253,224,71,0.5)]",
      };
    }
    if (multiplier >= 3) {
      return {
        flame: "text-amber-400",
        glow: "drop-shadow-[0_0_20px_rgba(251,191,36,0.8)] drop-shadow-[0_0_40px_rgba(251,191,36,0.4)]",
      };
    }
    if (multiplier >= 2) {
      return {
        flame: "text-orange-500",
        glow: "drop-shadow-[0_0_16px_rgba(249,115,22,0.7)]",
      };
    }
    return {
      flame: streak > 0 ? "text-orange-400" : "text-muted-foreground",
      glow: streak > 0 ? "drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]" : "",
    };
  };

  const flameStyles = getFlameStyles();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      data-testid="streak-multiplier"
      className={className}
    >
      <GlassCard variant="dark" className="p-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="relative"
            animate={isMultiplierActive ? {
              scale: [1, 1.15, 1],
            } : streak > 0 ? {
              scale: [1, 1.08, 1],
            } : {}}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <Flame 
              className={cn(
                "w-8 h-8",
                flameStyles.flame,
                flameStyles.glow
              )} 
            />
            {isMultiplierActive && (
              <motion.div
                className="absolute inset-0 rounded-full"
                animate={{
                  boxShadow: [
                    "0 0 0px rgba(251,191,36,0)",
                    "0 0 20px rgba(251,191,36,0.4)",
                    "0 0 0px rgba(251,191,36,0)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </motion.div>
          
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold">{streak}</span>
              <span className="text-sm text-muted-foreground">day streak</span>
              
              {isMultiplierActive && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Badge
                    className={cn(
                      "text-xs font-bold",
                      multiplier >= 5 
                        ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-yellow-400" 
                        : multiplier >= 3 
                          ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400"
                          : "bg-gradient-to-r from-violet-500 to-purple-500 text-white border-violet-400"
                    )}
                    data-testid="multiplier-badge"
                  >
                    {multiplier}x XP
                  </Badge>
                </motion.div>
              )}
            </div>
            
            {showMilestone && nextMilestone && (
              <motion.span 
                className="text-xs text-muted-foreground"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                data-testid="next-milestone"
              >
                {nextMilestone.daysUntil} more day{nextMilestone.daysUntil !== 1 ? "s" : ""} until {nextMilestone.nextMultiplier}x!
              </motion.span>
            )}
            
            {showMilestone && !nextMilestone && isMultiplierActive && (
              <motion.span 
                className="text-xs text-amber-400/80"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Maximum multiplier achieved!
              </motion.span>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}
