import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX } from "lucide-react";
import { getMuted, setMuted, initSounds } from "@/lib/sounds";
import { useReducedMotion } from "@/hooks/useReducedMotion";

export function SoundToggle() {
  const [isMuted, setIsMuted] = useState(true);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    setIsMuted(getMuted());
  }, []);

  useEffect(() => {
    if (prefersReducedMotion && !isMuted) {
      handleToggle();
    }
  }, [prefersReducedMotion]);

  const handleToggle = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    setMuted(newMuted);
    if (!newMuted) {
      initSounds();
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
      data-testid="button-sound-toggle"
    >
      {isMuted ? (
        <VolumeX className="w-5 h-5 text-muted-foreground" />
      ) : (
        <Volume2 className="w-5 h-5" />
      )}
    </Button>
  );
}
