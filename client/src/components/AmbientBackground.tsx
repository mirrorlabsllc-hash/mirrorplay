import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useEquippedCosmetics } from "@/hooks/useEquippedCosmetics";

interface AmbientBackgroundProps {
  className?: string;
  particleCount?: number;
}

function hexToRgba(hex: string, alpha: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(139, 92, 246, ${alpha})`;
  
  // Handle 6-digit hex
  const result6 = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result6) {
    return `rgba(${parseInt(result6[1], 16)}, ${parseInt(result6[2], 16)}, ${parseInt(result6[3], 16)}, ${alpha})`;
  }
  
  // Handle 3-digit hex shorthand
  const result3 = /^#?([a-f\d])([a-f\d])([a-f\d])$/i.exec(hex);
  if (result3) {
    return `rgba(${parseInt(result3[1] + result3[1], 16)}, ${parseInt(result3[2] + result3[2], 16)}, ${parseInt(result3[3] + result3[3], 16)}, ${alpha})`;
  }
  
  // Handle rgb/rgba formats
  const rgbMatch = /^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(hex);
  if (rgbMatch) {
    return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
  }
  
  // Fallback to default purple
  return `rgba(139, 92, 246, ${alpha})`;
}

export function AmbientBackground({ className, particleCount = 40 }: AmbientBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { backgroundColors, hasEquippedBackground } = useEquippedCosmetics();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      opacity: number;
      hue: number;
    }

    const actualParticleCount = prefersReducedMotion ? Math.min(10, particleCount) : particleCount;
    const speedMultiplier = prefersReducedMotion ? 0.1 : 1;

    const particles: Particle[] = [];
    for (let i = 0; i < actualParticleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 2 + 0.5,
        speedX: (Math.random() - 0.5) * 0.3 * speedMultiplier,
        speedY: (Math.random() - 0.5) * 0.3 * speedMultiplier,
        opacity: Math.random() * 0.5 + 0.2,
        hue: 260 + Math.random() * 60,
      });
    }

    let animationId: number;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${particle.hue}, 70%, 70%, ${particle.opacity})`;
        ctx.shadowBlur = 10;
        ctx.shadowColor = `hsla(${particle.hue}, 70%, 70%, 0.5)`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationId);
    };
  }, [particleCount, prefersReducedMotion]);

  return (
    <>
      {/* Gradient backdrop */}
      <div 
        className={cn(
          "fixed inset-0 pointer-events-none",
          "bg-gradient-to-br from-background via-background to-background",
          className
        )}
      >
        {/* Ambient glow orbs with smooth animations - colors from equipped cosmetics */}
        <div 
          className={cn(
            "ambient-orb absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[80px]",
            !hasEquippedBackground && "bg-purple-500/8"
          )}
          style={{
            animation: prefersReducedMotion ? "none" : "float-slow 20s ease-in-out infinite",
            ...(hasEquippedBackground && backgroundColors?.[0] && {
              backgroundColor: hexToRgba(backgroundColors[0], 0.08),
            }),
          }}
        />
        <div 
          className={cn(
            "ambient-orb absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full blur-[100px]",
            !hasEquippedBackground && "bg-pink-500/6"
          )}
          style={{
            animation: prefersReducedMotion ? "none" : "float-slow 25s ease-in-out infinite reverse",
            animationDelay: "-5s",
            ...(hasEquippedBackground && backgroundColors?.[1] && {
              backgroundColor: hexToRgba(backgroundColors[1], 0.06),
            }),
          }}
        />
        <div 
          className={cn(
            "ambient-orb absolute top-1/2 right-1/3 w-72 h-72 rounded-full blur-[90px]",
            !hasEquippedBackground && "bg-cyan-500/5"
          )}
          style={{
            animation: prefersReducedMotion ? "none" : "float-slow 22s ease-in-out infinite",
            animationDelay: "-10s",
            ...(hasEquippedBackground && backgroundColors?.[2] && {
              backgroundColor: hexToRgba(backgroundColors[2], 0.05),
            }),
          }}
        />
        <div 
          className={cn(
            "ambient-orb absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full blur-[70px]",
            !hasEquippedBackground && "bg-violet-500/7"
          )}
          style={{
            animation: prefersReducedMotion ? "none" : "float-slow 18s ease-in-out infinite reverse",
            animationDelay: "-3s",
            ...(hasEquippedBackground && backgroundColors?.[0] && {
              backgroundColor: hexToRgba(backgroundColors[0], 0.07),
            }),
          }}
        />
      </div>
      
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.5 }}
      />
      
      {/* CSS for smooth float animation */}
      <style>{`
        @keyframes float-slow {
          0%, 100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.6;
          }
          25% {
            transform: translate(20px, -30px) scale(1.05);
            opacity: 0.8;
          }
          50% {
            transform: translate(-10px, 20px) scale(0.95);
            opacity: 0.5;
          }
          75% {
            transform: translate(15px, 10px) scale(1.02);
            opacity: 0.7;
          }
        }
        
        @media (prefers-reduced-motion: reduce) {
          .ambient-orb {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}
