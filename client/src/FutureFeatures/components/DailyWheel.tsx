import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "./GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Star, 
  Heart, 
  Gem, 
  Trophy, 
  RotateCcw,
  Gift,
  CheckCircle,
  Loader2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { playSound } from "@/lib/sounds";
import type { WheelReward } from "@shared/schema";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sparkles,
  Star,
  Heart,
  Gem,
  Trophy,
  RotateCcw,
  Gift,
};

const RARITY_COLORS: Record<string, string> = {
  common: "from-slate-400 to-slate-500",
  rare: "from-blue-400 to-blue-600",
  epic: "from-purple-400 to-purple-600",
  legendary: "from-amber-400 to-amber-600",
};

const SEGMENT_COLORS = [
  "hsl(280, 70%, 55%)",
  "hsl(320, 70%, 55%)",
  "hsl(200, 70%, 55%)",
  "hsl(35, 70%, 55%)",
  "hsl(280, 60%, 45%)",
  "hsl(320, 60%, 45%)",
  "hsl(200, 60%, 45%)",
  "hsl(35, 60%, 45%)",
];

interface WheelResponse {
  rewards: WheelReward[];
  hasSpunToday: boolean;
  lastSpin: any | null;
}

interface SpinResponse {
  spin: any;
  reward: WheelReward;
  rewardIndex: number;
}

function ConfettiParticle({ delay, x }: { delay: number; x: number }) {
  const colors = ["#a855f7", "#ec4899", "#f59e0b", "#3b82f6", "#10b981"];
  const color = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full"
      style={{ 
        backgroundColor: color,
        left: `${x}%`,
        top: "50%",
      }}
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ 
        opacity: [1, 1, 0],
        y: [0, -100, -150],
        x: [0, (Math.random() - 0.5) * 100],
        rotate: [0, 360 * (Math.random() > 0.5 ? 1 : -1)],
        scale: [1, 1.2, 0.5],
      }}
      transition={{ 
        duration: 1.5, 
        delay: delay,
        ease: "easeOut",
      }}
    />
  );
}

function Confetti() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 0.3,
    x: Math.random() * 100,
  }));
  
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <ConfettiParticle key={p.id} delay={p.delay} x={p.x} />
      ))}
    </div>
  );
}

export function DailyWheel() {
  const [isSpinning, setIsSpinning] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [wonReward, setWonReward] = useState<WheelReward | null>(null);
  const [spinRotation, setSpinRotation] = useState(0);

  const { data, isLoading } = useQuery<WheelResponse>({
    queryKey: ["/api/wheel/today"],
  });

  const spinMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wheel/spin");
      return response.json() as Promise<SpinResponse>;
    },
    onSuccess: (result) => {
      const segmentCount = data?.rewards.length || 8;
      const segmentAngle = 360 / segmentCount;
      const targetIndex = result.rewardIndex;
      const randomOffset = Math.random() * (segmentAngle * 0.6) - (segmentAngle * 0.3);
      const targetRotation = 360 * 5 + (360 - (targetIndex * segmentAngle + segmentAngle / 2)) + randomOffset;
      
      setSpinRotation(targetRotation);
      
      setTimeout(() => {
        setIsSpinning(false);
        setWonReward(result.reward);
        setShowConfetti(true);
        playSound("reward");
        
        queryClient.invalidateQueries({ queryKey: ["/api/wheel/today"] });
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        
        setTimeout(() => setShowConfetti(false), 2000);
      }, 4000);
    },
    onError: () => {
      setIsSpinning(false);
    },
  });

  const handleSpin = useCallback(() => {
    if (isSpinning || data?.hasSpunToday) return;
    
    setIsSpinning(true);
    setWonReward(null);
    playSound("spin");
    spinMutation.mutate();
  }, [isSpinning, data?.hasSpunToday, spinMutation]);

  const rewards = data?.rewards || [];
  const hasSpunToday = data?.hasSpunToday || false;

  if (isLoading) {
    return (
      <GlassCard variant="dark" className="flex flex-col items-center py-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="mt-2 text-sm text-muted-foreground">Loading wheel...</span>
      </GlassCard>
    );
  }

  if (rewards.length === 0) {
    return null;
  }

  const segmentAngle = 360 / rewards.length;

  return (
    <GlassCard variant="glow" className="relative overflow-visible">
      <AnimatePresence>
        {showConfetti && <Confetti />}
      </AnimatePresence>
      
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Daily Wheel</h3>
          </div>
          {hasSpunToday && !wonReward && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Spun Today
            </Badge>
          )}
        </div>

        <div className="relative w-56 h-56">
          <div 
            className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10"
            data-testid="wheel-pointer"
          >
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          </div>

          <motion.div
            className="w-full h-full rounded-full relative shadow-xl"
            style={{
              background: `conic-gradient(${rewards.map((_, i) => 
                `${SEGMENT_COLORS[i % SEGMENT_COLORS.length]} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`
              ).join(", ")})`,
            }}
            animate={{ rotate: spinRotation }}
            transition={{ 
              duration: isSpinning ? 4 : 0, 
              ease: [0.2, 0.8, 0.2, 1],
            }}
            data-testid="wheel-spinner"
          >
            <div className="absolute inset-0 rounded-full border-4 border-white/20" />
            
            {rewards.map((reward, i) => {
              const angle = i * segmentAngle + segmentAngle / 2 - 90;
              const IconComponent = ICON_MAP[reward.icon || "Gift"] || Gift;
              
              return (
                <div
                  key={reward.id}
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    transform: `rotate(${angle}deg)`,
                  }}
                >
                  <div 
                    className="absolute flex flex-col items-center gap-0.5"
                    style={{
                      transform: `translateX(55px) rotate(${-angle}deg)`,
                    }}
                  >
                    <IconComponent className="w-5 h-5 text-white drop-shadow-md" />
                    <span className="text-[9px] font-medium text-white drop-shadow-md whitespace-nowrap max-w-[45px] truncate">
                      {reward.name}
                    </span>
                  </div>
                </div>
              );
            })}

            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-background/90 border-2 border-primary shadow-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
            </div>
          </motion.div>
        </div>

        <AnimatePresence mode="wait">
          {wonReward ? (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.8, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: -10 }}
              className="text-center"
            >
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r ${RARITY_COLORS[wonReward.rarity || "common"]} text-white font-medium shadow-lg`}>
                {(() => {
                  const Icon = ICON_MAP[wonReward.icon || "Gift"] || Gift;
                  return <Icon className="w-5 h-5" />;
                })()}
                <span>{wonReward.name}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{wonReward.description}</p>
            </motion.div>
          ) : hasSpunToday ? (
            <motion.div
              key="spun"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <p className="text-sm text-muted-foreground">
                Come back tomorrow for another spin!
              </p>
            </motion.div>
          ) : (
            <motion.div key="spin-btn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Button
                size="lg"
                onClick={handleSpin}
                disabled={isSpinning || hasSpunToday}
                className="gap-2 px-8"
                data-testid="button-spin-wheel"
              >
                {isSpinning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Spinning...
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    Spin the Wheel
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassCard>
  );
}
