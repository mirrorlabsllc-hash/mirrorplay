import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  "data-testid"?: string;
}

export function InteractiveCard({
  children,
  className = "",
  onClick,
  disabled = false,
  "data-testid": testId,
}: InteractiveCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0.5, y: 0.5 });
  const [isHovering, setIsHovering] = useState(false);

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
      className="relative perspective-1000"
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
        <Card
          className={`relative overflow-hidden transition-shadow duration-300 ${
            disabled ? "cursor-default" : "cursor-pointer"
          } ${isHovering && !disabled ? "shadow-lg shadow-violet-500/20" : ""} ${className}`}
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
        </Card>
      </motion.div>
    </motion.div>
  );
}

export type TransitionType = "bounce" | "tvOff" | "genie";

export const transitionVariants = {
  bounce: {
    initial: { scale: 1, opacity: 1 },
    exit: { 
      scale: [1, 1.1, 0.3, 0],
      opacity: [1, 1, 0.8, 0],
      transition: { duration: 0.5, ease: "easeInOut" }
    },
  },
  tvOff: {
    initial: { scale: 1, opacity: 1, scaleY: 1 },
    exit: { 
      scaleY: [1, 1.1, 0.02],
      scaleX: [1, 0.9, 1.5],
      opacity: [1, 1, 0],
      transition: { duration: 0.4, ease: "easeIn" }
    },
  },
  genie: {
    initial: { scale: 1, opacity: 1, y: 0 },
    exit: { 
      scale: [1, 0.8, 0.2, 0],
      y: [0, 20, -100],
      opacity: [1, 0.8, 0],
      rotate: [0, 5, -10, 0],
      transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] }
    },
  },
};

export function getRandomTransition(): TransitionType {
  const transitions: TransitionType[] = ["bounce", "tvOff", "genie"];
  return transitions[Math.floor(Math.random() * transitions.length)];
}
