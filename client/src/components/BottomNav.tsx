import { useLocation, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Target, Compass, TrendingUp, User, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { href: "/", icon: Target, label: "Practice" },
  { href: "/journey", icon: Compass, label: "Journey" },
  { href: "/progress", icon: TrendingUp, label: "Progress" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function BottomNav() {
  const [location] = useLocation();
  const [showFeedback, setShowFeedback] = useState(false);

  const { data: challengeData } = useQuery<{ count: number }>({
    queryKey: ["/api/weekly-challenges/uncompleted-count"],
    refetchInterval: 60000,
  });

  const uncompletedCount = challengeData?.count || 0;

  return (
    <>
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

          {/* Feedback button in nav */}
          <motion.button
            onClick={() => setShowFeedback(true)}
            className="flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-xl transition-colors text-muted-foreground hover:text-foreground"
            whileTap={{ scale: 0.95 }}
            data-testid="nav-feedback"
            title="Share feedback"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-[10px] font-medium">Feedback</span>
          </motion.button>
        </div>
      </nav>

      {/* Feedback modal */}
      {showFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Share Feedback</h2>
            <FeedbackForm onClose={() => setShowFeedback(false)} />
          </div>
        </div>
      )}
    </>
  );
}

function FeedbackForm({ onClose }: { onClose: () => void }) {
  const [improvementMessage, setImprovementMessage] = useState("");
  const [positiveMessage, setPositiveMessage] = useState("");
  const { toast } = useToast();
  
  const { mutate: submitImprovement, isPending: isPendingImprovement } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "improvement",
          message: improvementMessage.trim(),
          platform: "web",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setImprovementMessage("");
      toast({ title: "Thanks for the suggestion. We're listening." });
    },
    onError: () => {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    },
  });

  const { mutate: submitPositive, isPending: isPendingPositive } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "positive",
          message: positiveMessage.trim(),
          platform: "web",
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      return res.json();
    },
    onSuccess: () => {
      setPositiveMessage("");
      toast({ title: "Got it. This helps more than you know." });
    },
    onError: () => {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    },
  });

  const isLoading = isPendingImprovement || isPendingPositive;
  const hasImprovement = improvementMessage.trim().length >= 5;
  const hasPositive = positiveMessage.trim().length >= 5;
  const canSubmit = hasImprovement || hasPositive;

  const handleSubmit = async () => {
    if (hasImprovement) {
      submitImprovement();
    }
    if (hasPositive) {
      submitPositive();
    }
    if (!isLoading && canSubmit) {
      setTimeout(() => {
        setImprovementMessage("");
        setPositiveMessage("");
        onClose();
      }, 500);
    }
  };

  return (
    <div className="space-y-4">
      {/* Improvement section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">What could be improved?</label>
        <p className="text-xs text-muted-foreground">Help us understand what felt confusing or could work better.</p>
        <textarea
          placeholder="Tell us what could be better…"
          value={improvementMessage}
          onChange={(e) => setImprovementMessage(e.target.value)}
          className="w-full p-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
        />
      </div>

      {/* Positive section */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">What worked well?</label>
        <p className="text-xs text-muted-foreground">Tell us what felt helpful or meaningful.</p>
        <textarea
          placeholder="Tell us what worked well…"
          value={positiveMessage}
          onChange={(e) => setPositiveMessage(e.target.value)}
          className="w-full p-3 rounded-lg border border-input bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary min-h-[80px] resize-none"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={onClose} variant="outline" className="flex-1">Close</Button>
        <Button 
          onClick={handleSubmit} 
          disabled={isLoading || !canSubmit} 
          className="flex-1"
        >
          {isLoading ? "Sending..." : "Send"}
        </Button>
      </div>
    </div>
  );
}
