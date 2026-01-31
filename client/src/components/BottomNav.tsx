import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Target, Compass, TrendingUp, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { href: "/", icon: Target, label: "Practice" },
  { href: "/journey", icon: Compass, label: "Journey" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();

  const { data: challengeData } = useQuery<{ count: number }>({
    queryKey: ["/api/weekly-challenges/uncompleted-count"],
    refetchInterval: 60000,
  });

  const uncompletedCount = challengeData?.count || 0;

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 glass-dark border-t border-white/5 safe-area-pb"
      data-testid="bottom-nav"
    >
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href !== "/" && location.startsWith(item.href));
          const showChallengeIndicator = item.href === "/" && uncompletedCount > 0;
          
          return (
            <Link key={item.href} to={item.href}>
              <motion.button
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileTap={{ scale: 0.95 }}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <div className="relative">
                  <item.icon className={cn(
                    "w-5 h-5 transition-all",
                    isActive && "drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]"
                  )} />
                  {isActive && (
                    <motion.div
                      className="absolute -bottom-1 left-1/2 w-1 h-1 rounded-full bg-primary"
                      layoutId="nav-indicator"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  {showChallengeIndicator && (
                    <span 
                      className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-[9px] font-bold text-white rounded-full flex items-center justify-center"
                      data-testid="challenge-indicator"
                    >
                      {uncompletedCount > 9 ? "9+" : uncompletedCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.label}</span>
              </motion.button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
