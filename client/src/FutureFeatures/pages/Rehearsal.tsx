import { useState, useRef, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { UserAvatar } from "@/components/UserAvatar";
import { CoachingOverlay } from "@/components/CoachingOverlay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Send, 
  Loader2,
  Target,
  Lightbulb,
  Star,
  Trophy,
  Mic,
  Square,
  Keyboard
} from "lucide-react";
import { Link } from "wouter";
import { getScenarioById } from "@shared/scenarios";
import { cn } from "@/lib/utils";
import type { CustomScenario } from "@shared/schema";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RehearsalState {
  messages: Message[];
  currentPhase: number;
  escalationLevel: number;
  completed: boolean;
  score?: number;
  feedback?: {
    strengths: string[];
    improvements: string[];
    overallTip: string;
  };
}

export default function Rehearsal() {
  const [, paramsRegular] = useRoute("/rehearsal/:scenarioId");
  const [, paramsCustom] = useRoute("/rehearsal/custom/:customScenarioId");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const isCustomScenario = !!paramsCustom?.customScenarioId;
  const scenarioId = paramsRegular?.scenarioId;
  const customScenarioId = paramsCustom?.customScenarioId;
  
  const regularScenario = scenarioId && !isCustomScenario ? getScenarioById(scenarioId) : null;
  
  const { data: customScenarioData, isLoading: loadingCustom } = useQuery<CustomScenario>({
    queryKey: ["/api/scenarios/custom", customScenarioId],
    enabled: isCustomScenario && !!customScenarioId,
  });
  
  useEffect(() => {
    if (isCustomScenario && customScenarioId) {
      apiRequest("POST", `/api/scenarios/custom/${customScenarioId}/use`).catch(() => {});
    }
  }, [isCustomScenario, customScenarioId]);
  
  const [input, setInput] = useState("");
  const [coachingMinimized, setCoachingMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [state, setState] = useState<RehearsalState>({
    messages: [],
    currentPhase: 0,
    escalationLevel: 1,
    completed: false,
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const silenceThreshold = 4000;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.messages]);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      const payload: Record<string, unknown> = {
        message,
        currentPhase: state.currentPhase,
        escalationLevel: state.escalationLevel,
        messageHistory: state.messages,
      };
      
      if (isCustomScenario && customScenarioData) {
        payload.customScenarioId = customScenarioId;
        payload.customContext = customScenarioData.context;
        payload.customPrompt = customScenarioData.prompt;
        payload.customTips = customScenarioData.tips;
      } else {
        payload.scenarioId = scenarioId;
      }
      
      const res = await apiRequest("POST", "/api/rehearsal/message", payload);
      return res.json();
    },
    onSuccess: (data) => {
      const newMessages = [
        ...state.messages,
        { role: "user" as const, content: input },
        { role: "assistant" as const, content: data.response }
      ];
      
      setState(prev => ({
        ...prev,
        messages: newMessages,
        currentPhase: data.nextPhase ?? prev.currentPhase,
        escalationLevel: data.escalationLevel ?? prev.escalationLevel,
        completed: data.completed ?? false,
        score: data.score,
        feedback: data.feedback,
      }));
      
      setInput("");
      
      if (data.completed) {
        queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
        toast({
          title: `Scenario Complete! +${data.xpEarned || 30} XP`,
          description: data.feedback?.overallTip || "Great practice session!",
        });
      }
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSend = (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim() || sendMutation.isPending) return;
    sendMutation.mutate(text.trim());
  };

  const cleanupRecording = () => {
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
  };

  const checkAudioLevel = () => {
    if (!analyserRef.current || !isRecording) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);
    setAudioLevel(normalizedLevel);

    if (normalizedLevel > 0.05) {
      lastSoundTimeRef.current = Date.now();
    }

    const timeSinceSound = Date.now() - lastSoundTimeRef.current;
    if (timeSinceSound > silenceThreshold) {
      stopRecording();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
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

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanupRecording();
        
        if (audioChunksRef.current.length > 0) {
          setIsTranscribing(true);
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = (reader.result as string).split(',')[1];
            try {
              const res = await apiRequest("POST", "/api/transcribe", { audioBase64: base64 });
              const data = await res.json();
              if (data.text) {
                setInput(data.text);
                handleSend(data.text);
              }
            } catch {
              toast({
                title: "Transcription failed",
                description: "Please try again or type your response.",
                variant: "destructive",
              });
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      checkAudioLevel();
    } catch {
      toast({
        title: "Microphone access required",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };
  
  if (isCustomScenario && loadingCustom) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const scenario = regularScenario;
  const hasValidScenario = regularScenario || customScenarioData;
  
  if (!hasValidScenario) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard variant="dark" className="text-center p-8">
          <p className="text-muted-foreground mb-4">Scenario not found</p>
          <Link to="/scenarios">
            <Button>Back to Scenarios</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const scenarioTitle = isCustomScenario && customScenarioData 
    ? customScenarioData.title 
    : scenario?.title || "";
  const scenarioContext = isCustomScenario && customScenarioData 
    ? customScenarioData.context 
    : scenario?.context || "";
  const currentPhase = scenario?.phases?.[state.currentPhase];
  const progress = scenario?.phases 
    ? ((state.currentPhase + 1) / scenario.phases.length) * 100 
    : (state.messages.length > 0 ? 50 : 0);
  const tips = isCustomScenario && customScenarioData?.tips 
    ? customScenarioData.tips 
    : currentPhase?.tips || [];

  // Completed view
  if (state.completed && state.feedback) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center text-center py-8"
        >
          <UserAvatar size="xl" className="mb-6" />
          <Trophy className="w-12 h-12 text-amber-500 mb-4" />
          <h1 className="text-2xl font-bold mb-2">Scenario Complete!</h1>
          {state.score && (
            <Badge className="text-lg py-2 px-4 mb-4">
              Score: {state.score}/100
            </Badge>
          )}
        </motion.div>

        <GlassCard variant="glow">
          <h3 className="font-semibold mb-3 text-emerald-500">Strengths</h3>
          <ul className="space-y-2 mb-4">
            {state.feedback.strengths.map((s, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <Star className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                {s}
              </li>
            ))}
          </ul>
          
          <h3 className="font-semibold mb-3 text-amber-500">Areas for Growth</h3>
          <ul className="space-y-2 mb-4">
            {state.feedback.improvements.map((i, idx) => (
              <li key={idx} className="text-sm flex items-start gap-2">
                <Target className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                {i}
              </li>
            ))}
          </ul>
          
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <p className="text-sm flex items-start gap-2">
              <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              {state.feedback.overallTip}
            </p>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <Link to="/scenarios" className="flex-1">
            <Button variant="outline" className="w-full">
              More Scenarios
            </Button>
          </Link>
          <Link to="/" className="flex-1">
            <Button className="w-full">Done</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Real-time Coaching Overlay */}
      {!state.completed && (
        <CoachingOverlay
          messages={state.messages}
          isMinimized={coachingMinimized}
          onToggleMinimize={() => setCoachingMinimized(!coachingMinimized)}
        />
      )}

      {/* Header */}
      <motion.header 
        className="glass-dark border-b border-white/5 p-4 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Link to={isCustomScenario ? "/scenarios/builder" : "/scenarios"}>
            <Button variant="ghost" size="icon">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="font-semibold">{scenarioTitle}</h1>
            <p className="text-xs text-muted-foreground">
              {currentPhase ? `Phase ${state.currentPhase + 1}: ${currentPhase.name}` : (isCustomScenario ? "Custom Scenario" : "")}
            </p>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </motion.header>

      {/* Phase Objective / Custom Scenario Context */}
      {state.messages.length === 0 && (
        <motion.div 
          className="p-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard variant="glow">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              {isCustomScenario && customScenarioData 
                ? "Scenario Context" 
                : currentPhase 
                  ? `Objective: ${currentPhase.objective}` 
                  : "Scenario Context"}
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              {scenarioContext}
            </p>
            {isCustomScenario && customScenarioData?.prompt && (
              <div className="p-3 rounded-lg bg-muted mb-3">
                <p className="text-sm font-medium mb-1">Opening:</p>
                <p className="text-sm text-muted-foreground">{customScenarioData.prompt}</p>
              </div>
            )}
            {tips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tips.map((tip, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tip}
                  </Badge>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        <AnimatePresence>
          {state.messages.map((message, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3",
                message.role === "user" 
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "glass-dark rounded-bl-md"
              )}>
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              </div>
            </motion.div>
          ))}
          
          {sendMutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="glass-dark rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-muted-foreground">Responding...</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Voice-First Input */}
      <motion.div 
        className="glass-dark border-t border-white/5 p-4 shrink-0"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-2xl mx-auto space-y-3">
          {/* Primary Voice Input */}
          {!showTextInput && (
            <div className="flex flex-col items-center gap-3">
              {isRecording ? (
                <VoiceWaveform 
                  audioLevel={audioLevel}
                  isListening={true}
                  silencePhase="active"
                />
              ) : isTranscribing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Transcribing...</p>
                </div>
              ) : (
                <motion.button
                  onClick={startRecording}
                  disabled={sendMutation.isPending}
                  className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                    "bg-primary/20 hover:bg-primary/30",
                    sendMutation.isPending && "opacity-50 cursor-not-allowed"
                  )}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  data-testid="button-voice-rehearsal"
                >
                  <Mic className="w-7 h-7 text-primary" />
                </motion.button>
              )}

              {isRecording && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stopRecording}
                  className="gap-2"
                  data-testid="button-stop-rehearsal"
                >
                  <Square className="w-4 h-4" />
                  Done Speaking
                </Button>
              )}

              {!isRecording && !isTranscribing && (
                <>
                  <p className="text-sm text-muted-foreground">Tap to speak</p>
                  <button
                    onClick={() => setShowTextInput(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    data-testid="button-type-instead"
                  >
                    <Keyboard className="w-3 h-3 inline mr-1" />
                    or type instead
                  </button>
                </>
              )}
            </div>
          )}

          {/* Text Input - Secondary */}
          {showTextInput && (
            <div className="space-y-2">
              <button
                onClick={() => setShowTextInput(false)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-center"
              >
                <Mic className="w-3 h-3 inline mr-1" />
                Use voice instead
              </button>
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                  placeholder="Type your response..."
                  className="flex-1 bg-muted/50 border-0"
                  disabled={sendMutation.isPending}
                  data-testid="input-rehearsal"
                />
                <Button 
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sendMutation.isPending}
                  data-testid="button-send-rehearsal"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
