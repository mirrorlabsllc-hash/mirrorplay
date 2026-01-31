import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface GlassCardProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode;
  variant?: "default" | "dark" | "glow" | "reflection";
  hover?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  variant = "default",
  hover = false,
  ...props 
}: GlassCardProps) {
  const variants = {
    default: "glass",
    dark: "glass-dark",
    glow: "glass-glow",
    reflection: "glass-reflection",
  };

  return (
    <motion.div
      className={cn(
        "rounded-xl p-4",
        variants[variant],
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-lg",
        className
      )}
      whileHover={hover ? { y: -2 } : undefined}
      {...props}
    >
      {children}
    </motion.div>
  );
}
