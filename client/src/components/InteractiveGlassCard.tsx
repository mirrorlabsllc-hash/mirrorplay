import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InteractiveGlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "dark" | "glow" | "reflection";
  onClick?: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}

export function InteractiveGlassCard({
  children,
  className = "",
  variant = "default",
  onClick,
  disabled = false,
  "data-testid": testId,
}: InteractiveGlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);

  const variants = {
    default: "glass",
    dark: "glass-dark",
    glow: "glass-glow",
    reflection: "glass-reflection",
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || disabled) return;
    
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    setMousePosition({ x, y });
  }, [disabled]);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) setIsHovering(true);
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setMousePosition({ x: 0.5, y: 0.5 });
  }, []);

  const rotateX = isHovering ? (mousePosition.y - 0.5) * -30 : 0;
  const rotateY = isHovering ? (mousePosition.x - 0.5) * 30 : 0;

  const shimmerX = mousePosition.x * 100;
  const shimmerY = mousePosition.y * 100;

  return (
    <motion.div
      ref={cardRef}
      className="relative"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={disabled ? undefined : onClick}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      data-testid={testId}
    >
      <motion.div
        animate={{
          rotateX,
          rotateY,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ transformStyle: "preserve-3d" }}
      >
        <div
          className={cn(
            "relative overflow-hidden rounded-xl p-4 transition-shadow duration-300",
            variants[variant],
            disabled ? "cursor-default" : "cursor-pointer",
            isHovering && !disabled ? "shadow-lg shadow-violet-500/20" : "",
            className
          )}
        >
          {isHovering && !disabled && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                background: `radial-gradient(circle at ${shimmerX}% ${shimmerY}%, rgba(168, 85, 247, 0.25) 0%, transparent 50%)`,
              }}
            />
          )}

          {isHovering && !disabled && (
            <motion.div
              className="absolute inset-0 pointer-events-none z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              style={{
                background: `linear-gradient(${105 + (mousePosition.x - 0.5) * 30}deg, transparent 40%, rgba(255, 255, 255, 0.1) 50%, transparent 60%)`,
              }}
            />
          )}

          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
