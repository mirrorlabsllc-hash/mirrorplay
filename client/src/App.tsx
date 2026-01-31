import { useState, useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { AmbientBackground } from "@/components/AmbientBackground";
import { BottomNav } from "@/components/BottomNav";
import { LevelUpModal, useLevelUpDetection } from "@/components/LevelUpModal";
import { WeatherEffects, useMoodWeather } from "@/components/WeatherEffects";
import { Loader2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { FloatingParticles } from "@/components/FloatingParticles";
import { SoundToggle } from "@/components/SoundToggle";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { OnboardingProvider } from "@/components/OnboardingTour";
import { FeedbackButton } from "@/components/FeedbackButton";
import type { UserProgress } from "@shared/schema";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import PracticeHub from "@/pages/PracticeHub";
import JourneyHub from "@/pages/JourneyHub";
import Profile from "@/pages/Profile";
import Settings from "@/pages/Settings";
import Practice from "@/pages/Practice";
import Progress from "@/pages/Progress";
import Subscribe from "@/pages/Subscribe";
import CalmMode from "@/pages/CalmMode";
import FAQ from "@/pages/FAQ";
import Privacy from "@/pages/Privacy";
import ToneJourney from "@/pages/ToneJourney";
import NotFound from "@/pages/not-found";
import VoiceSettings from "@/FutureFeatures/pages/VoiceSettings";
import AdminFeedback from "@/pages/AdminFeedback";

const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] },
};

function AnimatedRoutes() {
  const [location] = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location}
        initial={pageTransition.initial}
        animate={pageTransition.animate}
        exit={pageTransition.exit}
        transition={pageTransition.transition}
        className="min-h-full"
      >
        <Switch location={location}>
          {/* Main tab hubs */}
          <Route path="/" component={PracticeHub} />
          <Route path="/journey" component={JourneyHub} />
          <Route path="/profile" component={Profile} />
          
          {/* Practice sub-routes */}
          <Route path="/practice" component={Practice} />
          <Route path="/practice/quick" component={Practice} />
          
          {/* Journey sub-routes */}
          <Route path="/progress" component={Progress} />
          <Route path="/tone-journey" component={ToneJourney} />
          
          {/* Wellness sub-routes */}
          <Route path="/calm" component={CalmMode} />
          
          {/* Profile sub-routes */}
          <Route path="/settings" component={Settings} />
          <Route path="/subscribe" component={Subscribe} />
          <Route path="/voice" component={VoiceSettings} />
          
          {/* Public pages accessible when logged in */}
          <Route path="/faq" component={FAQ} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/admin/feedback" component={AdminFeedback} />
          
          <Route component={NotFound} />
        </Switch>
      </motion.div>
    </AnimatePresence>
  );
}

function AuthenticatedApp() {
  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { showModal, leveledUpTo, handleClose } = useLevelUpDetection(progress?.level ?? undefined);
  const { weatherEffect, intensity } = useMoodWeather();

  return (
    <OnboardingProvider>
      <div className="min-h-screen bg-background relative">
        <AmbientBackground />
        <WeatherEffects weatherType={weatherEffect} intensity={intensity} />
        <FloatingParticles count={15} className="z-0" />
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <SoundToggle />
          <a href="/api/logout" data-testid="button-exit">
            <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
              <LogOut className="w-5 h-5" />
            </Button>
          </a>
        </div>
        <main className="relative z-10">
          <AnimatedRoutes />
        </main>
        <BottomNav />
        <FeedbackButton />
        <LevelUpModal 
          isOpen={showModal} 
          onClose={handleClose} 
          newLevel={leveledUpTo}
        />
      </div>
    </OnboardingProvider>
  );
}

function UnauthenticatedApp() {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-background relative">
      <AmbientBackground />
      <main className="relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
          >
            <Switch location={location}>
              <Route path="/login" component={Login} />
              <Route path="/faq" component={FAQ} />
              <Route path="/privacy" component={Privacy} />
              <Route component={Landing} />
            </Switch>
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Loading Mirror Play...</p>
      </div>
    </div>
  );
}

// Safely initialize HelloSkip with timeout to prevent blocking
// Option 1: Gate behind env flag for production control
// Option 2: Fail-open with timeout and try-catch
function initializeHelloSkip() {
  // Option 1: Check environment variable
  const skipEnabled = import.meta.env.VITE_SKIP_ENABLED === 'true';
  
  if (!skipEnabled) {
    console.log('HelloSkip disabled via VITE_SKIP_ENABLED');
    return;
  }

  // Option 2: Set a timeout to ensure the app loads even if HelloSkip fails
  const timeoutId = setTimeout(() => {
    console.warn('HelloSkip initialization timed out, continuing app load');
  }, 3000); // 3 second timeout

  try {
    // Check if HelloSkip is already loaded
    if (typeof (window as any).HelloSkip !== 'undefined') {
      clearTimeout(timeoutId);
      console.log('HelloSkip initialized');
    }
  } catch (e) {
    console.warn('HelloSkip initialization failed, continuing app load', e);
  }
}

function Router() {
  const { user, isLoading } = useAuth();

  // Initialize HelloSkip safely on first render
  useEffect(() => {
    initializeHelloSkip();
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Router />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
// security scan refresh