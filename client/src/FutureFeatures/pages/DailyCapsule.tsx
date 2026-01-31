import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { VoiceInputPrimary } from "@/components/VoiceInputPrimary";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calendar, 
  Sparkles, 
  ArrowLeft,
  CheckCircle,
  Loader2,
  MessageCircle,
  Volume2
} from "lucide-react";
import type { DailyCapsule, UserProgress } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  workplace: "Workplace Communication",
  relationships: "Relationship Skills",
  boundaries: "Setting Boundaries",
  empathy: "Empathetic Listening",
  negotiation: "Negotiation",
  accountability: "Taking Accountability",
  feedback: "Giving Feedback",
  needs: "Expressing Needs",
};

const categoryColors: Record<string, string> = {
  workplace: "bg-blue-500/20 text-blue-400",
  relationships: "bg-pink-500/20 text-pink-400",
  boundaries: "bg-orange-500/20 text-orange-400",
  empathy: "bg-green-500/20 text-green-400",
  negotiation: "bg-purple-500/20 text-purple-400",
  accountability: "bg-amber-500/20 text-amber-400",
  feedback: "bg-cyan-500/20 text-cyan-400",
  needs: "bg-rose-500/20 text-rose-400",
};

export default function DailyCapsulePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [response, setResponse] = useState("");
  const [analysis, setAnalysis] = useState<any>(null);

  const { data: capsule, isLoading: capsuleLoading } = useQuery<DailyCapsule>({
    queryKey: ["/api/daily-capsule"],
  });

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { prompt: string; response: string }) => {
      const res = await apiRequest("POST", "/api/practice/analyze", data);
      return res.json();
    },
    onSuccess: (data) => {
      setAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/daily-capsule"] });
      toast({
        title: "Analysis complete!",
        description: `You earned ${data.xpEarned || 10} XP`,
      });
    },
    onError: () => {
      toast({
        title: "Analysis failed",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!capsule || selectedQuestion === null || !response.trim()) return;
    
    const questions = capsule.questions as string[];
    analyzeMutation.mutate({
      prompt: questions[selectedQuestion],
      response: response.trim(),
    });
  };

  if (capsuleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4">
        <Button variant="ghost" onClick={() => navigate("/")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <GlassCard variant="dark" className="text-center py-8">
          <p className="text-muted-foreground">No daily capsule available</p>
        </GlassCard>
      </div>
    );
  }

  const questions = (capsule.questions as string[]) || [];
  const isCompleted = capsule.completed || analysis;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-4"
      >
        <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Daily Practice</h1>
          <p className="text-sm text-muted-foreground">Your personal prompt for today</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold">Today's Focus</h2>
              <Badge className={categoryColors[capsule.category] || "bg-muted"}>
                {categoryLabels[capsule.category] || capsule.category}
              </Badge>
            </div>
            {isCompleted && (
              <CheckCircle className="w-6 h-6 text-green-500" />
            )}
          </div>
        </GlassCard>
      </motion.div>

      {!isCompleted ? (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-medium">Choose a prompt to practice:</h3>
            {questions.map((question, index) => (
              <GlassCard
                key={index}
                variant={selectedQuestion === index ? "glow" : "dark"}
                hover
                className={`cursor-pointer transition-all ${
                  selectedQuestion === index ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedQuestion(index)}
                data-testid={`prompt-option-${index}`}
              >
                <div className="flex items-start gap-3">
                  <MessageCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p>{question}</p>
                </div>
              </GlassCard>
            ))}
          </motion.div>

          {selectedQuestion !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Speak your response as if talking to the person directly
              </p>
              <VoiceInputPrimary
                onSubmit={(text) => {
                  setResponse(text);
                  const questions = capsule?.questions as string[];
                  if (questions && selectedQuestion !== null) {
                    analyzeMutation.mutate({
                      prompt: questions[selectedQuestion],
                      response: text.trim(),
                    });
                  }
                }}
                isSubmitting={analyzeMutation.isPending}
                placeholder="Type how you would respond in this situation..."
                autoStart={true}
                autoStartDelay={1500}
                silenceThreshold={4000}
                submitLabel="Submit for Analysis"
              />
            </motion.div>
          )}
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <GlassCard variant="glow">
            <div className="text-center py-4">
              <Sparkles className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Great work today!</h3>
              <p className="text-muted-foreground mb-4">
                You've completed your daily practice
              </p>
              {analysis && (
                <div className="text-left space-y-3 mt-4 pt-4 border-t border-border">
                  <h4 className="font-semibold">Feedback:</h4>
                  <p className="text-sm text-muted-foreground">{analysis.feedback}</p>
                  {analysis.suggestions && analysis.suggestions.length > 0 && (
                    <>
                      <h4 className="font-semibold">Suggestions:</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {analysis.suggestions.map((s: string, i: number) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-primary">-</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              )}
            </div>
          </GlassCard>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => navigate("/practice")}>
              More Practice
            </Button>
            <Button onClick={() => navigate("/")}>
              Back Home
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
