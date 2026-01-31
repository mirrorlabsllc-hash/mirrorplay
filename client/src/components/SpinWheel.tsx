import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { playSound } from "@/lib/sounds";
import { 
  Briefcase, 
  Heart, 
  HandHeart, 
  ShieldCheck, 
  Sparkles, 
  MessageCircle, 
  Target, 
  Flame 
} from "lucide-react";

export interface WheelCategory {
  id: string;
  label: string;
  color: string;
  icon: React.ElementType;
  description: string;
}

export const WHEEL_CATEGORIES: WheelCategory[] = [
  { id: "workplace", label: "Workplace", color: "#f59e0b", icon: Briefcase, description: "Professional conversations" },
  { id: "relationships", label: "Relationships", color: "#ec4899", icon: Heart, description: "Personal connections" },
  { id: "empathy", label: "Empathy", color: "#8b5cf6", icon: HandHeart, description: "Understanding others" },
  { id: "boundaries", label: "Boundaries", color: "#06b6d4", icon: ShieldCheck, description: "Setting healthy limits" },
  { id: "confidence", label: "Confidence", color: "#10b981", icon: Sparkles, description: "Self-assured expression" },
  { id: "difficult", label: "Difficult Talks", color: "#f43f5e", icon: MessageCircle, description: "Challenging conversations" },
  { id: "goals", label: "Goals", color: "#3b82f6", icon: Target, description: "Aspirations & motivation" },
  { id: "stress", label: "Stress Relief", color: "#a855f7", icon: Flame, description: "Calming techniques" },
];

interface SpinWheelProps {
  onCategorySelected: (category: WheelCategory) => void;
  isSpinning?: boolean;
  disabled?: boolean;
  size?: number;
  hideInstructions?: boolean;
}

export function SpinWheel({ 
  onCategorySelected, 
  isSpinning: externalSpinning,
  disabled = false, 
  size = 280,
  hideInstructions = false,
}: SpinWheelProps) {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const spinning = externalSpinning ?? isSpinning;

  const segmentAngle = 360 / WHEEL_CATEGORIES.length;
  const radius = size / 2;
  const centerX = radius;
  const centerY = radius;

  const createSegmentPath = (index: number): string => {
    const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
    
    const x1 = centerX + radius * Math.cos(startAngle);
    const y1 = centerY + radius * Math.sin(startAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);
    
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`;
  };

  const getIconPosition = (index: number) => {
    const angle = (index * segmentAngle + segmentAngle / 2 - 90) * (Math.PI / 180);
    const iconRadius = radius * 0.65;
    return {
      x: centerX + iconRadius * Math.cos(angle),
      y: centerY + iconRadius * Math.sin(angle),
    };
  };

  const spinWheel = useCallback(() => {
    if (spinning || disabled) return;
    
    setIsSpinning(true);
    playSound("spin");

    const randomIndex = Math.floor(Math.random() * WHEEL_CATEGORIES.length);
    const targetAngle = randomIndex * segmentAngle;
    const spins = 5 + Math.random() * 3;
    const totalRotation = rotation + (360 * spins) + (360 - targetAngle + segmentAngle / 2);
    
    setRotation(totalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      playSound("reward");
      onCategorySelected(WHEEL_CATEGORIES[randomIndex]);
    }, 4000);
  }, [spinning, disabled, rotation, onCategorySelected, segmentAngle]);

  return (
    <div className="relative flex flex-col items-center">
      <div 
        className="relative"
        style={{ width: size, height: size }}
      >
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20"
          data-testid="wheel-pointer"
        >
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-white drop-shadow-lg" />
        </div>

        <motion.svg
          width={size}
          height={size}
          className="cursor-pointer drop-shadow-2xl"
          animate={{ rotate: rotation }}
          transition={{ 
            duration: 4, 
            ease: [0.2, 0.8, 0.2, 1],
          }}
          onClick={spinWheel}
          data-testid="spin-wheel"
          style={{ filter: "drop-shadow(0 0 20px rgba(139, 92, 246, 0.3))" }}
        >
          <defs>
            {WHEEL_CATEGORIES.map((cat, i) => (
              <linearGradient 
                key={cat.id} 
                id={`gradient-${cat.id}`} 
                x1="0%" 
                y1="0%" 
                x2="100%" 
                y2="100%"
              >
                <stop offset="0%" stopColor={cat.color} stopOpacity="1" />
                <stop offset="100%" stopColor={cat.color} stopOpacity="0.7" />
              </linearGradient>
            ))}
          </defs>

          {WHEEL_CATEGORIES.map((category, index) => (
            <path
              key={category.id}
              d={createSegmentPath(index)}
              fill={`url(#gradient-${category.id})`}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="2"
              className="transition-opacity hover:opacity-90"
              data-testid={`wheel-segment-${category.id}`}
            />
          ))}

          <circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.22}
            fill="hsl(var(--background))"
            stroke="rgba(255,255,255,0.3)"
            strokeWidth="3"
          />

          {WHEEL_CATEGORIES.map((category, index) => {
            const pos = getIconPosition(index);
            const Icon = category.icon;
            return (
              <g key={category.id} transform={`translate(${pos.x - 12}, ${pos.y - 12})`}>
                <foreignObject width="24" height="24">
                  <div className="w-6 h-6 flex items-center justify-center text-white drop-shadow-md">
                    <Icon className="w-5 h-5" />
                  </div>
                </foreignObject>
              </g>
            );
          })}
        </motion.svg>

        {spinning && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            style={{
              background: "radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)",
            }}
          />
        )}
      </div>

      {!hideInstructions && !spinning && (
        <motion.p 
          className="mt-4 text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-testid="spin-instruction"
        >
          Tap the wheel to spin
        </motion.p>
      )}

      {!hideInstructions && spinning && (
        <motion.p 
          className="mt-4 text-sm text-violet-400 font-medium"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-testid="spinning-text"
        >
          Spinning...
        </motion.p>
      )}
    </div>
  );
}
