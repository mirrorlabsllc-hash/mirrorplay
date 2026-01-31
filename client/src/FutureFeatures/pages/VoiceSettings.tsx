import { useState, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  ChevronLeft, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  Check,
  AlertCircle,
  Loader2,
  Mic,
  MicOff,
  Upload,
  Trash2,
  Wand2,
  X,
  CheckCircle2,
  Lock
} from "lucide-react";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Voice {
  id: string;
  name: string;
  description: string;
}

interface VoicesResponse {
  voices: Voice[];
  ttsAvailable: boolean;
}

interface VoiceClone {
  id: string;
  name: string | null;
  description: string | null;
  status: string | null;
  sampleCount: number | null;
  elevenLabsVoiceId: string | null;
  isDefault: boolean | null;
  errorMessage: string | null;
}

interface UserVoiceSettings {
  preferences: {
    selectedVoiceId: string;
    ttsEnabled: boolean;
  };
  voiceClones: VoiceClone[];
  ttsAvailable: boolean;
}

interface AudioSample {
  id: string;
  audioBase64: string;
  filename: string;
  duration: number;
}

interface UsageData {
  tier: 'free' | 'peace_plus' | 'pro_mind';
  dailyLimit: number | 'unlimited';
  usedToday: number;
  remainingToday: number;
  allowed: boolean;
}

export default function VoiceSettings() {
  const { toast } = useToast();
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Voice cloning state
  const [showCloneUI, setShowCloneUI] = useState(false);
  const [cloneName, setCloneName] = useState("");
  const [audioSamples, setAudioSamples] = useState<AudioSample[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentCloneId, setCurrentCloneId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { data: usageData } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });
  
  const isProMind = usageData?.tier === "pro_mind";

  const { data: voicesData, isLoading: voicesLoading } = useQuery<VoicesResponse>({
    queryKey: ["/api/voices"],
  });

  const { data: userSettings, isLoading: settingsLoading } = useQuery<UserVoiceSettings>({
    queryKey: ["/api/voices/user"],
  });

  const saveVoiceMutation = useMutation({
    mutationFn: async (data: { voiceId: string; ttsEnabled: boolean }) => {
      const res = await apiRequest("POST", "/api/voices/select", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices/user"] });
      toast({
        title: "Voice saved",
        description: "Your voice preference has been updated",
      });
    },
    onError: () => {
      toast({
        title: "Failed to save",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  // Voice clone mutations
  const startCloneMutation = useMutation({
    mutationFn: async (data: { name: string; description?: string }) => {
      const res = await apiRequest("POST", "/api/voice-clone/start", data);
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentCloneId(data.voiceClone.id);
      toast({
        title: "Voice clone started",
        description: "Add audio samples to create your voice",
      });
    },
    onError: () => {
      toast({
        title: "Failed to start cloning",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const finalizeCloneMutation = useMutation({
    mutationFn: async (data: { voiceCloneId: string; samples: AudioSample[] }) => {
      const res = await apiRequest("POST", "/api/voice-clone/finalize", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices/user"] });
      setShowCloneUI(false);
      setAudioSamples([]);
      setCloneName("");
      setCurrentCloneId(null);
      toast({
        title: "Voice clone created!",
        description: "Your custom voice is now ready to use",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create voice clone",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const useCloneMutation = useMutation({
    mutationFn: async (voiceCloneId: string) => {
      const res = await apiRequest("POST", "/api/voice-clone/use", { voiceCloneId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices/user"] });
      toast({
        title: "Voice activated",
        description: "Now using your cloned voice for responses",
      });
    },
    onError: () => {
      toast({
        title: "Failed to activate voice",
        variant: "destructive",
      });
    },
  });

  const deleteCloneMutation = useMutation({
    mutationFn: async (voiceCloneId: string) => {
      const res = await apiRequest("DELETE", `/api/voice-clone/${voiceCloneId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/voices/user"] });
      toast({
        title: "Voice clone deleted",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete",
        variant: "destructive",
      });
    },
  });

  const ttsAvailable = voicesData?.ttsAvailable || false;
  const voices = voicesData?.voices || [];
  const voiceClones = userSettings?.voiceClones || [];
  const selectedVoiceId = userSettings?.preferences?.selectedVoiceId || "21m00Tcm4TlvDq8ikWAM";
  const ttsEnabled = userSettings?.preferences?.ttsEnabled ?? true;

  // Recording functions
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      recordingChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordingChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(recordingChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          const newSample: AudioSample = {
            id: `sample-${Date.now()}`,
            audioBase64: base64,
            filename: `recording_${audioSamples.length + 1}.webm`,
            duration: recordingTime,
          };
          setAudioSamples(prev => [...prev, newSample]);
        };
        reader.readAsDataURL(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to record",
        variant: "destructive",
      });
    }
  }, [audioSamples.length, recordingTime, toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const newSample: AudioSample = {
          id: `sample-${Date.now()}-${file.name}`,
          audioBase64: base64,
          filename: file.name,
          duration: 0,
        };
        setAudioSamples(prev => [...prev, newSample]);
      };
      reader.readAsDataURL(file);
    });
    
    event.target.value = '';
  }, []);

  const removeSample = useCallback((sampleId: string) => {
    setAudioSamples(prev => prev.filter(s => s.id !== sampleId));
  }, []);

  const handleCreateClone = async () => {
    if (!cloneName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a name for your voice clone",
        variant: "destructive",
      });
      return;
    }

    if (audioSamples.length === 0) {
      toast({
        title: "Samples required",
        description: "Please record or upload at least one audio sample",
        variant: "destructive",
      });
      return;
    }

    // Start clone first if needed
    let cloneId = currentCloneId;
    if (!cloneId) {
      const result = await startCloneMutation.mutateAsync({ name: cloneName });
      cloneId = result.voiceClone.id;
    }

    if (cloneId) {
      finalizeCloneMutation.mutate({ voiceCloneId: cloneId, samples: audioSamples });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playSample = async (voiceId: string) => {
    if (!ttsAvailable) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (playingVoiceId === voiceId) {
      setPlayingVoiceId(null);
      return;
    }

    setLoadingSample(voiceId);
    
    try {
      const response = await fetch(`/api/voices/sample/${voiceId}`);
      if (!response.ok) throw new Error("Failed to fetch sample");
      
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      audio.onplay = () => {
        setPlayingVoiceId(voiceId);
        setLoadingSample(null);
      };
      audio.onended = () => {
        setPlayingVoiceId(null);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onpause = () => setPlayingVoiceId(null);
      audio.onerror = () => {
        setLoadingSample(null);
        toast({
          title: "Failed to play sample",
          variant: "destructive",
        });
      };
      
      await audio.play();
    } catch (error) {
      setLoadingSample(null);
      toast({
        title: "Failed to load sample",
        variant: "destructive",
      });
    }
  };

  const selectVoice = (voiceId: string) => {
    saveVoiceMutation.mutate({ voiceId, ttsEnabled });
  };

  const toggleTts = () => {
    saveVoiceMutation.mutate({ voiceId: selectedVoiceId, ttsEnabled: !ttsEnabled });
  };

  const isLoading = voicesLoading || settingsLoading;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      {/* Header */}
      <motion.div 
        className="flex items-center gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/profile">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Voice Settings</h1>
          <p className="text-sm text-muted-foreground">Configure AI voice responses</p>
        </div>
      </motion.div>

      {/* TTS Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                ttsAvailable ? "bg-emerald-500/20" : "bg-amber-500/20"
              )}>
                {ttsAvailable ? (
                  <Volume2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div>
                <p className="font-medium">Text-to-Speech</p>
                <p className="text-sm text-muted-foreground">
                  {ttsAvailable 
                    ? "TTS is available" 
                    : "ElevenLabs API key required"}
                </p>
              </div>
            </div>
            
            <Badge className={ttsAvailable ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}>
              {ttsAvailable ? "Available" : "Unavailable"}
            </Badge>
          </div>
        </GlassCard>
      </motion.div>

      {/* Voice Toggle */}
      {ttsAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard variant="dark">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  {ttsEnabled ? (
                    <Volume2 className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Voice Responses</p>
                  <p className="text-sm text-muted-foreground">
                    Enable audio for AI replies in chat
                  </p>
                </div>
              </div>
              
              <Button
                variant={ttsEnabled ? "default" : "outline"}
                size="sm"
                onClick={toggleTts}
                disabled={saveVoiceMutation.isPending}
                data-testid="button-toggle-voice"
              >
                {ttsEnabled ? "On" : "Off"}
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Voice Selection */}
      {ttsAvailable && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Available Voices</h2>
          </div>
          
          {isLoading ? (
            <GlassCard variant="dark">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-2">
              {voices.map((voice, index) => (
                <motion.div
                  key={voice.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + index * 0.05 }}
                >
                  <GlassCard 
                    variant={selectedVoiceId === voice.id ? "glow" : "dark"} 
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedVoiceId === voice.id && "ring-1 ring-primary/50"
                    )}
                    onClick={() => selectVoice(voice.id)}
                    data-testid={`voice-card-${voice.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{voice.name}</p>
                          {selectedVoiceId === voice.id && (
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Check className="w-3 h-3" />
                              Selected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{voice.description}</p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSample(voice.id);
                        }}
                        disabled={loadingSample === voice.id}
                        data-testid={`button-play-${voice.id}`}
                      >
                        {loadingSample === voice.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : playingVoiceId === voice.id ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Your Voice Clones - Pro Mind only */}
      {ttsAvailable && isProMind && voiceClones.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2">
            <Wand2 className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-semibold">Your Voice Clones</h2>
          </div>
          
          <div className="space-y-2">
            {voiceClones.map((clone, index) => (
              <motion.div
                key={clone.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <GlassCard 
                  variant={clone.isDefault ? "glow" : "dark"}
                  className={cn(
                    "transition-all",
                    clone.isDefault && "ring-1 ring-primary/50"
                  )}
                  data-testid={`voice-clone-card-${clone.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{clone.name || "My Voice"}</p>
                        <Badge 
                          variant="secondary"
                          className={cn(
                            clone.status === "completed" && "bg-emerald-500/20 text-emerald-400",
                            clone.status === "processing" && "bg-amber-500/20 text-amber-400",
                            clone.status === "failed" && "bg-red-500/20 text-red-400",
                            clone.status === "pending" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {clone.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                          {clone.status === "processing" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                          {clone.status}
                        </Badge>
                        {clone.isDefault && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Active
                          </Badge>
                        )}
                      </div>
                      {clone.description && (
                        <p className="text-sm text-muted-foreground">{clone.description}</p>
                      )}
                      {clone.errorMessage && (
                        <p className="text-sm text-red-400 mt-1">{clone.errorMessage}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {clone.status === "completed" && !clone.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => useCloneMutation.mutate(clone.id)}
                          disabled={useCloneMutation.isPending}
                          data-testid={`button-use-clone-${clone.id}`}
                        >
                          {useCloneMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            "Use"
                          )}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteCloneMutation.mutate(clone.id)}
                        disabled={deleteCloneMutation.isPending}
                        data-testid={`button-delete-clone-${clone.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Create Voice Clone Section - Pro Mind only */}
      {ttsAvailable && isProMind && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-semibold">Create Your Voice Clone</h2>
            </div>
            {!showCloneUI && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCloneUI(true)}
                data-testid="button-start-clone"
              >
                <Mic className="w-4 h-4 mr-2" />
                Create Clone
              </Button>
            )}
          </div>

          <AnimatePresence>
            {showCloneUI && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <GlassCard variant="dark" className="space-y-4">
                  {/* Clone Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Voice Name</label>
                    <Input
                      placeholder="My Custom Voice"
                      value={cloneName}
                      onChange={(e) => setCloneName(e.target.value)}
                      data-testid="input-clone-name"
                    />
                  </div>

                  {/* Recording Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <label className="text-sm font-medium">Audio Samples</label>
                      <span className="text-xs text-muted-foreground">
                        {audioSamples.length}/3 samples (min 1 required)
                      </span>
                    </div>

                    {/* Recording UI */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <Button
                        variant={isRecording ? "destructive" : "outline"}
                        onClick={isRecording ? stopRecording : startRecording}
                        disabled={audioSamples.length >= 3}
                        data-testid="button-record"
                      >
                        {isRecording ? (
                          <>
                            <MicOff className="w-4 h-4 mr-2" />
                            Stop ({formatTime(recordingTime)})
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4 mr-2" />
                            Record Sample
                          </>
                        )}
                      </Button>

                      <span className="text-muted-foreground">or</span>

                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept="audio/*"
                        multiple
                        onChange={handleFileUpload}
                        data-testid="input-file-upload"
                      />
                      <Button
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={audioSamples.length >= 3}
                        data-testid="button-upload"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                      </Button>
                    </div>

                    {/* Recording indicator */}
                    {isRecording && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center gap-2 text-red-400"
                      >
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-sm">Recording... Speak clearly for 30 seconds</span>
                      </motion.div>
                    )}

                    {/* Sample Progress */}
                    <div className="space-y-2">
                      <Progress value={(audioSamples.length / 3) * 100} className="h-2" />
                    </div>

                    {/* Samples List */}
                    {audioSamples.length > 0 && (
                      <div className="space-y-2">
                        {audioSamples.map((sample, index) => (
                          <motion.div
                            key={sample.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/50"
                            data-testid={`sample-item-${index}`}
                          >
                            <div className="flex items-center gap-2">
                              <Volume2 className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">{sample.filename}</span>
                              {sample.duration > 0 && (
                                <span className="text-xs text-muted-foreground">
                                  ({formatTime(sample.duration)})
                                </span>
                              )}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeSample(sample.id)}
                              data-testid={`button-remove-sample-${index}`}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {/* Tips */}
                    <div className="p-3 rounded-lg bg-muted/30 space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Tips for best results:</p>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">-</span>
                          Record in a quiet environment
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">-</span>
                          Speak clearly and naturally
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">-</span>
                          Each sample should be 30+ seconds
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowCloneUI(false);
                        setAudioSamples([]);
                        setCloneName("");
                        setCurrentCloneId(null);
                      }}
                      data-testid="button-cancel-clone"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateClone}
                      disabled={
                        !cloneName.trim() || 
                        audioSamples.length === 0 || 
                        startCloneMutation.isPending || 
                        finalizeCloneMutation.isPending
                      }
                      data-testid="button-create-clone"
                    >
                      {(startCloneMutation.isPending || finalizeCloneMutation.isPending) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4 mr-2" />
                          Create Voice Clone
                        </>
                      )}
                    </Button>
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Voice Cloning locked for non-Pro Mind users */}
      {ttsAvailable && !isProMind && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard variant="dark">
            <div className="text-center py-6">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-amber-500" />
              </div>
              <h3 className="font-medium mb-2">Voice Cloning</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-4">
                Create your own AI voice clone with Pro Mind. Practice conversations in your own voice.
              </p>
              <Link href="/subscribe">
                <Button variant="outline" size="sm" data-testid="button-upgrade-voice-cloning">
                  Continue with Pro Mind
                </Button>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Info when TTS unavailable */}
      {!ttsAvailable && !isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="dark">
            <div className="text-center py-6">
              <VolumeX className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="font-medium mb-2">Voice Features Unavailable</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Text-to-speech requires an ElevenLabs API key. Contact the administrator to enable this feature.
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
