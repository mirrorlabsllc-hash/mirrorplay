import { useState, useRef, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { MysticalOrb } from "@/components/MysticalOrb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Send, 
  Loader2, 
  ChevronLeft,
  Sparkles,
  RefreshCw,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Settings,
  Briefcase,
  Heart,
  TrendingUp,
  History,
  Mic,
  Square
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
  audioBase64?: string;
}

interface Conversation {
  id: string;
  messages: Message[];
  emotionState: string;
}

interface Voice {
  id: string;
  name: string;
  description: string;
}

interface VoicesResponse {
  voices: Voice[];
  ttsAvailable: boolean;
}

interface UserVoiceSettings {
  preferences: {
    selectedVoiceId: string;
    ttsEnabled: boolean;
  };
  ttsAvailable: boolean;
}

interface GreetingContext {
  isNewUser: boolean;
  level: number;
  currentStreak: number;
  topCategories: string[];
  recentBadges: string[];
  hasRecentSessions: boolean;
  lastSessionCategory?: string;
}

interface GreetingResponse {
  greeting: string;
  audio: string | null;
  conversationId: string;
  context: GreetingContext;
  ttsAvailable: boolean;
}

// Quick-start prompts organized by category
const QUICK_START_CATEGORIES = {
  workplace: {
    icon: Briefcase,
    label: "Workplace",
    prompts: [
      "I'm feeling stressed about work deadlines",
      "Help me prepare for a difficult conversation with my boss",
      "I need to give feedback to a coworker",
    ],
  },
  relationships: {
    icon: Heart,
    label: "Relationships",
    prompts: [
      "I'm having trouble communicating with my partner",
      "Help me set boundaries with a family member",
      "I want to reconnect with an old friend",
    ],
  },
  personal: {
    icon: TrendingUp,
    label: "Personal Growth",
    prompts: [
      "I want to practice expressing my feelings",
      "Help me build more confidence",
      "I'm working on managing my anxiety",
    ],
  },
};

export default function Chat() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("21m00Tcm4TlvDq8ikWAM");
  const [messageAudios, setMessageAudios] = useState<Record<number, string>>({});
  const [greetingContext, setGreetingContext] = useState<GreetingContext | null>(null);
  const [greetingFetched, setGreetingFetched] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const ttsEnabledRef = useRef(ttsEnabled);
  const ttsAvailableRef = useRef(false);
  const selectedVoiceIdRef = useRef(selectedVoiceId);

  const { data: conversation, isLoading: conversationLoading } = useQuery<Conversation>({
    queryKey: ["/api/chat/conversation"],
  });

  const { data: voicesData } = useQuery<VoicesResponse>({
    queryKey: ["/api/voices"],
  });

  const { data: userVoiceSettings } = useQuery<UserVoiceSettings>({
    queryKey: ["/api/voices/user"],
  });

  useEffect(() => {
    if (userVoiceSettings?.preferences) {
      setTtsEnabled(userVoiceSettings.preferences.ttsEnabled);
      setSelectedVoiceId(userVoiceSettings.preferences.selectedVoiceId);
    }
  }, [userVoiceSettings]);

  const ttsAvailable = voicesData?.ttsAvailable || false;
  const voices = voicesData?.voices || [];

  // Keep refs in sync with state
  useEffect(() => {
    ttsEnabledRef.current = ttsEnabled;
  }, [ttsEnabled]);
  
  useEffect(() => {
    ttsAvailableRef.current = ttsAvailable;
  }, [ttsAvailable]);
  
  useEffect(() => {
    selectedVoiceIdRef.current = selectedVoiceId;
  }, [selectedVoiceId]);

  // Cleanup audio on unmount to prevent memory leaks and overlapping audio
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  const sendMutation = useMutation({
    mutationFn: async (message: string) => {
      // Use refs to get current values (avoids closure issues)
      const useTts = ttsEnabledRef.current && ttsAvailableRef.current;
      const voiceId = selectedVoiceIdRef.current;
      
      console.log("Sending message, ttsEnabled:", ttsEnabledRef.current, "ttsAvailable:", ttsAvailableRef.current, "voiceId:", voiceId);
      if (useTts) {
        console.log("Using audio endpoint");
        const res = await apiRequest("POST", "/api/chat/message/audio", { 
          message,
          voiceId
        });
        const data = await res.json();
        console.log("Audio response:", { hasAudio: !!data.audio, audioLength: data.audio?.length });
        return data;
      } else {
        console.log("Using text-only endpoint");
        const res = await apiRequest("POST", "/api/chat/message", { message });
        return res.json();
      }
    },
    onSuccess: async (data) => {
      setInput("");
      console.log("Message sent success, audio present:", !!data.audio, "ttsEnabled ref:", ttsEnabledRef.current);
      
      if (data.audio && ttsEnabledRef.current) {
        // Store audio immediately before invalidating query
        const currentLength = (conversation?.messages?.length || 0);
        const assistantMessageIndex = currentLength + 1; // +1 because user message is at currentLength, assistant at currentLength+1
        console.log("Storing and playing audio for index:", assistantMessageIndex);
        setMessageAudios(prev => ({ ...prev, [assistantMessageIndex]: data.audio }));
        playAudio(data.audio, assistantMessageIndex);
      }
      
      // Invalidate after storing audio so we have the data ready
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/conversation"] });
    },
    onError: () => {
      toast({
        title: "Failed to send message",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/chat/reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat/conversation"] });
      setMessageAudios({});
      setGreetingFetched(false);
      setGreetingContext(null);
      toast({
        title: "Conversation reset",
        description: "Started a fresh conversation",
      });
    },
  });

  const saveVoicePrefsMutation = useMutation({
    mutationFn: async (data: { voiceId: string; ttsEnabled: boolean }) => {
      const res = await apiRequest("POST", "/api/voices/select", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices/user"] });
    },
  });

  // Greeting mutation for personalized welcome
  const greetingMutation = useMutation({
    mutationFn: async (options: { includeTts: boolean; voiceId?: string }) => {
      const res = await apiRequest("POST", "/api/chat/greeting", options);
      return res.json() as Promise<GreetingResponse>;
    },
    onSuccess: async (data) => {
      setGreetingFetched(true);
      setGreetingContext(data.context);
      
      // Play greeting audio if available and TTS is enabled
      if (data.audio && ttsEnabledRef.current) {
        setMessageAudios({ 0: data.audio });
        playAudio(data.audio, 0);
      }
      
      // Refresh conversation to include the greeting message
      await queryClient.invalidateQueries({ queryKey: ["/api/chat/conversation"] });
    },
    onError: () => {
      setGreetingFetched(true); // Mark as fetched even on error to prevent retries
    },
  });

  // Fetch personalized greeting on mount if conversation is empty
  useEffect(() => {
    if (
      !conversationLoading &&
      conversation &&
      conversation.messages.length === 0 &&
      !greetingFetched &&
      !greetingMutation.isPending
    ) {
      const shouldUseTts = ttsEnabledRef.current && ttsAvailableRef.current;
      greetingMutation.mutate({
        includeTts: shouldUseTts,
        voiceId: selectedVoiceIdRef.current,
      });
    }
  }, [conversationLoading, conversation, greetingFetched, greetingMutation.isPending]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  const playAudio = (audioBase64: string, messageIndex: number) => {
    console.log("Playing audio for message", messageIndex, "audio length:", audioBase64?.length);
    
    // Stop and clean up any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audioRef.current = audio;
    
    audio.onplay = () => {
      console.log("Audio started playing");
      setPlayingAudio(String(messageIndex));
    };
    audio.onended = () => {
      console.log("Audio ended");
      setPlayingAudio(null);
      audioRef.current = null;
    };
    audio.onpause = () => setPlayingAudio(null);
    audio.onerror = (e) => console.error("Audio error:", e);
    
    audio.play().catch((e) => console.error("Audio play error:", e));
  };

  const toggleAudio = (messageIndex: number) => {
    const audioBase64 = messageAudios[messageIndex];
    if (!audioBase64) return;

    if (playingAudio === String(messageIndex) && audioRef.current) {
      audioRef.current.pause();
      setPlayingAudio(null);
    } else {
      playAudio(audioBase64, messageIndex);
    }
  };

  const handleSend = () => {
    if (!input.trim() || sendMutation.isPending) return;
    sendMutation.mutate(input.trim());
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
        
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
              }
            } catch {
              toast({
                title: "Transcription failed",
                description: "Could not convert your speech to text. Please try again.",
                variant: "destructive",
              });
            } finally {
              setIsTranscribing(false);
            }
          };
          reader.readAsDataURL(audioBlob);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
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

  const handleToggleTts = () => {
    const newValue = !ttsEnabled;
    setTtsEnabled(newValue);
    saveVoicePrefsMutation.mutate({ voiceId: selectedVoiceId, ttsEnabled: newValue });
  };

  const handleVoiceChange = (voiceId: string) => {
    setSelectedVoiceId(voiceId);
    saveVoicePrefsMutation.mutate({ voiceId, ttsEnabled });
  };

  const messages = conversation?.messages || [];

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <motion.header 
        className="glass-dark border-b border-white/5 p-4 flex items-center gap-4 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        
        <div className="flex items-center gap-3 flex-1">
          <MysticalOrb 
            size="sm" 
            isActive={sendMutation.isPending}
            isSpeaking={playingAudio !== null}
          />
          <div>
            <h1 className="font-semibold">Mirror AI</h1>
            <p className="text-xs text-muted-foreground">
              Your emotional intelligence companion
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {/* History Link */}
          <Link href="/chat/history">
            <Button 
              variant="ghost" 
              size="icon"
              data-testid="button-chat-history"
            >
              <History className="w-4 h-4" />
            </Button>
          </Link>

          {/* Voice Settings Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                data-testid="button-voice-settings"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">Voice Responses</span>
                  <Button
                    variant={ttsEnabled && ttsAvailable ? "default" : "outline"}
                    size="sm"
                    onClick={handleToggleTts}
                    disabled={!ttsAvailable}
                    data-testid="button-toggle-tts"
                  >
                    {ttsEnabled && ttsAvailable ? (
                      <><Volume2 className="w-3 h-3 mr-1" /> On</>
                    ) : (
                      <><VolumeX className="w-3 h-3 mr-1" /> Off</>
                    )}
                  </Button>
                </div>
                
                {!ttsAvailable && (
                  <p className="text-xs text-muted-foreground">
                    TTS unavailable - API key required
                  </p>
                )}
                
                {ttsAvailable && (
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Voice</label>
                    <Select
                      value={selectedVoiceId}
                      onValueChange={handleVoiceChange}
                    >
                      <SelectTrigger data-testid="select-voice">
                        <SelectValue placeholder="Select a voice" />
                      </SelectTrigger>
                      <SelectContent>
                        {voices.map((voice) => (
                          <SelectItem key={voice.id} value={voice.id}>
                            {voice.name} - {voice.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* TTS Toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleToggleTts}
            disabled={!ttsAvailable}
            className={cn(
              ttsEnabled && ttsAvailable && "text-primary"
            )}
            data-testid="button-tts-toggle"
          >
            {ttsEnabled && ttsAvailable ? (
              <Volume2 className="w-4 h-4" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </Button>

          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => resetMutation.mutate()}
            disabled={resetMutation.isPending}
            data-testid="button-reset"
          >
            <RefreshCw className={cn(
              "w-4 h-4",
              resetMutation.isPending && "animate-spin"
            )} />
          </Button>
        </div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {conversationLoading || greetingMutation.isPending ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {greetingMutation.isPending ? "Preparing your greeting..." : "Loading..."}
              </span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <motion.div 
            className="flex flex-col items-center justify-center h-full text-center px-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <MysticalOrb size="xl" isActive={true} className="mb-8" />
            <h2 className="text-xl font-semibold mb-2">Welcome!</h2>
            <p className="text-muted-foreground mb-6">
              I'm here to help you navigate emotions and improve your communication skills.
            </p>
            {ttsAvailable && ttsEnabled && (
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1">
                <Volume2 className="w-3 h-3" />
                Voice responses enabled
              </p>
            )}
            
            {/* Continue where I left off - only if they have recent sessions */}
            {greetingContext?.hasRecentSessions && greetingContext?.lastSessionCategory && (
              <div className="w-full max-w-md mb-6">
                <Button
                  variant="default"
                  className="w-full text-left justify-start h-auto py-3 px-4"
                  onClick={() => {
                    const category = greetingContext.lastSessionCategory;
                    setInput(`Let's continue working on ${category} communication`);
                  }}
                  data-testid="button-continue-session"
                >
                  <History className="w-4 h-4 mr-2 shrink-0" />
                  <span>Continue where I left off ({greetingContext.lastSessionCategory})</span>
                </Button>
              </div>
            )}

            {/* Categorized Quick-Start Buttons */}
            <div className="w-full max-w-md space-y-4">
              {Object.entries(QUICK_START_CATEGORIES).map(([key, category]) => {
                const IconComponent = category.icon;
                // Prioritize categories user practices most
                const isPrioritized = greetingContext?.topCategories?.some(
                  tc => key.toLowerCase().includes(tc.toLowerCase()) || tc.toLowerCase().includes(key.toLowerCase())
                );
                
                return (
                  <div key={key} className={cn("space-y-2", isPrioritized && "order-first")}>
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <IconComponent className="w-4 h-4" />
                      <span>{category.label}</span>
                      {isPrioritized && (
                        <span className="text-xs text-primary ml-1">(recommended)</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {category.prompts.slice(0, 2).map((prompt) => (
                        <Button
                          key={prompt}
                          variant="outline"
                          className="text-left justify-start h-auto py-2.5 px-3 text-sm"
                          onClick={() => {
                            setInput(prompt);
                          }}
                          data-testid={`button-prompt-${prompt.slice(0, 20)}`}
                        >
                          <Sparkles className="w-3 h-3 mr-2 shrink-0 text-primary" />
                          <span className="line-clamp-1">{prompt}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
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
                  
                  {/* Audio playback button for assistant messages */}
                  {message.role === "assistant" && messageAudios[index] && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2 h-7 px-2"
                      onClick={() => toggleAudio(index)}
                      data-testid={`button-play-audio-${index}`}
                    >
                      {playingAudio === String(index) ? (
                        <><Pause className="w-3 h-3 mr-1" /> Pause</>
                      ) : (
                        <><Play className="w-3 h-3 mr-1" /> Play</>
                      )}
                    </Button>
                  )}
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
                    <span className="text-sm text-muted-foreground">
                      {ttsEnabled && ttsAvailable ? "Thinking & generating voice..." : "Thinking..."}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
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
          <div className="flex items-center justify-center gap-4">
            <motion.button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={sendMutation.isPending || isTranscribing}
              className={cn(
                "w-16 h-16 rounded-full flex items-center justify-center transition-all",
                isRecording 
                  ? "bg-red-500/20 hover:bg-red-500/30" 
                  : "bg-primary/20 hover:bg-primary/30",
                (sendMutation.isPending || isTranscribing) && "opacity-50 cursor-not-allowed"
              )}
              animate={isRecording ? { 
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(239, 68, 68, 0.4)',
                  '0 0 0 15px rgba(239, 68, 68, 0)',
                  '0 0 0 0 rgba(239, 68, 68, 0)'
                ]
              } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
              data-testid="button-voice-primary"
            >
              {isTranscribing ? (
                <Loader2 className="w-7 h-7 animate-spin text-primary" />
              ) : isRecording ? (
                <Square className="w-7 h-7 text-red-500" />
              ) : (
                <Mic className="w-7 h-7 text-primary" />
              )}
            </motion.button>
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            {isRecording ? "Listening... tap to stop" : isTranscribing ? "Transcribing..." : "Tap to speak"}
          </p>

          {/* Text Input - Secondary/Collapsed */}
          {input.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Your message..."
                className="flex-1 bg-muted/50 border-0"
                disabled={sendMutation.isPending || isRecording || isTranscribing}
                data-testid="input-chat"
              />
              <Button 
                onClick={handleSend}
                disabled={!input.trim() || sendMutation.isPending || isRecording || isTranscribing}
                data-testid="button-send"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </motion.div>
          )}

          {/* Type instead toggle - only shows when no text */}
          {!input.trim() && !isRecording && !isTranscribing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <button
                onClick={() => {
                  const inputEl = document.querySelector('[data-testid="input-chat-hidden"]') as HTMLInputElement;
                  if (inputEl) inputEl.focus();
                  setInput(" ");
                  setTimeout(() => setInput(""), 10);
                }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-type-instead"
              >
                or type instead
              </button>
            </motion.div>
          )}
          
          {/* Hidden input that appears when "type instead" is clicked */}
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Type your message..."
            className={cn(
              "bg-muted/50 border-0",
              !input.trim() && !isRecording && "sr-only"
            )}
            disabled={sendMutation.isPending || isRecording || isTranscribing}
            data-testid="input-chat-hidden"
          />
        </div>
      </motion.div>
    </div>
  );
}
