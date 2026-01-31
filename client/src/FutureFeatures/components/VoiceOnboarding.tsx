import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { VoiceSetup } from "./VoiceSetup";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mic, 
  Sparkles, 
  ArrowRight, 
  Volume2,
  SkipForward
} from "lucide-react";

interface VoiceOnboardingProps {
  onComplete: () => void;
}

export function VoiceOnboarding({ onComplete }: VoiceOnboardingProps) {
  const [step, setStep] = useState<"intro" | "setup" | "complete">("intro");
  const queryClient = useQueryClient();

  const skipMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/voice/onboarding/skip");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      onComplete();
    },
  });

  const handleVoiceSetupComplete = () => {
    setStep("complete");
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      onComplete();
    }, 2000);
  };

  const handleSkip = () => {
    skipMutation.mutate();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {step === "intro" && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 max-w-lg mx-4 text-center"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ 
                duration: 3, 
                repeat: Infinity,
                repeatType: "reverse"
              }}
              className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center border border-blue-400/30"
            >
              <Mic className="w-12 h-12 text-blue-400" />
            </motion.div>

            <h1 className="text-3xl font-bold text-white mb-4">
              Make Mirror Sound Like You
            </h1>
            
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Record your voice once, and Mirror will speak to you in your own voice. 
              It's like having a conversation with the best version of yourself.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-4 text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Volume2 className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">Personal Connection</h3>
                  <p className="text-sm text-slate-400">Hearing advice in your own voice makes it feel more authentic</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-left p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium text-white">AI-Powered Cloning</h3>
                  <p className="text-sm text-slate-400">Just 30 seconds of speech creates a natural-sounding voice</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button 
                size="lg" 
                onClick={() => setStep("setup")}
                className="w-full gap-2 bg-gradient-to-r from-blue-600 to-purple-600"
                data-testid="button-setup-voice"
              >
                Set Up My Voice
                <ArrowRight className="w-5 h-5" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={skipMutation.isPending}
                className="w-full text-slate-400"
                data-testid="button-skip-voice"
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Skip for Now
              </Button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              You can always set up your voice later in Profile settings
            </p>
          </motion.div>
        )}

        {step === "setup" && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative z-10 w-full max-w-md mx-4"
          >
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Record Your Voice</h2>
              <p className="text-slate-400">Read the prompt below naturally for about 30 seconds</p>
            </div>
            
            <VoiceSetup onComplete={handleVoiceSetupComplete} />
            
            <div className="mt-4 text-center">
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={skipMutation.isPending}
                className="text-slate-400"
                data-testid="button-skip-setup"
              >
                Skip for Now
              </Button>
            </div>
          </motion.div>
        )}

        {step === "complete" && (
          <motion.div
            key="complete"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center border border-emerald-400/30"
            >
              <Sparkles className="w-12 h-12 text-emerald-400" />
            </motion.div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Voice Clone Created!</h2>
            <p className="text-slate-400">Mirror will now speak in your voice</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
