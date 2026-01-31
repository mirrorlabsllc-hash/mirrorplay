import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo } from "react";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";

interface MysticalOrbProps {
  size?: "sm" | "md" | "lg" | "xl";
  isActive?: boolean;
  isSpeaking?: boolean;
  onClick?: () => void;
  className?: string;
  use3D?: boolean;
}

interface Particle {
  id: number;
  angle: number;
  distance: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
}

export function MysticalOrb({
  size = "lg",
  isActive = false,
  isSpeaking = false,
  onClick,
  className = "",
  use3D = true,
}: MysticalOrbProps) {
  const [pulseIntensity, setPulseIntensity] = useState(1);
  const [audioLevel, setAudioLevel] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const { themeColors, hasEquippedTheme } = useEquippedCosmetics();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!isSpeaking) {
      setPulseIntensity(1);
      setAudioLevel(0);
      return;
    }

    const interval = setInterval(() => {
      const newLevel = Math.random();
      setAudioLevel(newLevel);
      setPulseIntensity(0.95 + newLevel * 0.15);
    }, 80);

    return () => clearInterval(interval);
  }, [isSpeaking]);

  const sizeConfig = {
    sm: { container: "w-20 h-20", orb: "w-16 h-16", glow: 100, particleOrbit: 35, pixels: 80 },
    md: { container: "w-32 h-32", orb: "w-24 h-24", glow: 150, particleOrbit: 50, pixels: 128 },
    lg: { container: "w-44 h-44", orb: "w-32 h-32", glow: 200, particleOrbit: 70, pixels: 176 },
    xl: { container: "w-64 h-64", orb: "w-48 h-48", glow: 300, particleOrbit: 100, pixels: 256 },
  };

  const config = sizeConfig[size];
  
  const shouldUse3D = false;

  const particles: Particle[] = useMemo(() => {
    const defaultColors = [
      "rgba(168,85,247,0.8)",
      "rgba(236,72,153,0.7)",
      "rgba(6,182,212,0.6)",
      "rgba(255,255,255,0.5)",
    ];
    
    const colors = hasEquippedTheme && themeColors ? [
      `${themeColors.primary || defaultColors[0]}cc`,
      `${themeColors.secondary || defaultColors[1]}b3`,
      `${themeColors.accent || defaultColors[2]}99`,
      "rgba(255,255,255,0.5)",
    ] : defaultColors;
    
    return [...Array(12)].map((_, i) => ({
      id: i,
      angle: (360 / 12) * i,
      distance: config.particleOrbit + (i % 3) * 8,
      size: 2 + (i % 3),
      duration: 15 + (i % 4) * 5,
      delay: i * 0.3,
      color: colors[i % colors.length],
    }));
  }, [config.particleOrbit, hasEquippedTheme, themeColors]);

  const primaryColor = hasEquippedTheme && themeColors?.primary ? themeColors.primary : "rgb(168,85,247)";
  const secondaryColor = hasEquippedTheme && themeColors?.secondary ? themeColors.secondary : "rgb(236,72,153)";
  const accentColor = hasEquippedTheme && themeColors?.accent ? themeColors.accent : "rgb(6,182,212)";
  
  const glowRings = useMemo(() => [
    { scale: 1.2, opacity: 0.3, blur: 30, delay: 0 },
    { scale: 1.4, opacity: 0.2, blur: 50, delay: 0.5 },
    { scale: 1.6, opacity: 0.1, blur: 70, delay: 1 },
  ], []);

  return (
    <div
      className={`relative flex items-center justify-center ${config.container} ${className}`}
      onClick={onClick}
    >
      {/* Layered ambient glow rings */}
      {glowRings.map((ring, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: config.glow,
            height: config.glow,
            background: hasEquippedTheme 
              ? `radial-gradient(circle, ${primaryColor}${Math.round(ring.opacity * 255).toString(16).padStart(2, '0')} 0%, ${secondaryColor}${Math.round(ring.opacity * 0.5 * 255).toString(16).padStart(2, '0')} 40%, transparent 70%)`
              : `radial-gradient(circle, rgba(168,85,247,${ring.opacity}) 0%, rgba(236,72,153,${ring.opacity * 0.5}) 40%, transparent 70%)`,
            filter: `blur(${ring.blur}px)`,
          }}
          animate={{
            scale: isActive 
              ? [ring.scale, ring.scale + 0.15, ring.scale] 
              : [ring.scale, ring.scale + 0.05, ring.scale],
            opacity: isSpeaking 
              ? [ring.opacity, ring.opacity + audioLevel * 0.2, ring.opacity]
              : [ring.opacity * 0.8, ring.opacity, ring.opacity * 0.8],
          }}
          transition={{
            duration: isActive ? 2 : 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: ring.delay,
          }}
        />
      ))}

      {/* Rotating energy field */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: config.glow * 0.9,
          height: config.glow * 0.9,
          background: hasEquippedTheme 
            ? `conic-gradient(
                from 0deg,
                transparent 0deg,
                ${primaryColor}26 30deg,
                transparent 60deg,
                ${secondaryColor}1a 120deg,
                transparent 180deg,
                ${accentColor}26 240deg,
                transparent 300deg
              )`
            : `conic-gradient(
                from 0deg,
                transparent 0deg,
                rgba(168,85,247,0.15) 30deg,
                transparent 60deg,
                rgba(236,72,153,0.1) 120deg,
                transparent 180deg,
                rgba(6,182,212,0.15) 240deg,
                transparent 300deg
              )`,
          filter: "blur(15px)",
        }}
        animate={{ rotate: 360 }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />

      {/* Orbiting particles */}
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute"
          style={{
            width: config.glow * 0.8,
            height: config.glow * 0.8,
          }}
          animate={{ rotate: 360 }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            ease: "linear",
            delay: particle.delay,
          }}
        >
          <motion.div
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              background: particle.color,
              boxShadow: `0 0 ${particle.size * 3}px ${particle.size}px ${particle.color}`,
              top: "50%",
              left: `calc(50% + ${particle.distance}px)`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              opacity: [0.4, 1, 0.4],
              scale: isSpeaking ? [1, 1.5 + audioLevel * 0.5, 1] : [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2 + particle.id * 0.2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </motion.div>
      ))}

      {/* Inner particle burst when speaking */}
      <AnimatePresence>
        {isSpeaking && [...Array(8)].map((_, i) => (
          <motion.div
            key={`burst-${i}`}
            className="absolute w-1 h-1 rounded-full bg-white/60"
            style={{
              boxShadow: "0 0 6px 2px rgba(255,255,255,0.4)",
            }}
            initial={{ 
              scale: 0, 
              x: 0, 
              y: 0,
              opacity: 0.8 
            }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos((i * 45) * Math.PI / 180) * (30 + audioLevel * 20),
              y: Math.sin((i * 45) * Math.PI / 180) * (30 + audioLevel * 20),
              opacity: [0.8, 0.4, 0],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.1,
              ease: "easeOut",
            }}
          />
        ))}
      </AnimatePresence>

      {/* Main orb */}
      {(
      <motion.div
        className={`relative ${config.orb} rounded-full cursor-pointer`}
        style={{
          background: `
            radial-gradient(circle at 30% 30%, 
              rgba(255,255,255,0.35) 0%, 
              rgba(168,85,247,0.85) 15%, 
              rgba(139,92,246,0.9) 35%, 
              rgba(109,40,217,0.95) 55%, 
              rgba(76,29,149,1) 75%, 
              rgba(46,16,101,1) 100%
            )
          `,
          boxShadow: `
            0 0 ${isActive ? 60 : 40}px rgba(168,85,247,${0.4 + (isSpeaking ? audioLevel * 0.3 : 0)}),
            0 0 ${isActive ? 120 : 80}px rgba(139,92,246,${0.2 + (isSpeaking ? audioLevel * 0.2 : 0)}),
            inset 0 0 50px rgba(255,255,255,0.15),
            inset -10px -10px 40px rgba(0,0,0,0.3)
          `,
          transform: `scale(${isSpeaking ? pulseIntensity : 1})`,
        }}
        animate={{
          scale: isActive ? [1, 1.03, 1] : [1, 1.01, 1],
        }}
        transition={{
          duration: isActive ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileHover={{
          scale: 1.08,
          transition: { duration: 0.3 },
        }}
        whileTap={{
          scale: 0.95,
          transition: { duration: 0.1 },
        }}
      >
        {/* Glass highlight */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{
            background: `
              radial-gradient(circle at 25% 25%, 
                rgba(255,255,255,0.5) 0%, 
                rgba(255,255,255,0.1) 20%,
                transparent 40%
              )
            `,
          }}
        />

        {/* Secondary highlight */}
        <motion.div
          className="absolute rounded-full"
          style={{
            width: "30%",
            height: "15%",
            top: "15%",
            left: "20%",
            background: "linear-gradient(to right, rgba(255,255,255,0.3), transparent)",
            filter: "blur(2px)",
            borderRadius: "50%",
          }}
        />

        {/* Swirling inner energy */}
        <motion.div
          className="absolute inset-3 rounded-full overflow-hidden"
          style={{ opacity: 0.35 }}
          animate={{ rotate: 360 }}
          transition={{
            duration: isSpeaking ? 10 : 25,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `
                conic-gradient(
                  from 0deg,
                  transparent,
                  rgba(236,72,153,0.6) 45deg,
                  transparent 90deg,
                  rgba(168,85,247,0.6) 135deg,
                  transparent 180deg,
                  rgba(6,182,212,0.6) 225deg,
                  transparent 270deg,
                  rgba(255,255,255,0.3) 315deg,
                  transparent
                )
              `,
            }}
          />
        </motion.div>

        {/* Core pulse when active */}
        <AnimatePresence>
          {isActive && (
            <motion.div
              className="absolute inset-4 rounded-full"
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)",
              }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [0.9, 1.15, 0.9],
              }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
          )}
        </AnimatePresence>

        {/* Speaking wave rings */}
        <AnimatePresence>
          {isSpeaking && (
            <>
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={`ring-${i}`}
                  className="absolute inset-0 rounded-full"
                  style={{
                    border: `${1 + i * 0.5}px solid rgba(168,85,247,${0.5 - i * 0.1})`,
                  }}
                  initial={{ scale: 1, opacity: 0.6 }}
                  animate={{
                    scale: [1, 1.8 + i * 0.3],
                    opacity: [0.6, 0],
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeOut",
                  }}
                />
              ))}
            </>
          )}
        </AnimatePresence>

        {/* Audio level indicator bars (inner) */}
        <AnimatePresence>
          {isSpeaking && (
            <motion.div 
              className="absolute inset-0 flex items-center justify-center gap-0.5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={`bar-${i}`}
                  className="w-1 rounded-full bg-white/40"
                  animate={{
                    height: [4, 8 + audioLevel * 16 * (1 - Math.abs(i - 2) * 0.2), 4],
                  }}
                  transition={{
                    duration: 0.15,
                    repeat: Infinity,
                    delay: i * 0.05,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>)}

      {/* Floating hint text */}
      <AnimatePresence>
        {isActive && !isSpeaking && (
          <motion.div
            className="absolute -bottom-10 text-sm text-muted-foreground whitespace-nowrap"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: [0.5, 1, 0.5], y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ 
              opacity: { duration: 2, repeat: Infinity },
              y: { duration: 0.3 }
            }}
          >
            Tap to begin
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

