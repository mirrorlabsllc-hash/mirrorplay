import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MysticalOrb } from "@/components/MysticalOrb";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { Mic, Square, Keyboard, RefreshCw, ArrowRight, Loader2, Volume2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import type { WheelCategory } from "@/components/SpinWheel";
import type { PracticeHandoff } from "@shared/promptBank";

interface VoicePracticeSessionProps {
  category: WheelCategory;
  prompt: PracticeHandoff;
  onComplete: (response: string, audioData?: string, duration?: number) => void;
  onSkip: () => void;
  isProcessing?: boolean;
}

type SessionPhase = "ai-speaking" | "ready" | "recording" | "processing" | "text-input";

export function VoicePracticeSession({
  category,
  prompt,
  onComplete,
  onSkip,
  isProcessing = false,
}: VoicePracticeSessionProps) {
  const [phase, setPhase] = useState<SessionPhase>("ai-speaking");
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [textResponse, setTextResponse] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakPrompt = useCallback(async () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPhase("ai-speaking");
    setIsSpeaking(true);
    try {
      const res = await apiRequest("POST", "/api/tts", { text: prompt.line, section: "scenario" });
      const data = await res.json();
      
      if (data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRef.current = audio;
        
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            setIsSpeaking(false);
            resolve();
          };
          audio.onerror = () => {
            setIsSpeaking(false);
            resolve();
          };
          audio.play().catch(() => {
            setIsSpeaking(false);
            resolve();
          });
        });
      } else {
        setIsSpeaking(false);
      }
    } catch {
      setIsSpeaking(false);
    }
    
    setTimeout(() => setPhase("ready"), 500);
  }, [prompt.line]);

  useEffect(() => {
    speakPrompt();
  }, [prompt.line]);

  useEffect(() => {
    return () => {
      stopRecording();
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    setAudioLevel(average / 255);
    
    if (phase === "recording") {
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [phase]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const mimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg', ''];
      const mimeType = mimeTypes.find(type => type === '' || MediaRecorder.isTypeSupported(type)) || '';
      
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      chunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        if (chunksRef.current.length > 0) {
          await processRecording();
        }
      };

      mediaRecorderRef.current.start(100);
      setPhase("recording");
      setRecordingTime(0);
      
      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);

      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
    } catch (err) {
      console.error("Failed to start recording:", err);
      setPhase("text-input");
    }
  };

  const stopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
    }
    setAudioLevel(0);
  };

  const processRecording = async () => {
    setPhase("processing");
    
    try {
      const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(audioBlob);
      
      const audioBase64 = await base64Promise;
      
      const response = await apiRequest("POST", "/api/transcribe", { audioBase64 });

      if (!response.ok) throw new Error("Transcription failed");

      const { text } = await response.json();
      
      onComplete(text, audioBase64, recordingTime);
    } catch (err) {
      console.error("Processing error:", err);
      setPhase("text-input");
    }
  };

  const handleTextSubmit = () => {
    if (textResponse.trim()) {
      onComplete(textResponse.trim());
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const CategoryIcon = category.icon;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-2"
      >
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${category.color}20` }}
        >
          <CategoryIcon className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <span className="text-lg font-medium" style={{ color: category.color }}>
          {category.label}
        </span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="w-full"
      >
        <GlassCard className="w-full p-6" data-testid="prompt-card">
          <p className="text-lg text-center leading-relaxed" data-testid="practice-prompt">
            {prompt.line}
          </p>
          <p className="text-sm text-center text-muted-foreground mt-2">Tap to speak.</p>
        </GlassCard>
      </motion.div>

      <motion.div 
        className="relative my-4"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <MysticalOrb
          size="lg"
          isActive={phase === "recording"}
          isSpeaking={isSpeaking || (phase === "recording" && audioLevel > 0.1)}
          onClick={phase === "ready" ? startRecording : phase === "recording" ? stopRecording : undefined}
          data-testid="practice-orb"
        />
        
        {phase === "ai-speaking" && (
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 text-violet-400">
              <Volume2 className="w-4 h-4 animate-pulse" />
              <span className="text-sm">Mirror is speaking...</span>
            </div>
          </motion.div>
        )}
        
        {phase === "recording" && (
          <motion.div
            className="absolute -bottom-10 left-1/2 -translate-x-1/2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono" data-testid="recording-time">
                {formatTime(recordingTime)}
              </span>
            </div>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{ 
              boxShadow: `0 0 ${30 + audioLevel * 50}px ${10 + audioLevel * 20}px ${category.color}40`,
            }}
            transition={{ duration: 0.1 }}
          />
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {phase === "ai-speaking" && (
          <motion.div
            key="ai-speaking"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3 mt-4"
          >
            <p className="text-sm text-muted-foreground text-center">
              Listen to the scenario...
            </p>
          </motion.div>
        )}

        {phase === "ready" && (
          <motion.div
            key="ready"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center gap-6 mt-4"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Button 
                size="lg" 
                onClick={startRecording}
                className="gap-3 px-8 py-6 text-lg"
                data-testid="button-start-recording"
              >
                <Mic className="w-6 h-6" />
                Tap to Speak
              </Button>
            </motion.div>
            
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setPhase("text-input")}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors flex items-center gap-1"
              data-testid="button-switch-to-text"
            >
              <Keyboard className="w-3 h-3" />
              or type instead
            </motion.button>
          </motion.div>
        )}

        {phase === "recording" && (
          <motion.div
            key="recording"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 mt-4"
          >
            <p className="text-sm text-muted-foreground">Speak your response...</p>
            <Button
              variant="outline"
              size="lg"
              onClick={stopRecording}
              className="gap-2"
              data-testid="button-stop-recording"
            >
              <Square className="w-4 h-4 fill-current" />
              Done
            </Button>
          </motion.div>
        )}

        {(phase === "processing" || isProcessing) && (
          <motion.div
            key="processing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3 mt-4"
          >
            <Loader2 className="w-8 h-8 animate-spin text-violet-400" />
            <p className="text-sm text-muted-foreground">
              Analyzing your response...
            </p>
          </motion.div>
        )}

        {phase === "text-input" && !isProcessing && (
          <motion.div
            key="text-input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full space-y-4 mt-4"
          >
            <Textarea
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              placeholder="Type your response here..."
              className="min-h-[120px] resize-none"
              autoFocus
              data-testid="text-response-input"
            />
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPhase("ready")}
                className="text-muted-foreground gap-2"
                data-testid="button-switch-to-voice"
              >
                <Mic className="w-4 h-4" />
                Use voice
              </Button>
              <Button
                onClick={handleTextSubmit}
                disabled={!textResponse.trim() || isProcessing}
                className="gap-2"
                data-testid="button-submit-text"
              >
                Submit
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {phase !== "ai-speaking" && phase !== "processing" && !isProcessing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onSkip}
            className="text-muted-foreground/60 hover:text-muted-foreground mt-2"
            data-testid="button-skip-prompt"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try different prompt
          </Button>
        </motion.div>
      )}
    </div>
  );
}
