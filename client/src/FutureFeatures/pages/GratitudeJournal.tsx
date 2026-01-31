import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  Mic,
  MicOff,
  Heart,
  Sparkles,
  Play,
  Pause,
  Calendar,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { GratitudeEntry } from "@shared/schema";

const GRATITUDE_PROMPTS = [
  "What made you smile today?",
  "Who are you grateful for right now?",
  "What's a small pleasure you enjoyed today?",
  "What challenge helped you grow recently?",
  "What about your body are you thankful for?",
  "What skill or ability are you grateful to have?",
  "What's something in nature that brought you peace?",
  "Who showed you kindness this week?",
];

export default function GratitudeJournal() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [currentPrompt] = useState(
    GRATITUDE_PROMPTS[Math.floor(Math.random() * GRATITUDE_PROMPTS.length)]
  );
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: entries = [], isLoading } = useQuery<GratitudeEntry[]>({
    queryKey: ["/api/journal/gratitude"],
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/journal/gratitude", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal/gratitude"] });
      setAudioBlob(null);
      toast({ title: "Gratitude entry saved!" });
    },
    onError: () => {
      toast({ title: "Failed to save entry", variant: "destructive" });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch {
      toast({ title: "Microphone access required", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSave = () => {
    if (!audioBlob) return;
    const formData = new FormData();
    formData.append("audio", audioBlob, "gratitude.webm");
    formData.append("prompt", currentPrompt);
    saveMutation.mutate(formData);
  };

  const handlePlay = (entry: GratitudeEntry) => {
    if (playingId === entry.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (entry.audioUrl) {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = new Audio(entry.audioUrl);
      audioRef.current.onended = () => setPlayingId(null);
      audioRef.current.play();
      setPlayingId(entry.id);
    }
  };

  const todayEntry = entries.find(e => {
    const entryDate = new Date(e.entryDate || e.createdAt!);
    const today = new Date();
    return entryDate.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-6">
          <Link href="/journey">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Gratitude</h1>
            <p className="text-sm text-muted-foreground">
              Daily gratitude practice
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-pink-400" />
            <span className="text-sm text-muted-foreground">{entries.length}</span>
          </div>
        </div>

        {/* Today's Prompt */}
        <GlassCard className="p-6 mb-6 relative overflow-visible">
          <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-yellow-400" />
          <p className="text-lg font-medium text-center mb-4">{currentPrompt}</p>

          <div className="text-center">
            {!audioBlob ? (
              <>
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="w-20 h-20 rounded-full"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!!todayEntry}
                  data-testid="button-record"
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                {todayEntry ? (
                  <p className="mt-3 text-sm text-green-400">
                    You've already recorded today's gratitude!
                  </p>
                ) : (
                  <p className="mt-3 text-muted-foreground">
                    {isRecording ? "Recording... Tap to stop" : "Tap to share your gratitude"}
                  </p>
                )}
                {isRecording && (
                  <div className="flex justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-pink-400 rounded-full"
                        animate={{ height: [8, 24, 8] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setAudioBlob(null)}
                    data-testid="button-discard"
                  >
                    Re-record
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    data-testid="button-save"
                  >
                    {saveMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                    ) : (
                      <><Heart className="w-4 h-4 mr-2" /> Save</>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </GlassCard>

        {/* Past Entries */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Gratitude History
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-entries">
                Start your gratitude practice today!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {entries.map((entry) => (
                <GlassCard key={entry.id} className="p-4" data-testid={`entry-${entry.id}`}>
                  <div className="flex items-start gap-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handlePlay(entry)}
                      disabled={!entry.audioUrl}
                      data-testid={`button-play-${entry.id}`}
                    >
                      {playingId === entry.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">
                          {format(new Date(entry.entryDate || entry.createdAt!), "MMM d, yyyy")}
                        </span>
                      </div>
                      {entry.prompt && (
                        <p className="text-xs text-muted-foreground/70 italic mb-1">
                          {entry.prompt}
                        </p>
                      )}
                      {entry.transcription && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.transcription}
                        </p>
                      )}
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
