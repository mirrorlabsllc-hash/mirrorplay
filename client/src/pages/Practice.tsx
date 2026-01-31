import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/UserAvatar";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { QuickPractice } from "@/components/QuickPractice";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Briefcase, 
  Heart, 
  Shield, 
  Handshake, 
  Scale, 
  MessageSquare,
  Lightbulb,
  Hand,
  ChevronRight,
  Send,
  Loader2,
  RefreshCw,
  Mic,
  Sparkles,
  Check,
  Type,
  Volume2,
  Clock,
  AlertCircle,
  Gauge,
  Speech,
  Flame,
  Award,
  Crown,
  Zap
} from "lucide-react";
import { categories, getRandomQuestion } from "@shared/questionBank";
import type { QuestionCategory } from "@shared/schema";

const categoryConfig: Record<QuestionCategory, { icon: any; color: string; label: string }> = {
  workplace: { icon: Briefcase, color: "text-blue-500 bg-blue-500/20", label: "Workplace" },
  relationships: { icon: Heart, color: "text-pink-500 bg-pink-500/20", label: "Relationships" },
  boundaries: { icon: Shield, color: "text-amber-500 bg-amber-500/20", label: "Boundaries" },
  empathy: { icon: Handshake, color: "text-emerald-500 bg-emerald-500/20", label: "Empathy" },
  negotiation: { icon: Scale, color: "text-violet-500 bg-violet-500/20", label: "Negotiation" },
  accountability: { icon: Hand, color: "text-red-500 bg-red-500/20", label: "Accountability" },
  feedback: { icon: MessageSquare, color: "text-cyan-500 bg-cyan-500/20", label: "Feedback" },
  needs: { icon: Lightbulb, color: "text-yellow-500 bg-yellow-500/20", label: "Needs" },
};

interface EarnedBadge {
  name: string;
  icon: string;
  description: string;
}

interface TextAnalysisResult {
  tone: string;
  score: number;
  tips: string[];
  exampleResponses: string[];
  xpEarned: number;
  ppEarned: number;
  streakBonus: number;
  currentStreak: number;
  newBadges: EarnedBadge[];
}

interface VoiceAnalysisResult extends TextAnalysisResult {
  transcription: string;
  wordCount: number;
  wordsPerMinute: number;
  paceFeedback: string;
  fillerWordCount: number;
  detectedFillers: string[];
  audioDuration: number;
  confidenceLevel?: number;
  voiceCoachingTips?: string[];
}

type PracticeMode = 'text' | 'voice';

interface UsageData {
  tier: 'free' | 'peace_plus' | 'pro_mind';
  dailyLimit: number | 'unlimited';
  usedToday: number;
  remainingToday: number | 'unlimited';
}

const tierLabels: Record<string, string> = {
  free: 'Free',
  peace_plus: 'Peace+',
  pro_mind: 'Pro Mind',
};

export default function Practice() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  const [selectedCategory, setSelectedCategory] = useState<QuestionCategory | null>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [analysis, setAnalysis] = useState<TextAnalysisResult | VoiceAnalysisResult | null>(null);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('text');
  const [limitExceeded, setLimitExceeded] = useState(false);

  const { data: usageData, refetch: refetchUsage } = useQuery<UsageData>({
    queryKey: ["/api/subscription/usage"],
  });

  const isUnlimited = usageData?.dailyLimit === 'unlimited';
  const remaining = usageData?.remainingToday;
  const isNearLimit = typeof remaining === 'number' && remaining <= 2 && remaining > 0;
  const isAtLimit = typeof remaining === 'number' && remaining === 0;

  const analyzeMutation = useMutation({
    mutationFn: async (data: { prompt: string; response: string; category: string }) => {
      const res = await apiRequest("POST", "/api/practice/analyze", data);
      if (res.status === 402) {
        const errorData = await res.json();
        throw { status: 402, ...errorData };
      }
      return res.json() as Promise<TextAnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setLimitExceeded(false);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      refetchUsage();
      
      const streakText = data.streakBonus > 0 ? ` (+${data.streakBonus} streak bonus)` : '';
      toast({
        title: `+${data.xpEarned} XP${streakText}, +${data.ppEarned} PP`,
        description: `Your response was ${data.tone.toLowerCase()}`,
      });
      
      if (data.newBadges && data.newBadges.length > 0) {
        data.newBadges.forEach(badge => {
          toast({
            title: `Badge Earned: ${badge.name}`,
            description: badge.description,
          });
        });
      }
    },
    onError: (error: any) => {
      if (error?.status === 402 || error?.upgradeRequired) {
        setLimitExceeded(true);
        toast({
          title: "Daily limit reached",
          description: "Upgrade your subscription for more analyses",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Analysis failed",
          description: "Please try again",
          variant: "destructive",
        });
      }
    },
  });

  const voiceAnalyzeMutation = useMutation({
    mutationFn: async (data: { audioBase64: string; duration: number; prompt: string; category: string }) => {
      const res = await apiRequest("POST", "/api/practice/analyze-voice", data);
      if (res.status === 402) {
        const errorData = await res.json();
        throw { status: 402, ...errorData };
      }
      return res.json() as Promise<VoiceAnalysisResult>;
    },
    onSuccess: (data) => {
      setAnalysis(data);
      setLimitExceeded(false);
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      refetchUsage();
      
      const streakText = data.streakBonus > 0 ? ` (+${data.streakBonus} streak bonus)` : '';
      toast({
        title: `+${data.xpEarned} XP${streakText}, +${data.ppEarned} PP`,
        description: `Your response was ${data.tone.toLowerCase()}`,
      });
      
      if (data.newBadges && data.newBadges.length > 0) {
        data.newBadges.forEach(badge => {
          toast({
            title: `Badge Earned: ${badge.name}`,
            description: badge.description,
          });
        });
      }
    },
    onError: (error: any) => {
      if (error?.status === 402 || error?.upgradeRequired) {
        setLimitExceeded(true);
        toast({
          title: "Daily limit reached",
          description: "Upgrade your subscription for more analyses",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Voice analysis failed",
          description: error?.message || "Please try again",
          variant: "destructive",
        });
      }
    },
  });

  const selectCategory = (category: QuestionCategory) => {
    setSelectedCategory(category);
    setCurrentPrompt(getRandomQuestion(category));
    setResponse("");
    setAnalysis(null);
  };

  const refreshPrompt = () => {
    if (selectedCategory) {
      setCurrentPrompt(getRandomQuestion(selectedCategory));
      setResponse("");
      setAnalysis(null);
    }
  };

  const handleTextSubmit = () => {
    if (!currentPrompt || !response.trim() || !selectedCategory) return;
    
    analyzeMutation.mutate({
      prompt: currentPrompt,
      response: response.trim(),
      category: selectedCategory,
    });
  };

  const handleVoiceSubmit = (audioBase64: string, duration: number) => {
    if (!currentPrompt || !selectedCategory) return;

    voiceAnalyzeMutation.mutate({
      audioBase64,
      duration,
      prompt: currentPrompt,
      category: selectedCategory,
    });
  };

  const resetPractice = () => {
    setSelectedCategory(null);
    setCurrentPrompt(null);
    setResponse("");
    setAnalysis(null);
  };

  const isVoiceAnalysis = (result: TextAnalysisResult | VoiceAnalysisResult): result is VoiceAnalysisResult => {
    return 'transcription' in result;
  };

  const getPaceColor = (wpm: number) => {
    if (wpm >= 120 && wpm <= 150) return "text-emerald-500";
    if (wpm < 100 || wpm > 170) return "text-amber-500";
    return "text-blue-500";
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Category Selection View
  if (!selectedCategory) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-bold">Practice</h1>
          <p className="text-muted-foreground">Choose a category to practice</p>
        </motion.div>

        {/* Quick Practice Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <QuickPractice />
        </motion.div>

        {usageData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GlassCard variant={isAtLimit ? "glow" : "dark"} className={isAtLimit ? "border-amber-500/50" : ""}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Zap className={`w-5 h-5 ${isAtLimit ? 'text-amber-500' : isNearLimit ? 'text-amber-500' : 'text-violet-500'}`} />
                  <div>
                    <p className="text-sm font-medium" data-testid="text-usage-counter">
                      {isUnlimited ? (
                        'Unlimited analyses'
                      ) : (
                        <>
                          {usageData.remainingToday} of {usageData.dailyLimit} analyses remaining today
                        </>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tierLabels[usageData.tier]} tier
                    </p>
                  </div>
                </div>
                {!isUnlimited && usageData.tier === 'free' && (
                  <Link to="/subscribe">
                    <Button size="sm" variant={isAtLimit ? "default" : "outline"} className="gap-1" data-testid="button-upgrade-cta">
                      <Crown className="w-4 h-4" />
                      Upgrade
                    </Button>
                  </Link>
                )}
              </div>
              {isNearLimit && !isAtLimit && (
                <p className="text-xs text-amber-500 mt-2">
                  Running low on analyses. Upgrade for more!
                </p>
              )}
              {isAtLimit && (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm text-amber-500">
                    Daily limit reached. Upgrade to continue practicing!
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {categories.map((category, index) => {
            const config = categoryConfig[category as QuestionCategory];
            const Icon = config.icon;
            
            return (
              <motion.div
                key={category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard 
                  variant="dark" 
                  hover 
                  className="cursor-pointer"
                  onClick={() => selectCategory(category as QuestionCategory)}
                  data-testid={`card-category-${category}`}
                >
                  <div className="flex flex-col items-center text-center py-4 gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${config.color.split(" ")[1]}`}>
                      <Icon className={`w-6 h-6 ${config.color.split(" ")[0]}`} />
                    </div>
                    <span className="font-medium">{config.label}</span>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  const config = categoryConfig[selectedCategory];
  const isLoading = analyzeMutation.isPending || voiceAnalyzeMutation.isPending;

  // Practice View
  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-4">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between gap-3"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={resetPractice} data-testid="button-back">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </Button>
          <Badge className={config.color}>{config.label}</Badge>
        </div>
        
        {/* Mode Toggle */}
        {!analysis && (
          <div className="flex bg-muted rounded-lg p-1">
            <Button
              variant={practiceMode === 'text' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPracticeMode('text')}
              className="gap-1"
              data-testid="button-mode-text"
            >
              <Type className="w-4 h-4" />
              Text
            </Button>
            <Button
              variant={practiceMode === 'voice' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPracticeMode('voice')}
              className="gap-1"
              data-testid="button-mode-voice"
            >
              <Mic className="w-4 h-4" />
              Voice
            </Button>
          </div>
        )}
      </motion.div>

      {/* Avatar */}
      <motion.div 
        className="flex justify-center py-4"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <UserAvatar 
          mood={isLoading ? "calm" : analysis ? "warm" : "calm"} 
          size="lg" 
        />
      </motion.div>

      {/* Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-lg font-medium leading-relaxed" data-testid="text-prompt">{currentPrompt}</p>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={refreshPrompt}
              disabled={isLoading}
              data-testid="button-refresh-prompt"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Limit Exceeded Banner */}
      {(limitExceeded || isAtLimit) && !analysis && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <GlassCard variant="glow" className="border-amber-500/50">
            <div className="flex flex-col items-center text-center gap-3 py-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Daily Limit Reached</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You've used all {usageData?.dailyLimit} analyses for today.
                  Upgrade to continue practicing!
                </p>
              </div>
              <Link to="/subscribe">
                <Button className="gap-2 mt-2" data-testid="button-upgrade-limit-exceeded">
                  <Crown className="w-4 h-4" />
                  Upgrade Now
                </Button>
              </Link>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Response Input or Analysis */}
      <AnimatePresence mode="wait">
        {!analysis ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {practiceMode === 'text' ? (
              <>
                <GlassCard variant="dark">
                  <Textarea
                    placeholder="Type your response here..."
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    className="min-h-32 bg-transparent border-0 resize-none focus-visible:ring-0 text-base"
                    disabled={analyzeMutation.isPending || limitExceeded || isAtLimit}
                    data-testid="input-response"
                  />
                </GlassCard>

                <Button 
                  className="w-full"
                  onClick={handleTextSubmit}
                  disabled={!response.trim() || analyzeMutation.isPending || limitExceeded || isAtLimit}
                  data-testid="button-analyze"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Analyze Response
                </Button>
              </>
            ) : (
              <VoiceRecorder
                onSubmit={handleVoiceSubmit}
                isSubmitting={voiceAnalyzeMutation.isPending}
                disabled={voiceAnalyzeMutation.isPending || limitExceeded || isAtLimit}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="analysis"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Score */}
            <GlassCard variant="glow">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Communication Score</p>
                  <p className="text-3xl font-bold" data-testid="text-score">{analysis.score}/100</p>
                </div>
                <Badge className="text-lg py-2 px-4" data-testid="badge-tone">{analysis.tone}</Badge>
              </div>
            </GlassCard>

            {/* XP Earned */}
            <GlassCard variant="dark" className="py-4">
              <div className="flex items-center justify-center gap-6">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <span className="font-bold" data-testid="text-xp">+{analysis.xpEarned} XP</span>
                </div>
                <div className="w-px h-6 bg-border" />
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-bold" data-testid="text-pp">+{analysis.ppEarned} PP</span>
                </div>
                {analysis.currentStreak > 0 && (
                  <>
                    <div className="w-px h-6 bg-border" />
                    <div className="flex items-center gap-2">
                      <Flame className="w-5 h-5 text-orange-500" />
                      <span className="text-orange-500 font-bold" data-testid="text-streak">{analysis.currentStreak} day streak</span>
                    </div>
                  </>
                )}
              </div>
              {analysis.streakBonus > 0 && (
                <p className="text-center text-sm text-muted-foreground mt-2" data-testid="text-streak-bonus">
                  Includes +{analysis.streakBonus} XP streak bonus
                </p>
              )}
            </GlassCard>
            
            {/* New Badges Earned */}
            {analysis.newBadges && analysis.newBadges.length > 0 && (
              <GlassCard variant="glow">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Badges Earned
                </h3>
                <div className="space-y-2">
                  {analysis.newBadges.map((badge, i) => (
                    <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <Award className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-badge-name-${i}`}>{badge.name}</p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-badge-desc-${i}`}>{badge.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Voice Metrics (only for voice practice) */}
            {isVoiceAnalysis(analysis) && (
              <>
                {/* Transcription */}
                <GlassCard variant="dark">
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Speech className="w-4 h-4 text-violet-500" />
                    Your Spoken Response
                  </h3>
                  <p className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30 italic" data-testid="text-transcription">
                    "{analysis.transcription}"
                  </p>
                </GlassCard>

                {/* Voice Metrics Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <GlassCard variant="dark" className="text-center py-3">
                    <Clock className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-lg font-bold" data-testid="text-duration">{formatDuration(analysis.audioDuration)}</p>
                    <p className="text-xs text-muted-foreground">Duration</p>
                  </GlassCard>
                  
                  <GlassCard variant="dark" className="text-center py-3">
                    <Gauge className={`w-5 h-5 mx-auto mb-1 ${getPaceColor(analysis.wordsPerMinute)}`} />
                    <p className={`text-lg font-bold ${getPaceColor(analysis.wordsPerMinute)}`} data-testid="text-wpm">
                      {analysis.wordsPerMinute}
                    </p>
                    <p className="text-xs text-muted-foreground">WPM</p>
                  </GlassCard>
                  
                  <GlassCard variant="dark" className="text-center py-3">
                    <AlertCircle className={`w-5 h-5 mx-auto mb-1 ${analysis.fillerWordCount > 3 ? 'text-amber-500' : 'text-emerald-500'}`} />
                    <p className={`text-lg font-bold ${analysis.fillerWordCount > 3 ? 'text-amber-500' : 'text-emerald-500'}`} data-testid="text-filler-count">
                      {analysis.fillerWordCount}
                    </p>
                    <p className="text-xs text-muted-foreground">Fillers</p>
                  </GlassCard>
                </div>

                {/* Pace Feedback */}
                <GlassCard variant="dark">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-blue-500" />
                    Speaking Pace
                  </h3>
                  <p className={`text-sm ${getPaceColor(analysis.wordsPerMinute)}`} data-testid="text-pace-feedback">
                    {analysis.paceFeedback}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Target range: 120-150 WPM
                  </p>
                </GlassCard>

                {/* Filler Words */}
                {analysis.fillerWordCount > 0 && (
                  <GlassCard variant="dark">
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Filler Words Detected
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {analysis.detectedFillers.map((filler, i) => (
                        <Badge key={i} variant="outline" className="text-amber-500 border-amber-500/50">
                          {filler}
                        </Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Try to reduce filler words for more confident delivery
                    </p>
                  </GlassCard>
                )}

                {/* Voice Coaching Tips */}
                {analysis.voiceCoachingTips && analysis.voiceCoachingTips.length > 0 && (
                  <GlassCard variant="dark">
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Mic className="w-4 h-4 text-violet-500" />
                      Voice Coaching Tips
                    </h3>
                    <ul className="space-y-2">
                      {analysis.voiceCoachingTips.map((tip, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" />
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </GlassCard>
                )}
              </>
            )}

            {/* Tips */}
            <GlassCard variant="dark">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                Tips to Improve
              </h3>
              <ul className="space-y-2">
                {analysis.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </GlassCard>

            {/* Example Responses */}
            {analysis.exampleResponses.length > 0 && (
              <GlassCard variant="dark">
                <h3 className="font-semibold mb-3">Example Responses</h3>
                <div className="space-y-3">
                  {analysis.exampleResponses.map((example, i) => (
                    <p key={i} className="text-sm text-muted-foreground p-3 rounded-lg bg-muted/30">
                      "{example}"
                    </p>
                  ))}
                </div>
              </GlassCard>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={refreshPrompt} data-testid="button-try-another">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Another
              </Button>
              <Button className="flex-1" onClick={resetPractice} data-testid="button-done">
                Done
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
