import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";

interface WeatherParticle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
  opacity: number;
}

interface WeatherEffectsProps {
  weatherType?: string;
  intensity?: number;
}

const WEATHER_CONFIG: Record<string, {
  particleCount: number;
  color: string;
  secondaryColor?: string;
  emoji?: string;
  animation: "fall" | "float" | "twinkle" | "rise" | "drift";
}> = {
  sunny: {
    particleCount: 15,
    color: "rgb(255, 220, 100)",
    animation: "float",
  },
  rain: {
    particleCount: 50,
    color: "rgb(100, 150, 255)",
    animation: "fall",
  },
  snow: {
    particleCount: 40,
    color: "rgb(255, 255, 255)",
    animation: "drift",
  },
  clouds: {
    particleCount: 8,
    color: "rgb(200, 200, 220)",
    animation: "float",
  },
  aurora: {
    particleCount: 20,
    color: "rgb(100, 255, 200)",
    secondaryColor: "rgb(200, 100, 255)",
    animation: "rise",
  },
  starry: {
    particleCount: 30,
    color: "rgb(255, 255, 255)",
    animation: "twinkle",
  },
  mist: {
    particleCount: 15,
    color: "rgb(180, 180, 200)",
    animation: "float",
  },
  rainbow: {
    particleCount: 25,
    color: "rgb(255, 100, 100)",
    secondaryColor: "rgb(100, 100, 255)",
    animation: "rise",
  },
};

function generateParticles(count: number): WeatherParticle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
    opacity: Math.random() * 0.5 + 0.3,
  }));
}

function FallParticle({ particle, color }: { particle: WeatherParticle; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${particle.x}%`,
        width: particle.size / 2,
        height: particle.size * 3,
        backgroundColor: color,
        opacity: particle.opacity,
      }}
      initial={{ top: "-5%", opacity: 0 }}
      animate={{ 
        top: "105%", 
        opacity: [0, particle.opacity, particle.opacity, 0],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

function FloatParticle({ particle, color }: { particle: WeatherParticle; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none blur-sm"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: particle.size * 4,
        height: particle.size * 4,
        backgroundColor: color,
        opacity: particle.opacity * 0.5,
      }}
      animate={{ 
        x: [0, 30, -20, 0],
        y: [0, -20, 10, 0],
        scale: [1, 1.2, 0.9, 1],
      }}
      transition={{
        duration: particle.duration * 3,
        delay: particle.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function TwinkleParticle({ particle, color }: { particle: WeatherParticle; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${particle.x}%`,
        top: `${particle.y}%`,
        width: particle.size,
        height: particle.size,
        backgroundColor: color,
        boxShadow: `0 0 ${particle.size * 2}px ${color}`,
      }}
      animate={{ 
        opacity: [0.2, 1, 0.2],
        scale: [0.8, 1.2, 0.8],
      }}
      transition={{
        duration: particle.duration,
        delay: particle.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

function RiseParticle({ particle, color, secondaryColor }: { particle: WeatherParticle; color: string; secondaryColor?: string }) {
  const gradientColor = secondaryColor 
    ? `linear-gradient(to top, ${color}, ${secondaryColor})`
    : color;

  return (
    <motion.div
      className="absolute pointer-events-none"
      style={{
        left: `${particle.x}%`,
        width: particle.size * 2,
        height: particle.size * 10,
        background: gradientColor,
        opacity: particle.opacity * 0.4,
        borderRadius: "50%",
        filter: "blur(4px)",
      }}
      initial={{ bottom: "-10%", opacity: 0 }}
      animate={{ 
        bottom: "110%",
        opacity: [0, particle.opacity * 0.4, 0],
      }}
      transition={{
        duration: particle.duration * 4,
        delay: particle.delay,
        repeat: Infinity,
        ease: "easeOut",
      }}
    />
  );
}

function DriftParticle({ particle, color }: { particle: WeatherParticle; color: string }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${particle.x}%`,
        width: particle.size,
        height: particle.size,
        backgroundColor: color,
        opacity: particle.opacity,
      }}
      initial={{ top: "-5%", x: 0 }}
      animate={{ 
        top: "105%",
        x: [0, 30, -20, 40, 0],
      }}
      transition={{
        duration: particle.duration * 3,
        delay: particle.delay,
        repeat: Infinity,
        ease: "linear",
      }}
    />
  );
}

export function WeatherEffects({ weatherType = "clouds", intensity = 5 }: WeatherEffectsProps) {
  const config = WEATHER_CONFIG[weatherType] || WEATHER_CONFIG.clouds;
  const adjustedCount = Math.ceil(config.particleCount * (intensity / 5));
  
  const particles = useMemo(() => generateParticles(adjustedCount), [adjustedCount, weatherType]);

  const renderParticle = (particle: WeatherParticle) => {
    switch (config.animation) {
      case "fall":
        return <FallParticle key={particle.id} particle={particle} color={config.color} />;
      case "float":
        return <FloatParticle key={particle.id} particle={particle} color={config.color} />;
      case "twinkle":
        return <TwinkleParticle key={particle.id} particle={particle} color={config.color} />;
      case "rise":
        return <RiseParticle key={particle.id} particle={particle} color={config.color} secondaryColor={config.secondaryColor} />;
      case "drift":
        return <DriftParticle key={particle.id} particle={particle} color={config.color} />;
      default:
        return <FloatParticle key={particle.id} particle={particle} color={config.color} />;
    }
  };

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={weatherType}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          {particles.map(renderParticle)}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function useMoodWeather() {
  const { data: moodData } = useQuery<{ mood: string | null; weatherEffect: string; intensity?: number }>({
    queryKey: ["/api/mood/current"],
    refetchInterval: 60000,
  });

  return {
    mood: moodData?.mood || null,
    weatherEffect: moodData?.weatherEffect || "clouds",
    intensity: moodData?.intensity || 5,
  };
}
