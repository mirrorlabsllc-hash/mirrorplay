import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  Mic,
  MicOff,
  Play,
  Pause,
  Calendar,
  Brain,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";
import { Link } from "wouter";
import { format } from "date-fns";
import type { VoiceJournal } from "@shared/schema";

interface JournalWithAnalysis extends Omit<VoiceJournal, 'emotionAnalysis'> {
  emotionAnalysis?: {
    primaryEmotion: string;
    emotions: { name: string; score: number }[];
    summary: string;
  } | null;
}

export default function VoiceJournalPage() {
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: entries = [], isLoading } = useQuery<JournalWithAnalysis[]>({
    queryKey: ["/api/journal/voice"],
  });

  const saveMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/journal/voice", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/journal/voice"] });
      setAudioBlob(null);
      toast({ title: "Journal entry saved!" });
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
    formData.append("audio", audioBlob, "journal.webm");
    saveMutation.mutate(formData);
  };

  const handlePlay = (entry: JournalWithAnalysis) => {
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

  const getEmotionColor = (emotion: string) => {
    const colors: Record<string, string> = {
      happy: "bg-yellow-500/20 text-yellow-300",
      calm: "bg-blue-500/20 text-blue-300",
      anxious: "bg-orange-500/20 text-orange-300",
      sad: "bg-gray-500/20 text-gray-300",
      confident: "bg-purple-500/20 text-purple-300",
      grateful: "bg-green-500/20 text-green-300",
    };
    return colors[emotion.toLowerCase()] || "bg-muted text-muted-foreground";
  };

  const getTrendIcon = (entries: JournalWithAnalysis[]) => {
    if (entries.length < 2) return <Minus className="w-4 h-4" />;
    const recent = entries.slice(0, 3);
    const positiveCount = recent.filter(e => 
      ["happy", "calm", "confident", "grateful"].includes(
        e.emotionAnalysis?.primaryEmotion?.toLowerCase() || ""
      )
    ).length;
    if (positiveCount >= 2) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (positiveCount === 0) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-muted-foreground" />;
  };

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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Voice Journal</h1>
            <p className="text-sm text-muted-foreground">
              Record daily reflections
            </p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            {getTrendIcon(entries)}
            <span>{entries.length} entries</span>
          </div>
        </div>

        {/* Recording Section */}
        <GlassCard className="p-6 mb-6">
          <div className="text-center">
            {!audioBlob ? (
              <>
                <Button
                  size="lg"
                  variant={isRecording ? "destructive" : "default"}
                  className="w-20 h-20 rounded-full"
                  onClick={isRecording ? stopRecording : startRecording}
                  data-testid="button-record"
                >
                  {isRecording ? (
                    <MicOff className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </Button>
                <p className="mt-3 text-muted-foreground">
                  {isRecording ? "Recording... Tap to stop" : "Tap to start recording"}
                </p>
                {isRecording && (
                  <div className="flex justify-center gap-1 mt-2">
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
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
                    Discard
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    data-testid="button-save"
                  >
                    {saveMutation.isPending ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Brain className="w-4 h-4 mr-2" /> Save & Analyze</>
                    )}
                  </Button>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  Audio recorded. Save to get AI emotion analysis.
                </p>
              </>
            )}
          </div>
        </GlassCard>

        {/* Past Entries */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Past Entries
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Mic className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-entries">
                No journal entries yet. Record your first reflection!
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
                      data-testid={`button-play-${entry.id}`}
                    >
                      {playingId === entry.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium">
                          {format(new Date(entry.journalDate || entry.createdAt!), "MMM d, yyyy")}
                        </span>
                        {entry.emotionAnalysis?.primaryEmotion && (
                          <Badge className={getEmotionColor(entry.emotionAnalysis.primaryEmotion)}>
                            {entry.emotionAnalysis.primaryEmotion}
                          </Badge>
                        )}
                        {entry.duration && (
                          <span className="text-xs text-muted-foreground">
                            {Math.round(entry.duration / 60)}:{String(entry.duration % 60).padStart(2, "0")}
                          </span>
                        )}
                      </div>
                      {entry.transcription && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {entry.transcription}
                        </p>
                      )}
                      {entry.emotionAnalysis?.summary && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          {entry.emotionAnalysis.summary}
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
