import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceInputPrimary } from "@/components/VoiceInputPrimary";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquareText,
  Sparkles,
  Heart,
  Briefcase,
  Users,
  Shield,
  Volume2
} from "lucide-react";

interface FeedbackResponse {
  overallRead: string;
  whatsWorking: string[];
  whatCouldBeStronger: string[];
  optionalRewrite?: string;
}

interface PromptCategory {
  id: string;
  label: string;
  icon: typeof Heart;
  prompts: string[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: "relationships",
    label: "Relationships",
    icon: Heart,
    prompts: [
      "Your partner forgot an important anniversary. How would you bring this up?",
      "A friend keeps canceling plans at the last minute. What do you say?",
      "You feel unappreciated by your partner. How do you express this?",
    ],
  },
  {
    id: "workplace",
    label: "Workplace",
    icon: Briefcase,
    prompts: [
      "A coworker takes credit for your idea in a meeting. How do you address this?",
      "Your manager gives you an unrealistic deadline. What do you say?",
      "A colleague's behavior is affecting your work. How do you bring it up?",
    ],
  },
  {
    id: "family",
    label: "Family",
    icon: Users,
    prompts: [
      "A family member keeps giving unsolicited advice. How do you respond?",
      "You need to set a boundary with an overbearing parent. What do you say?",
      "A sibling borrowed money and hasn't paid it back. How do you address this?",
    ],
  },
  {
    id: "boundaries",
    label: "Boundaries",
    icon: Shield,
    prompts: [
      "Someone asks you to do something you're not comfortable with. How do you decline?",
      "A friend keeps venting to you and it's draining. What do you say?",
      "Someone pressures you to change your decision. How do you hold firm?",
    ],
  },
];

type ViewState = "select-prompt" | "write-response" | "view-feedback";

export default function PracticeFeedback() {
  const { toast } = useToast();
  const [viewState, setViewState] = useState<ViewState>("select-prompt");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState<FeedbackResponse | null>(null);
  const [isPlayingPrompt, setIsPlayingPrompt] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { data: voicesData } = useQuery<{ ttsAvailable: boolean }>({
    queryKey: ["/api/voices"],
  });

  const ttsAvailable = voicesData?.ttsAvailable || false;

  const ttsMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiRequest("POST", "/api/tts", { text });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.audio) {
        playAudio(data.audio);
      }
    },
  });

  const playAudio = (audioBase64: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
    audioRef.current = audio;
    audio.onplay = () => setIsPlayingPrompt(true);
    audio.onended = () => setIsPlayingPrompt(false);
    audio.onerror = () => setIsPlayingPrompt(false);
    audio.play().catch(() => setIsPlayingPrompt(false));
  };

  const handlePlayPrompt = () => {
    if (selectedPrompt && ttsAvailable) {
      ttsMutation.mutate(selectedPrompt);
    }
  };

  const feedbackMutation = useMutation({
    mutationFn: async (data: { prompt: string; response: string }) => {
      const res = await apiRequest("POST", "/api/practice/feedback", data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.feedback) {
        setFeedback(data.feedback);
        setViewState("view-feedback");
      }
    },
  });

  const handleSelectPrompt = (categoryId: string, prompt: string) => {
    setSelectedCategory(categoryId);
    setSelectedPrompt(prompt);
    setViewState("write-response");
    if (ttsAvailable) {
      setTimeout(() => ttsMutation.mutate(prompt), 500);
    }
  };

  const handleVoiceSubmit = (text: string) => {
    if (!selectedPrompt || !text.trim()) return;
    setUserResponse(text);
    feedbackMutation.mutate({ prompt: selectedPrompt, response: text.trim() });
  };

  const handleStartOver = () => {
    setViewState("select-prompt");
    setSelectedCategory(null);
    setSelectedPrompt(null);
    setUserResponse("");
    setFeedback(null);
  };

  const handleTryAgain = () => {
    setViewState("write-response");
    setUserResponse("");
    setFeedback(null);
  };

  return (
    <div className="min-h-screen pb-24 pt-4 px-4">
      <motion.header
        className="flex items-center gap-4 mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to="/practice">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-bold">Practice + Feedback</h1>
          <p className="text-sm text-muted-foreground">
            Speak your response and get AI coaching
          </p>
        </div>
      </motion.header>

      <AnimatePresence mode="wait">
        {viewState === "select-prompt" && (
          <motion.div
            key="select-prompt"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-4"
          >
            <p className="text-muted-foreground text-center mb-6">
              Choose a scenario to practice your response
            </p>

            {PROMPT_CATEGORIES.map((category) => (
              <GlassCard key={category.id} variant="dark" className="space-y-3">
                <div className="flex items-center gap-2">
                  <category.icon className="w-5 h-5 text-primary" />
                  <h2 className="font-semibold">{category.label}</h2>
                </div>
                <div className="space-y-2">
                  {category.prompts.map((prompt, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      className="w-full text-left justify-start h-auto py-3 px-4 whitespace-normal"
                      onClick={() => handleSelectPrompt(category.id, prompt)}
                      data-testid={`prompt-${category.id}-${idx}`}
                    >
                      <span className="line-clamp-2">{prompt}</span>
                    </Button>
                  ))}
                </div>
              </GlassCard>
            ))}
          </motion.div>
        )}

        {viewState === "write-response" && selectedPrompt && (
          <motion.div
            key="write-response"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <GlassCard variant="glow">
              <div className="flex items-start gap-3">
                <MessageSquareText className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-1">The Scenario:</p>
                  <p className="font-medium">{selectedPrompt}</p>
                </div>
                {ttsAvailable && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPrompt}
                    disabled={ttsMutation.isPending || isPlayingPrompt}
                    data-testid="button-play-scenario"
                  >
                    {ttsMutation.isPending || isPlayingPrompt ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </GlassCard>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Speak your response as if you're talking to the person directly
              </p>
              
              <VoiceInputPrimary
                onSubmit={handleVoiceSubmit}
                isSubmitting={feedbackMutation.isPending}
                placeholder="Write what you would say in this situation..."
                autoStart={true}
                autoStartDelay={2000}
                silenceThreshold={4000}
                promptText={selectedPrompt}
                onPlayPrompt={ttsAvailable ? handlePlayPrompt : undefined}
                submitLabel="Get Feedback"
              />
            </div>

            {feedbackMutation.isError && (
              <GlassCard variant="dark" className="border-destructive/50">
                <div className="flex items-center gap-3 text-destructive">
                  <AlertTriangle className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Unable to get feedback</p>
                    <p className="text-sm text-muted-foreground">
                      The AI service is temporarily unavailable. Please try again later.
                    </p>
                  </div>
                </div>
              </GlassCard>
            )}

            <Button
              variant="outline"
              onClick={handleStartOver}
              disabled={feedbackMutation.isPending}
              className="w-full"
              data-testid="button-change-prompt"
            >
              Change Prompt
            </Button>
          </motion.div>
        )}

        {viewState === "view-feedback" && feedback && (
          <motion.div
            key="view-feedback"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <GlassCard variant="dark">
              <div className="flex items-start gap-3">
                <MessageSquareText className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Prompt:</p>
                  <p className="text-sm">{selectedPrompt}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="dark">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Your Response:</p>
                  <p className="text-sm">{userResponse}</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard variant="glow">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-primary/20 text-primary">Overall Read</Badge>
                </div>
                <p className="text-sm leading-relaxed" data-testid="feedback-overall">
                  {feedback.overallRead}
                </p>
              </div>
            </GlassCard>

            <GlassCard variant="dark">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="font-semibold">What's Working</span>
                </div>
                <ul className="space-y-2" data-testid="feedback-working">
                  {feedback.whatsWorking.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-emerald-500 mt-1">+</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>

            <GlassCard variant="dark">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  <span className="font-semibold">What Could Be Stronger</span>
                </div>
                <ul className="space-y-2" data-testid="feedback-improvements">
                  {feedback.whatCouldBeStronger.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-amber-500 mt-1">-</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </GlassCard>

            {feedback.optionalRewrite && (
              <GlassCard variant="dark">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-5 h-5 text-violet-500" />
                    <span className="font-semibold">Optional Rewrite</span>
                  </div>
                  <p className="text-sm italic bg-muted/30 p-3 rounded-lg" data-testid="feedback-rewrite">
                    "{feedback.optionalRewrite}"
                  </p>
                </div>
              </GlassCard>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleTryAgain}
                className="flex-1"
                data-testid="button-try-again"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
              <Button
                onClick={handleStartOver}
                className="flex-1"
                data-testid="button-new-prompt"
              >
                New Prompt
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
