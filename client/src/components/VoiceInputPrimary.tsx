import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GlassCard } from "@/components/GlassCard";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Mic, 
  Square, 
  RotateCcw, 
  Send, 
  Loader2,
  Keyboard,
  ChevronDown,
  ChevronUp,
  Volume2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceInputPrimaryProps {
  onSubmit: (text: string) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
  placeholder?: string;
  autoStart?: boolean;
  autoStartDelay?: number;
  silenceThreshold?: number;
  onPlayPrompt?: () => void;
  promptText?: string;
  submitLabel?: string;
}

type RecordingPhase = "idle" | "recording" | "silence-detected" | "transcribing" | "ready";

export function VoiceInputPrimary({ 
  onSubmit, 
  isSubmitting, 
  disabled,
  placeholder = "Your response will appear here...",
  autoStart = true,
  autoStartDelay = 1500,
  silenceThreshold = 3000,
  onPlayPrompt,
  promptText,
  submitLabel = "Submit"
}: VoiceInputPrimaryProps) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<RecordingPhase>("idle");
  const [transcribedText, setTranscribedText] = useState("");
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionRequested, setPermissionRequested] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());

  const cleanup = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const checkAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    if (normalizedLevel > 0.05) {
      lastSoundTimeRef.current = Date.now();
    }

    const timeSinceSound = Date.now() - lastSoundTimeRef.current;
    if (timeSinceSound > silenceThreshold && phase === "recording") {
      setPhase("silence-detected");
      stopRecording();
      return;
    }

    if (phase === "recording") {
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    }
  }, [phase, silenceThreshold]);

  const requestMicrophonePermission = async (): Promise<MediaStream | null> => {
    try {
      setPermissionRequested(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      return stream;
    } catch {
      setHasPermission(false);
      toast({
        title: "Microphone access required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
      return null;
    }
  };

  const startRecording = async () => {
    const stream = await requestMicrophonePermission();
    if (!stream) return;

    streamRef.current = stream;
    audioChunksRef.current = [];
    lastSoundTimeRef.current = Date.now();

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyserRef.current = analyser;

    const getSupportedMimeType = (): string => {
      const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', ''];
      for (const type of types) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) return type;
      }
      return '';
    };
    
    const mimeType = getSupportedMimeType();
    const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
    
    let mediaRecorder: MediaRecorder;
    try {
      mediaRecorder = new MediaRecorder(stream, recorderOptions);
    } catch {
      mediaRecorder = new MediaRecorder(stream);
    }
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = async () => {
      cleanup();
      
      if (audioChunksRef.current.length > 0) {
        setPhase("transcribing");
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64 = (reader.result as string).split(',')[1];
          try {
            const res = await apiRequest("POST", "/api/transcribe", { audioBase64: base64 });
            const data = await res.json();
            if (data.text) {
              setTranscribedText(data.text);
              setPhase("ready");
            } else {
              setPhase("idle");
              toast({
                title: "No speech detected",
                description: "We couldn't hear anything. Please try again.",
              });
            }
          } catch {
            setPhase("idle");
            toast({
              title: "Transcription failed",
              description: "Could not convert your speech to text. Please try again.",
              variant: "destructive",
            });
          }
        };
        reader.readAsDataURL(audioBlob);
      }
    };

    mediaRecorder.start(100);
    setPhase("recording");
    checkAudioLevel();
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRetry = () => {
    setTranscribedText("");
    setPhase("idle");
    setTimeout(() => startRecording(), 500);
  };

  const handleSubmit = () => {
    const text = showTextInput ? textInput.trim() : transcribedText.trim();
    if (!text) return;
    onSubmit(text);
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    onSubmit(textInput.trim());
  };

  useEffect(() => {
    if (autoStart && hasPermission !== false && phase === "idle" && !disabled && !permissionRequested) {
      const timer = setTimeout(() => {
        startRecording();
      }, autoStartDelay);
      return () => clearTimeout(timer);
    }
  }, [autoStart, autoStartDelay, hasPermission, phase, disabled, permissionRequested]);

  const getStatusText = () => {
    switch (phase) {
      case "recording": return "Listening...";
      case "silence-detected": return "Processing...";
      case "transcribing": return "Transcribing...";
      case "ready": return "Ready to submit";
      default: return "Tap to start";
    }
  };

  const getSilencePhase = () => {
    switch (phase) {
      case "silence-detected": return "thinking";
      case "transcribing": return "preparing";
      default: return "active";
    }
  };

  if (hasPermission === false) {
    return (
      <GlassCard variant="dark" className="text-center py-8">
        <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Microphone access is required for voice practice</p>
        <Button onClick={requestMicrophonePermission} data-testid="button-request-mic">
          Enable Microphone
        </Button>
        <div className="mt-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowTextInput(true)}
            className="text-muted-foreground"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            Type instead
          </Button>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {promptText && onPlayPrompt && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onPlayPrompt}
          className="w-full justify-start text-muted-foreground"
          data-testid="button-play-prompt"
        >
          <Volume2 className="w-4 h-4 mr-2" />
          Hear prompt again
        </Button>
      )}

      <AnimatePresence mode="wait">
        {!showTextInput ? (
          <motion.div
            key="voice-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard variant="dark" className="space-y-6">
              <div className="flex flex-col items-center gap-4">
                {phase === "idle" && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <motion.button
                      onClick={startRecording}
                      disabled={disabled || isSubmitting}
                      className={cn(
                        "w-24 h-24 rounded-full flex items-center justify-center",
                        "bg-primary/20 hover:bg-primary/30 transition-colors",
                        "focus:outline-none focus:ring-2 focus:ring-primary/50"
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      data-testid="button-start-voice"
                    >
                      <Mic className="w-10 h-10 text-primary" />
                    </motion.button>
                    <p className="text-sm text-muted-foreground">Tap to speak</p>
                  </motion.div>
                )}

                {(phase === "recording" || phase === "silence-detected") && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4 w-full"
                  >
                    <VoiceWaveform 
                      audioLevel={audioLevel} 
                      isListening={phase === "recording"}
                      silencePhase={getSilencePhase() as "active" | "thinking" | "preparing" | "submitting"}
                    />
                    
                    {phase === "recording" && (
                      <Button
                        variant="destructive"
                        onClick={stopRecording}
                        className="gap-2"
                        data-testid="button-stop-voice"
                      >
                        <Square className="w-4 h-4" />
                        Done Speaking
                      </Button>
                    )}
                  </motion.div>
                )}

                {phase === "transcribing" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center gap-4"
                  >
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Transcribing your response...</p>
                  </motion.div>
                )}

                {phase === "ready" && transcribedText && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full space-y-4"
                  >
                    <div className="p-4 rounded-lg bg-muted/30 border border-white/10">
                      <p className="text-sm text-muted-foreground mb-1">Your response:</p>
                      <p className="text-foreground" data-testid="text-transcribed">{transcribedText}</p>
                    </div>

                    <div className="flex gap-3 justify-center">
                      <Button
                        variant="outline"
                        onClick={handleRetry}
                        disabled={isSubmitting}
                        className="gap-2"
                        data-testid="button-retry-voice"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Re-record
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="gap-2"
                        data-testid="button-submit-voice"
                      >
                        {isSubmitting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {submitLabel}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </div>
            </GlassCard>

            <motion.div 
              className="mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTextInput(true)}
                className="w-full text-muted-foreground hover:text-foreground"
                data-testid="button-show-text-input"
              >
                <Keyboard className="w-4 h-4 mr-2" />
                Type instead
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            key="text-input"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassCard variant="dark" className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowTextInput(false)}
                className="w-full text-muted-foreground hover:text-foreground"
                data-testid="button-hide-text-input"
              >
                <Mic className="w-4 h-4 mr-2" />
                Use voice instead
                <ChevronUp className="w-4 h-4 ml-2" />
              </Button>

              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder={placeholder}
                className="min-h-[120px] resize-none"
                disabled={disabled || isSubmitting}
                data-testid="textarea-response"
              />

              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim() || isSubmitting}
                className="w-full gap-2"
                data-testid="button-submit-text"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {submitLabel}
              </Button>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
