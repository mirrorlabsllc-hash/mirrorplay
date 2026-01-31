import { useState, useRef, useCallback, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";

interface VoiceCommand {
  keywords: string[];
  action: () => void;
}

interface UseVoiceAssistantOptions {
  autoSpeak?: string;
  autoSpeakDelay?: number;
  commands?: VoiceCommand[];
  onTranscript?: (text: string) => void;
  silenceThreshold?: number;
  enabled?: boolean;
}

interface VoiceAssistantState {
  isSpeaking: boolean;
  isListening: boolean;
  isTranscribing: boolean;
  transcript: string;
  error: string | null;
}

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/wav',
    ''
  ];
  
  for (const type of types) {
    if (type === '' || MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return '';
}

export function useVoiceAssistant(options: UseVoiceAssistantOptions = {}) {
  const {
    autoSpeak,
    autoSpeakDelay = 500,
    commands = [],
    onTranscript,
    silenceThreshold = 2000,
    enabled = true,
  } = options;

  const [state, setState] = useState<VoiceAssistantState>({
    isSpeaking: false,
    isListening: false,
    isTranscribing: false,
    transcript: "",
    error: null,
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const silenceTimerRef = useRef<number | null>(null);
  const lastSoundTimeRef = useRef<number>(Date.now());
  const animationFrameRef = useRef<number | null>(null);
  const hasAutoSpoken = useRef(false);

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
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (!text || !enabled) return;

    // Stop any existing audio before starting new audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }

    try {
      setState(prev => ({ ...prev, isSpeaking: true, error: null }));
      
      const res = await apiRequest("POST", "/api/tts", { text });
      const data = await res.json();
      
      if (data.audio) {
        const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
        audioRef.current = audio;
        
        return new Promise((resolve) => {
          audio.onended = () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            audioRef.current = null;
            resolve();
          };
          audio.onerror = () => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            audioRef.current = null;
            resolve();
          };
          audio.play().catch(() => {
            setState(prev => ({ ...prev, isSpeaking: false }));
            audioRef.current = null;
            resolve();
          });
        });
      }
    } catch {
      setState(prev => ({ ...prev, isSpeaking: false }));
    }
  }, [enabled]);

  const processTranscript = useCallback((text: string) => {
    const lowerText = text.toLowerCase().trim();
    
    for (const command of commands) {
      for (const keyword of command.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          command.action();
          return true;
        }
      }
    }
    
    return false;
  }, [commands]);

  const transcribeAudio = useCallback(async (audioBlob: Blob) => {
    setState(prev => ({ ...prev, isTranscribing: true }));
    
    try {
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
      
      const base64 = await base64Promise;
      const res = await apiRequest("POST", "/api/transcribe", { audioBase64: base64 });
      const data = await res.json();
      
      if (data.text) {
        setState(prev => ({ ...prev, transcript: data.text, isTranscribing: false }));
        onTranscript?.(data.text);
        processTranscript(data.text);
        return data.text;
      }
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        isTranscribing: false, 
        error: "Failed to transcribe" 
      }));
    }
    
    setState(prev => ({ ...prev, isTranscribing: false }));
    return null;
  }, [onTranscript, processTranscript]);

  const checkAudioLevel = useCallback(() => {
    if (!analyserRef.current || !state.isListening) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    const normalizedLevel = Math.min(average / 128, 1);

    if (normalizedLevel > 0.05) {
      lastSoundTimeRef.current = Date.now();
      
      if (state.isSpeaking) {
        stopSpeaking();
      }
    }

    const timeSinceSound = Date.now() - lastSoundTimeRef.current;
    if (timeSinceSound > silenceThreshold && state.isListening) {
      stopListening();
      return;
    }

    animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
  }, [state.isListening, state.isSpeaking, silenceThreshold, stopSpeaking]);

  const startListening = useCallback(async () => {
    if (!enabled) return;

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

      const mimeType = getSupportedMimeType();
      const recorderOptions: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cleanup();
        
        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: mimeType || 'audio/webm' 
          });
          await transcribeAudio(audioBlob);
        }
      };

      mediaRecorder.start(100);
      setState(prev => ({ ...prev, isListening: true, error: null }));
      
      animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
    } catch {
      setState(prev => ({ 
        ...prev, 
        error: "Microphone access required" 
      }));
    }
  }, [enabled, cleanup, transcribeAudio, checkAudioLevel]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const speakAndListen = useCallback(async (text: string) => {
    await speak(text);
    await new Promise(resolve => setTimeout(resolve, 300));
    startListening();
  }, [speak, startListening]);

  useEffect(() => {
    if (autoSpeak && enabled && !hasAutoSpoken.current) {
      hasAutoSpoken.current = true;
      const timer = setTimeout(() => {
        speakAndListen(autoSpeak);
      }, autoSpeakDelay);
      return () => clearTimeout(timer);
    }
  }, [autoSpeak, autoSpeakDelay, enabled, speakAndListen]);

  return {
    ...state,
    speak,
    speakAndListen,
    startListening,
    stopListening,
    stopSpeaking,
    cleanup,
  };
}
