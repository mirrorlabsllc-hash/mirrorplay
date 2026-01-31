import { motion } from "framer-motion";
import { useMemo } from "react";

interface FloatingParticlesProps {
  count?: number;
  className?: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  opacity: number;
  color: string;
}

export function FloatingParticles({ count = 20, className = "" }: FloatingParticlesProps) {
  const particles: Particle[] = useMemo(() => {
    const colors = [
      "rgba(168,85,247,0.4)",
      "rgba(139,92,246,0.3)",
      "rgba(236,72,153,0.3)",
      "rgba(6,182,212,0.25)",
      "rgba(255,255,255,0.15)",
    ];

    return [...Array(count)].map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * 10,
      opacity: 0.2 + Math.random() * 0.4,
      color: colors[i % colors.length],
    }));
  }, [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: particle.size,
            height: particle.size,
            background: particle.color,
            boxShadow: `0 0 ${particle.size * 2}px ${particle.color}`,
          }}
          animate={{
            y: [0, -30, 0, 20, 0],
            x: [0, 15, -10, 5, 0],
            opacity: [particle.opacity, particle.opacity * 1.5, particle.opacity * 0.5, particle.opacity],
            scale: [1, 1.2, 0.8, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: particle.delay,
          }}
        />
      ))}
    </div>
  );
}

export function GlowOrbs({ className = "" }: { className?: string }) {
  const orbs = useMemo(() => [
    { x: 10, y: 20, size: 200, color: "rgba(168,85,247,0.08)", duration: 20, blur: 80 },
    { x: 80, y: 60, size: 250, color: "rgba(236,72,153,0.06)", duration: 25, blur: 100 },
    { x: 50, y: 80, size: 180, color: "rgba(6,182,212,0.05)", duration: 18, blur: 70 },
    { x: 20, y: 70, size: 220, color: "rgba(139,92,246,0.07)", duration: 22, blur: 90 },
  ], []);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${orb.x}%`,
            top: `${orb.y}%`,
            width: orb.size,
            height: orb.size,
            background: orb.color,
            filter: `blur(${orb.blur}px)`,
            transform: "translate(-50%, -50%)",
          }}
          animate={{
            x: [0, 30, -20, 10, 0],
            y: [0, -20, 10, -15, 0],
            scale: [1, 1.1, 0.95, 1.05, 1],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
