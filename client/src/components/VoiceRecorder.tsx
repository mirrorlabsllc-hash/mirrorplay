import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/GlassCard";
import { 
  Mic, 
  Square, 
  Play, 
  Pause, 
  RotateCcw, 
  Send, 
  Loader2 
} from "lucide-react";

interface VoiceRecorderProps {
  onSubmit: (audioBase64: string, duration: number) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export function VoiceRecorder({ onSubmit, isSubmitting, disabled }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [audioUrl]);

  const requestMicrophonePermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasPermission(true);
      return stream;
    } catch {
      setHasPermission(false);
      return null;
    }
  };

  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      ''
    ];
    for (const type of types) {
      if (type === '' || MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = async () => {
    const stream = streamRef.current || await requestMicrophonePermission();
    if (!stream) return;

    audioChunksRef.current = [];
    
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

    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
      setAudioBlob(blob);
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    };

    mediaRecorder.start(100);
    setIsRecording(true);
    setIsPaused(false);
    setRecordingTime(0);
    
    timerRef.current = window.setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        timerRef.current = window.setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const resetRecording = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const handleSubmit = async () => {
    if (!audioBlob) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      onSubmit(base64, recordingTime);
    };
    reader.readAsDataURL(audioBlob);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (hasPermission === false) {
    return (
      <GlassCard variant="dark" className="text-center py-8">
        <Mic className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground mb-4">Microphone access is required for voice practice</p>
        <Button onClick={requestMicrophonePermission} data-testid="button-request-mic">
          Enable Microphone
        </Button>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-4">
      {audioUrl && (
        <audio 
          ref={audioRef} 
          src={audioUrl} 
          onEnded={handleAudioEnded}
          className="hidden"
        />
      )}

      <GlassCard variant="dark" className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          <AnimatePresence mode="wait">
            {!audioBlob ? (
              <motion.div 
                key="recording-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <motion.div
                  className={`w-20 h-20 rounded-full flex items-center justify-center ${
                    isRecording 
                      ? isPaused 
                        ? 'bg-amber-500/20' 
                        : 'bg-red-500/20' 
                      : 'bg-primary/20'
                  }`}
                  animate={isRecording && !isPaused ? { 
                    scale: [1, 1.1, 1],
                    boxShadow: [
                      '0 0 0 0 rgba(239, 68, 68, 0.4)',
                      '0 0 0 20px rgba(239, 68, 68, 0)',
                      '0 0 0 0 rgba(239, 68, 68, 0)'
                    ]
                  } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  <Mic className={`w-8 h-8 ${
                    isRecording 
                      ? isPaused 
                        ? 'text-amber-500' 
                        : 'text-red-500' 
                      : 'text-primary'
                  }`} />
                </motion.div>

                <div className="text-2xl font-mono font-bold" data-testid="text-recording-time">
                  {formatTime(recordingTime)}
                </div>

                <p className="text-sm text-muted-foreground">
                  {isRecording 
                    ? isPaused 
                      ? 'Recording paused' 
                      : 'Recording...' 
                    : 'Tap to start recording'}
                </p>

                <div className="flex gap-3">
                  {!isRecording ? (
                    <Button 
                      onClick={startRecording}
                      disabled={disabled}
                      className="gap-2"
                      data-testid="button-start-recording"
                    >
                      <Mic className="w-4 h-4" />
                      Start Recording
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={pauseRecording}
                        data-testid="button-pause-recording"
                      >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={stopRecording}
                        className="gap-2"
                        data-testid="button-stop-recording"
                      >
                        <Square className="w-4 h-4" />
                        Stop
                      </Button>
                    </>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="playback-controls"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 w-full"
              >
                <div className="w-20 h-20 rounded-full flex items-center justify-center bg-emerald-500/20">
                  <Play className="w-8 h-8 text-emerald-500" />
                </div>

                <div className="text-2xl font-mono font-bold">
                  {formatTime(recordingTime)}
                </div>

                <p className="text-sm text-muted-foreground">
                  Recording complete - Preview or submit
                </p>

                <div className="flex gap-3 flex-wrap justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlayback}
                    data-testid="button-playback"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={resetRecording}
                    className="gap-2"
                    disabled={isSubmitting}
                    data-testid="button-re-record"
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
                    Analyze
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </GlassCard>
    </div>
  );
}
