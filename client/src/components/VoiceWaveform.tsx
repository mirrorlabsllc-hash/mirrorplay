import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  audioLevel: number;
  isListening: boolean;
  silencePhase: "active" | "thinking" | "preparing" | "submitting";
  className?: string;
}

export function VoiceWaveform({ audioLevel, isListening, silencePhase, className }: VoiceWaveformProps) {
  const bars = 12;
  
  const getPhaseColor = () => {
    switch (silencePhase) {
      case "thinking": return "bg-amber-400";
      case "preparing": return "bg-orange-400";
      case "submitting": return "bg-emerald-400";
      default: return "bg-primary";
    }
  };

  const getPhaseText = () => {
    switch (silencePhase) {
      case "thinking": return "Processing...";
      case "preparing": return "Almost ready...";
      case "submitting": return "Submitting...";
      default: return isListening ? "Listening..." : "Ready";
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <div className="flex items-center justify-center gap-1 h-16" data-testid="voice-waveform">
        {Array.from({ length: bars }).map((_, i) => {
          const baseHeight = 8;
          const centerDistance = Math.abs(i - bars / 2 + 0.5) / (bars / 2);
          const heightMultiplier = 1 - centerDistance * 0.5;
          const randomFactor = 0.7 + Math.random() * 0.6;
          const height = isListening 
            ? baseHeight + (audioLevel * 48 * heightMultiplier * randomFactor)
            : baseHeight;

          return (
            <motion.div
              key={i}
              className={cn("w-1 rounded-full transition-colors", getPhaseColor())}
              animate={{ 
                height,
                opacity: isListening ? 0.6 + audioLevel * 0.4 : 0.3,
              }}
              transition={{ 
                duration: 0.1,
                ease: "easeOut",
              }}
            />
          );
        })}
      </div>
      
      <motion.p 
        className="text-sm text-muted-foreground"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        data-testid="voice-status"
      >
        {getPhaseText()}
      </motion.p>
    </div>
  );
}
