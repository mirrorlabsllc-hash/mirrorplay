import { useState, useEffect, useRef, useCallback } from "react";

export interface VoiceInputState {
  isListening: boolean;
  isProcessing: boolean;
  silencePhase: "active" | "thinking" | "preparing" | "submitting";
  silenceDuration: number;
  audioLevel: number;
  transcript: string;
  error: string | null;
}

interface UseVoiceInputOptions {
  onTranscript: (transcript: string) => void;
  onAutoSubmit?: () => void;
  autoStart?: boolean;
  maxDuration?: number;
  silenceThreshold?: number;
}

const SILENCE_THINKING_MS = 3000;
const SILENCE_PREPARE_MS = 5000;
const SILENCE_SUBMIT_MS = 6000;
const MAX_RECORDING_MS = 90000;
const AUDIO_LEVEL_THRESHOLD = 0.02;

export function useVoiceInput({
  onTranscript,
  onAutoSubmit,
  autoStart = true,
  maxDuration = MAX_RECORDING_MS,
  silenceThreshold = AUDIO_LEVEL_THRESHOLD,
}: UseVoiceInputOptions) {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isProcessing: false,
    silencePhase: "active",
    silenceDuration: 0,
    audioLevel: 0,
    transcript: "",
    error: null,
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const silenceStartRef = useRef<number | null>(null);
  const recordingStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const hasSpokenRef = useRef(false);

  const getSilencePhase = useCallback((silenceDuration: number): VoiceInputState["silencePhase"] => {
    if (silenceDuration >= SILENCE_SUBMIT_MS) return "submitting";
    if (silenceDuration >= SILENCE_PREPARE_MS) return "preparing";
    if (silenceDuration >= SILENCE_THINKING_MS) return "thinking";
    return "active";
  }, []);

  const stopRecording = useCallback(async () => {
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

    if (audioContextRef.current) {
      await audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setState(prev => ({ ...prev, isListening: false }));
  }, []);

  const processAudio = useCallback(async () => {
    if (chunksRef.current.length === 0) return;

    setState(prev => ({ ...prev, isProcessing: true }));

    const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
    chunksRef.current = [];

    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Transcription failed");

      const { text } = await response.json();
      setState(prev => ({ ...prev, transcript: text, isProcessing: false }));
      onTranscript(text);
      onAutoSubmit?.();
    } catch (error) {
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: "Failed to process audio",
      }));
    }
  }, [onTranscript, onAutoSubmit]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (hasSpokenRef.current) {
          processAudio();
        }
      };

      mediaRecorder.start(100);
      recordingStartRef.current = Date.now();
      silenceStartRef.current = Date.now();
      hasSpokenRef.current = false;

      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
        silencePhase: "active",
        silenceDuration: 0,
      }));

      const checkAudioLevel = () => {
        if (!analyserRef.current || !mediaRecorderRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
        const normalizedLevel = Math.min(average * 3, 1);

        const isSpeaking = normalizedLevel > silenceThreshold;
        const now = Date.now();

        if (isSpeaking) {
          hasSpokenRef.current = true;
          silenceStartRef.current = now;
          setState(prev => ({
            ...prev,
            audioLevel: normalizedLevel,
            silencePhase: "active",
            silenceDuration: 0,
          }));
        } else if (hasSpokenRef.current && silenceStartRef.current) {
          const silenceDuration = now - silenceStartRef.current;
          const phase = getSilencePhase(silenceDuration);

          setState(prev => ({
            ...prev,
            audioLevel: normalizedLevel,
            silencePhase: phase,
            silenceDuration,
          }));

          if (silenceDuration >= SILENCE_SUBMIT_MS) {
            stopRecording();
            return;
          }
        } else {
          setState(prev => ({ ...prev, audioLevel: normalizedLevel }));
        }

        if (recordingStartRef.current && now - recordingStartRef.current >= maxDuration) {
          stopRecording();
          return;
        }

        animationFrameRef.current = requestAnimationFrame(checkAudioLevel);
      };

      checkAudioLevel();
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.name === "NotAllowedError" 
          ? "Microphone access denied" 
          : "Failed to start recording",
      }));
    }
  }, [processAudio, stopRecording, getSilencePhase, maxDuration, silenceThreshold]);

  useEffect(() => {
    if (autoStart) {
      startRecording();
    }

    return () => {
      stopRecording();
    };
  }, [autoStart]);

  const reset = useCallback(() => {
    setState({
      isListening: false,
      isProcessing: false,
      silencePhase: "active",
      silenceDuration: 0,
      audioLevel: 0,
      transcript: "",
      error: null,
    });
    chunksRef.current = [];
    hasSpokenRef.current = false;
  }, []);

  return {
    ...state,
    startRecording,
    stopRecording,
    reset,
  };
}
