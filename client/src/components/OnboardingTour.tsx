import { useState, useEffect, createContext, useContext, type ElementType, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { useAuth } from "@/hooks/useAuth";
import { 
  Target, 
  Compass, 
  TrendingUp, 
  User,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Mic,
  MessageSquare,
  Gift
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: ElementType;
  iconColor: string;
  position?: "center" | "bottom";
  highlight?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Mirror Play!",
    description: "Your personal space to practice communication and build emotional intelligence. Let's take a quick tour of what you can do here.",
    icon: Sparkles,
    iconColor: "#a855f7",
    position: "center",
  },
  {
    id: "practice",
    title: "Practice Hub",
    description: "This is where the magic happens! Spin the wheel or choose a category to practice real-life conversations. Speak or type your responses and get instant AI feedback.",
    icon: Target,
    iconColor: "#8b5cf6",
    highlight: "nav-practice",
  },
  {
    id: "voice",
    title: "Voice-First Experience",
    description: "Mirror Play is designed for your voice. Tap the microphone to speak naturally, and our AI will analyze your tone, energy, and emotional clarity.",
    icon: Mic,
    iconColor: "#06b6d4",
    position: "center",
  },
  {
    id: "feedback",
    title: "Detailed Feedback",
    description: "After each practice, you'll receive personalized insights including your strengths, areas to grow, and alternative ways to phrase your response.",
    icon: MessageSquare,
    iconColor: "#10b981",
    position: "center",
  },
  {
    id: "journey",
    title: "Your Journey",
    description: "Track your progress through Story Mode, take on weekly challenges, and watch yourself grow over time.",
    icon: Compass,
    iconColor: "#f59e0b",
    highlight: "nav-journey",
  },
  {
    id: "progress",
    title: "See Your Growth",
    description: "View your stats, streaks, and achievements. The more you practice, the more XP you earn and the higher you level up!",
    icon: TrendingUp,
    iconColor: "#ec4899",
    highlight: "nav-progress",
  },
  {
    id: "profile",
    title: "Your Profile",
    description: "Customize your experience, manage settings, and unlock special features as you progress.",
    icon: User,
    iconColor: "#6366f1",
    highlight: "nav-profile",
  },
  {
    id: "rewards",
    title: "Earn Rewards",
    description: "Complete daily check-ins, maintain streaks, and unlock new categories as you level up. Ready to start your journey?",
    icon: Gift,
    iconColor: "#f43f5e",
    position: "center",
  },
];

const STORAGE_KEY_PREFIX = "mirror-play-onboarding-completed";

interface OnboardingContextType {
  isOpen: boolean;
  openTour: () => void;
  closeTour: () => void;
  resetTour: () => void;
  hasCompletedTour: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(true);

  const getStorageKey = () => {
    if (user?.id) {
      return `${STORAGE_KEY_PREFIX}-${user.id}`;
    }
    return STORAGE_KEY_PREFIX;
  };

  useEffect(() => {
    if (!user) return;
    
    const storageKey = getStorageKey();
    const completed = localStorage.getItem(storageKey) === "true";
    setHasCompletedTour(completed);
    
    if (!completed) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const openTour = () => setIsOpen(true);
  
  const closeTour = () => {
    setIsOpen(false);
    localStorage.setItem(getStorageKey(), "true");
    setHasCompletedTour(true);
  };
  
  const resetTour = () => {
    localStorage.removeItem(getStorageKey());
    setHasCompletedTour(false);
    setIsOpen(true);
  };

  return (
    <OnboardingContext.Provider value={{ isOpen, openTour, closeTour, resetTour, hasCompletedTour }}>
      {children}
      {isOpen && <OnboardingTourContent onComplete={closeTour} />}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingTour() {
  const context = useContext(OnboardingContext);
  if (!context) {
    return {
      isOpen: false,
      openTour: () => {},
      closeTour: () => {},
      resetTour: () => {
        // Clear all onboarding keys when outside provider
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith(STORAGE_KEY_PREFIX)) {
            localStorage.removeItem(key);
          }
        });
      },
      hasCompletedTour: true,
    };
  }
  return context;
}

function OnboardingTourContent({ onComplete }: { onComplete: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [cardPosition, setCardPosition] = useState<{ x: number; arrowX: number } | null>(null);

  useEffect(() => {
    const step = TOUR_STEPS[currentStep];
    if (step?.highlight) {
      const element = document.querySelector(`[data-testid="${step.highlight}"]`) as HTMLElement;
      if (element) {
        const updateRect = () => {
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
          
          const elementCenterX = rect.left + rect.width / 2;
          const windowWidth = window.innerWidth;
          const cardWidth = Math.min(windowWidth * 0.9, 400);
          
          let cardX = elementCenterX - cardWidth / 2;
          cardX = Math.max(16, Math.min(cardX, windowWidth - cardWidth - 16));
          
          const arrowX = elementCenterX - cardX;
          
          setCardPosition({ x: cardX, arrowX });
        };
        updateRect();
        window.addEventListener('resize', updateRect);
        window.addEventListener('scroll', updateRect);
        return () => {
          window.removeEventListener('resize', updateRect);
          window.removeEventListener('scroll', updateRect);
        };
      }
    }
    setHighlightRect(null);
    setCardPosition(null);
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TOUR_STEPS[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const StepIcon = step.icon;
  const hasHighlight = !!step.highlight && !!highlightRect;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100]"
        data-testid="onboarding-tour"
      >
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onComplete}
        />

        {highlightRect && (
          <>
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute rounded-xl pointer-events-none"
              style={{
                left: highlightRect.left - 8,
                top: highlightRect.top - 8,
                width: highlightRect.width + 16,
                height: highlightRect.height + 16,
                background: "rgba(139, 92, 246, 0.15)",
                border: "2px solid rgba(139, 92, 246, 0.6)",
                boxShadow: "0 0 30px 8px rgba(139, 92, 246, 0.4), inset 0 0 20px rgba(139, 92, 246, 0.2)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="absolute pointer-events-none"
              style={{
                left: highlightRect.left + highlightRect.width / 2 - 6,
                top: highlightRect.top - 12,
              }}
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="w-3 h-3 rotate-45 bg-primary border-t-2 border-l-2 border-primary"
              />
            </motion.div>
          </>
        )}

        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", duration: 0.5 }}
          className={cn(
            "absolute w-[90%] max-w-md",
            hasHighlight ? "" : "left-1/2 -translate-x-1/2",
            step.position === "center" && !hasHighlight ? "top-1/2 -translate-y-1/2" : ""
          )}
          style={hasHighlight && cardPosition ? {
            left: cardPosition.x,
            bottom: window.innerHeight - (highlightRect?.top || 0) + 24,
          } : !step.position || step.position === "bottom" ? {
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
          } : undefined}
        >
          {hasHighlight && cardPosition && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: 0.3 }}
              className="absolute -bottom-6 flex flex-col items-center"
              style={{ left: cardPosition.arrowX - 8 }}
            >
              <div className="w-4 h-4 rotate-45 bg-card border-b-2 border-r-2 border-primary/50" />
              <motion.div
                animate={{ height: [16, 24, 16] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-0.5 bg-gradient-to-b from-primary/60 to-transparent -mt-2"
                style={{ height: 20 }}
              />
            </motion.div>
          )}
          
          <GlassCard className="p-6 relative" variant="glow">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={onComplete}
              data-testid="button-skip-tour"
            >
              <X className="w-4 h-4" />
            </Button>

            <div className="flex flex-col items-center text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${step.iconColor}20` }}
              >
                <StepIcon className="w-8 h-8" style={{ color: step.iconColor }} />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold">{step.title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="flex items-center gap-1.5 py-2">
                {TOUR_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      index === currentStep 
                        ? "bg-primary w-6" 
                        : index < currentStep 
                          ? "bg-primary/50" 
                          : "bg-muted-foreground/30"
                    )}
                    data-testid={`tour-dot-${index}`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3 w-full pt-2">
                {!isFirstStep && (
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    className="flex-1 gap-2"
                    data-testid="button-tour-previous"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  className={cn("gap-2", isFirstStep ? "w-full" : "flex-1")}
                  data-testid="button-tour-next"
                >
                  {isLastStep ? (
                    <>
                      Let's Go!
                      <Sparkles className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>

              {isFirstStep && (
                <button
                  onClick={onComplete}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  data-testid="button-skip-intro"
                >
                  Skip introduction
                </button>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function OnboardingTour() {
  return null;
}
