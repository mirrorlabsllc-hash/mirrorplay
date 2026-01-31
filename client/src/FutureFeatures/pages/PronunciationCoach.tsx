import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Mic, Square, Volume2, Star, Target, Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";

interface Phrase {
  id: string;
  phrase: string;
  category: string;
  difficulty: number;
}

interface PronunciationResult {
  transcription: string;
  targetPhrase: string;
  accuracyScore: number;
  feedback: {
    overallFeedback: string;
    tips: string[];
    wordsToFocus: string[];
    clarityScore: number;
    confidenceScore: number;
  };
  xpEarned: number;
}

const categories = [
  { id: "workplace", label: "Workplace", color: "bg-blue-500/20 text-blue-400" },
  { id: "assertive", label: "Assertive", color: "bg-orange-500/20 text-orange-400" },
  { id: "empathetic", label: "Empathetic", color: "bg-pink-500/20 text-pink-400" },
];

const difficultyLabels = ["Easy", "Medium", "Hard"];

export default function PronunciationCoach() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>("workplace");
  const [selectedPhrase, setSelectedPhrase] = useState<Phrase | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [result, setResult] = useState<PronunciationResult | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const { data: phrases = [], isLoading: phrasesLoading } = useQuery<Phrase[]>({
    queryKey: ["/api/pronunciation/phrases", selectedCategory],
  });

  const filteredPhrases = phrases.filter(p => p.category === selectedCategory);

  const attemptMutation = useMutation({
    mutationFn: async (data: { phraseId: string; audioBase64: string }) => {
      const res = await apiRequest("POST", "/api/pronunciation/attempt", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/pronunciation/attempts"] });
      toast({
        title: `${data.accuracyScore}% Accuracy`,
        description: `Earned ${data.xpEarned} XP! ${data.feedback.overallFeedback}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to process your pronunciation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/pronunciation/seed", {});
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/pronunciation/phrases"] });
      toast({ title: "Phrases Loaded", description: data.message });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          if (selectedPhrase) {
            attemptMutation.mutate({
              phraseId: selectedPhrase.id,
              audioBase64: base64,
            });
          }
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Access Required",
        description: "Please allow microphone access to practice pronunciation.",
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

  const speakPhrase = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  const tryAgain = () => {
    setResult(null);
  };

  if (phrasesLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show practice UI if a phrase is selected
  if (selectedPhrase) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-lg mx-auto space-y-6">
          <Button 
            variant="ghost" 
            onClick={() => { setSelectedPhrase(null); setResult(null); }}
            data-testid="button-back-to-phrases"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Phrases
          </Button>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className={categories.find(c => c.id === selectedPhrase.category)?.color}>
                  {selectedPhrase.category}
                </Badge>
                <Badge variant="outline">
                  {difficultyLabels[selectedPhrase.difficulty - 1]}
                </Badge>
              </div>
              <CardTitle className="text-xl mt-2">Practice This Phrase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-muted/30 p-4 rounded-md">
                <p className="text-lg font-medium text-center">
                  "{selectedPhrase.phrase}"
                </p>
              </div>

              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speakPhrase(selectedPhrase.phrase)}
                  data-testid="button-listen-phrase"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Listen
                </Button>
              </div>

              {!result ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Press and hold to record yourself saying the phrase
                  </p>
                  
                  <Button
                    size="lg"
                    className={`rounded-full w-20 h-20 ${isRecording ? 'bg-red-500 hover:bg-red-600' : ''}`}
                    onMouseDown={startRecording}
                    onMouseUp={stopRecording}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecording}
                    disabled={attemptMutation.isPending}
                    data-testid="button-record-pronunciation"
                  >
                    {attemptMutation.isPending ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : isRecording ? (
                      <Square className="w-8 h-8" />
                    ) : (
                      <Mic className="w-8 h-8" />
                    )}
                  </Button>

                  {isRecording && (
                    <p className="text-sm text-red-400 animate-pulse">Recording...</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-primary mb-2">
                      {result.accuracyScore}%
                    </div>
                    <p className="text-sm text-muted-foreground">Accuracy Score</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 bg-muted/30 rounded-md">
                      <div className="text-2xl font-semibold">{result.feedback.clarityScore}%</div>
                      <p className="text-xs text-muted-foreground">Clarity</p>
                    </div>
                    <div className="text-center p-3 bg-muted/30 rounded-md">
                      <div className="text-2xl font-semibold">{result.feedback.confidenceScore}%</div>
                      <p className="text-xs text-muted-foreground">Confidence</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">You said:</p>
                    <p className="text-muted-foreground italic">"{result.transcription}"</p>
                  </div>

                  <div className="space-y-2">
                    <p className="font-medium">Feedback:</p>
                    <p className="text-muted-foreground">{result.feedback.overallFeedback}</p>
                  </div>

                  {result.feedback.tips.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Tips:</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                        {result.feedback.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.feedback.wordsToFocus.length > 0 && (
                    <div className="space-y-2">
                      <p className="font-medium">Words to Focus:</p>
                      <div className="flex flex-wrap gap-2">
                        {result.feedback.wordsToFocus.map((word, i) => (
                          <Badge key={i} variant="outline">{word}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3 pt-4">
                    <Button onClick={tryAgain} className="flex-1" data-testid="button-try-again">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Try Again
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => { setSelectedPhrase(null); setResult(null); }}
                      className="flex-1"
                      data-testid="button-next-phrase"
                    >
                      Next Phrase
                    </Button>
                  </div>

                  <p className="text-center text-sm text-primary">
                    +{result.xpEarned} XP earned!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/journey">
            <Button variant="ghost" size="icon" data-testid="button-back-journey">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pronunciation Coach</h1>
            <p className="text-sm text-muted-foreground">
              Practice speaking key phrases with AI feedback
            </p>
          </div>
        </div>

        {filteredPhrases.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <Target className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">No phrases available yet.</p>
              <Button 
                onClick={() => seedMutation.mutate()} 
                disabled={seedMutation.isPending}
                data-testid="button-load-phrases"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Load Practice Phrases
              </Button>
            </CardContent>
          </Card>
        )}

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full">
            {categories.map(cat => (
              <TabsTrigger key={cat.id} value={cat.id} className="flex-1" data-testid={`tab-${cat.id}`}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map(cat => (
            <TabsContent key={cat.id} value={cat.id} className="space-y-3 mt-4">
              {filteredPhrases.map((phrase) => (
                <Card 
                  key={phrase.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedPhrase(phrase)}
                  data-testid={`card-phrase-${phrase.id}`}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-medium mb-2">"{phrase.phrase}"</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {difficultyLabels[phrase.difficulty - 1]}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: phrase.difficulty }).map((_, i) => (
                              <Star key={i} className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                            ))}
                          </div>
                        </div>
                      </div>
                      <Mic className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  );
}
