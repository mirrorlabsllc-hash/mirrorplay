import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Mic, 
  MicOff, 
  Check, 
  Loader2, 
  Volume2,
  Trash2,
  RefreshCw
} from "lucide-react";

const SAMPLE_PROMPTS = [
  "The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet.",
  "I believe that communication is the foundation of all meaningful relationships. When we truly listen, we create space for understanding.",
  "Today I am choosing to focus on what I can control. I release what I cannot change and embrace the present moment.",
];

const RECORDING_TIME = 30;

export function VoiceSetup({ onComplete }: { onComplete?: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: voiceStatus, isLoading } = useQuery<{
    hasVoiceClone: boolean;
    voiceClone: { id: string; name: string; status: string } | null;
    elevenlabsConfigured: boolean;
  }>({
    queryKey: ["/api/voice/status"],
  });

  const createCloneMutation = useMutation({
    mutationFn: async (audioData: string) => {
      return apiRequest("POST", "/api/voice/clone", { audioData });
    },
    onSuccess: () => {
      toast({
        title: "Voice Created!",
        description: "Your voice clone is ready. Mirror will now speak in your voice.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voice/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      onComplete?.();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create voice clone",
        variant: "destructive",
      });
      setIsProcessing(false);
    },
  });

  const deleteCloneMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", "/api/voice/clone"),
    onSuccess: () => {
      toast({
        title: "Voice Deleted",
        description: "Your voice clone has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/voice/status"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete voice clone",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= RECORDING_TIME) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      toast({
        title: "Microphone Error",
        description: "Please allow microphone access to record your voice.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(",")[1];
        createCloneMutation.mutate(base64);
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setAudioBlob(null);
    setRecordingTime(0);
    setCurrentPromptIndex((prev) => (prev + 1) % SAMPLE_PROMPTS.length);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </CardContent>
      </Card>
    );
  }

  if (!voiceStatus?.elevenlabsConfigured) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6 text-center">
          <MicOff className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Voice Cloning Unavailable</h3>
          <p className="text-slate-400 text-sm">
            Voice cloning requires an ElevenLabs API key. Please add it to use this feature.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (voiceStatus?.hasVoiceClone) {
    return (
      <Card className="bg-slate-900/50 border-slate-800">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-500/20">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Voice Clone Active</h3>
              <p className="text-sm text-slate-400">
                Mirror speaks in your voice: {voiceStatus.voiceClone?.name}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteCloneMutation.mutate()}
              disabled={deleteCloneMutation.isPending}
              className="text-red-400 hover:text-red-300"
              data-testid="button-delete-voice"
            >
              {deleteCloneMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900/50 border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-blue-400" />
          Create Your Voice Clone
        </CardTitle>
        <CardDescription>
          Record 30 seconds of speech so Mirror can speak in your voice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <p className="text-sm text-slate-300 italic leading-relaxed">
            "{SAMPLE_PROMPTS[currentPromptIndex]}"
          </p>
        </div>

        <div className="text-center">
          <AnimatePresence mode="wait">
            {!audioBlob ? (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {isRecording ? (
                  <div className="space-y-4">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                      className="w-20 h-20 mx-auto rounded-full bg-red-500/20 flex items-center justify-center"
                    >
                      <Mic className="w-8 h-8 text-red-400" />
                    </motion.div>
                    <div>
                      <p className="text-white font-medium">{recordingTime}s / {RECORDING_TIME}s</p>
                      <Progress value={(recordingTime / RECORDING_TIME) * 100} className="mt-2" />
                    </div>
                    <Button variant="outline" onClick={stopRecording} data-testid="button-stop-recording">
                      Stop Recording
                    </Button>
                  </div>
                ) : (
                  <Button onClick={startRecording} size="lg" className="gap-2" data-testid="button-start-recording">
                    <Mic className="w-5 h-5" />
                    Start Recording
                  </Button>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-3 justify-center">
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                    <span className="text-emerald-400">Recording complete ({recordingTime}s)</span>
                  </div>
                </div>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={handleRetry} className="gap-2" data-testid="button-rerecord">
                    <RefreshCw className="w-4 h-4" />
                    Re-record
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isProcessing || createCloneMutation.isPending}
                    className="gap-2"
                    data-testid="button-create-voice"
                  >
                    {isProcessing || createCloneMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Create Voice Clone
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}
