import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MirrorAvatarProps {
  mood?: "calm" | "listening" | "thinking" | "speaking" | "empathetic" | "playful";
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  animated?: boolean;
}

export function MirrorAvatar({ 
  mood = "calm", 
  size = "lg",
  className,
  animated = true 
}: MirrorAvatarProps) {
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
    xl: "w-48 h-48",
  };

  const moodColors = {
    calm: {
      primary: "from-violet-500/60 to-purple-600/60",
      glow: "shadow-[0_0_60px_20px_rgba(139,92,246,0.3)]",
      ring: "border-violet-400/40",
    },
    listening: {
      primary: "from-blue-400/60 to-indigo-500/60",
      glow: "shadow-[0_0_60px_20px_rgba(99,102,241,0.3)]",
      ring: "border-blue-400/40",
    },
    thinking: {
      primary: "from-amber-400/60 to-orange-500/60",
      glow: "shadow-[0_0_60px_20px_rgba(251,191,36,0.3)]",
      ring: "border-amber-400/40",
    },
    speaking: {
      primary: "from-pink-400/60 to-rose-500/60",
      glow: "shadow-[0_0_60px_20px_rgba(244,114,182,0.3)]",
      ring: "border-pink-400/40",
    },
    empathetic: {
      primary: "from-emerald-400/60 to-teal-500/60",
      glow: "shadow-[0_0_60px_20px_rgba(52,211,153,0.3)]",
      ring: "border-emerald-400/40",
    },
    playful: {
      primary: "from-fuchsia-400/60 to-purple-500/60",
      glow: "shadow-[0_0_60px_20px_rgba(192,132,252,0.3)]",
      ring: "border-fuchsia-400/40",
    },
  };

  const currentMood = moodColors[mood];

  return (
    <div className={cn("relative", sizeClasses[size], className)} data-testid="mirror-avatar">
      {/* Outer glow ring */}
      <motion.div
        className={cn(
          "absolute inset-0 rounded-full",
          currentMood.glow
        )}
        animate={animated ? {
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        } : {}}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Pulsing rings */}
      {animated && [1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute inset-0 rounded-full border-2",
            currentMood.ring
          )}
          animate={{
            scale: [1, 1.5 + i * 0.2],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeOut",
          }}
        />
      ))}

      {/* Main orb */}
      <motion.div
        className={cn(
          "absolute inset-2 rounded-full bg-gradient-to-br",
          currentMood.primary,
          "backdrop-blur-sm"
        )}
        animate={animated ? {
          scale: [1, 1.02, 1],
        } : {}}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Inner glow */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-transparent via-white/10 to-white/20" />
        
        {/* Specular highlight */}
        <div className="absolute top-2 left-1/4 w-1/3 h-1/4 rounded-full bg-white/20 blur-sm" />
      </motion.div>

      {/* Core light */}
      <motion.div
        className="absolute inset-8 rounded-full bg-white/30 blur-md"
        animate={animated ? {
          opacity: [0.3, 0.5, 0.3],
        } : {}}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Particle field */}
      {animated && [...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-white/60"
          style={{
            top: `${30 + Math.random() * 40}%`,
            left: `${30 + Math.random() * 40}%`,
          }}
          animate={{
            y: [0, -10, 0],
            x: [0, Math.random() > 0.5 ? 5 : -5, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
