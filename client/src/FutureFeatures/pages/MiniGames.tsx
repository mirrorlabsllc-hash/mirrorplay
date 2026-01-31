import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Gamepad2,
  Brain,
  Zap,
  Heart,
  Trophy,
  Star,
  Gift,
  Sparkles,
  Clock,
  Target,
  CheckCircle2,
  X,
} from "lucide-react";
import confetti from "canvas-confetti";
import type { CosmeticItem } from "@shared/schema";

interface GameStatus {
  name: string;
  description: string;
  playsToday: number;
  maxPlays: number;
  canPlay: boolean;
}

interface MiniGamesStatus {
  games: {
    emotion_match: GameStatus;
    tone_challenge: GameStatus;
    empathy_ladder: GameStatus;
  };
  totalPlaysToday: number;
  totalMaxPlays: number;
  recentSessions: any[];
}

interface GameRewards {
  xp: number;
  pp: number;
  item: CosmeticItem | null;
}

type GameType = "emotion_match" | "tone_challenge" | "empathy_ladder";

const EMOTIONS = [
  { name: "Happy", color: "#FFD93D" },
  { name: "Sad", color: "#6BCBFF" },
  { name: "Angry", color: "#FF6B6B" },
  { name: "Calm", color: "#6BCB77" },
  { name: "Anxious", color: "#A855F7" },
  { name: "Surprised", color: "#FF9F43" },
  { name: "Confused", color: "#8B9DC3" },
  { name: "Hopeful", color: "#F368E0" },
];

const TONE_QUESTIONS = [
  {
    text: "I see what you mean...",
    correctTone: "Understanding",
    options: ["Dismissive", "Understanding", "Sarcastic", "Annoyed"],
  },
  {
    text: "That's an interesting perspective.",
    correctTone: "Open-minded",
    options: ["Condescending", "Open-minded", "Bored", "Critical"],
  },
  {
    text: "I appreciate you sharing that with me.",
    correctTone: "Grateful",
    options: ["Reluctant", "Grateful", "Indifferent", "Skeptical"],
  },
  {
    text: "Let me make sure I understand correctly...",
    correctTone: "Attentive",
    options: ["Doubtful", "Attentive", "Impatient", "Confused"],
  },
  {
    text: "That must have been really difficult for you.",
    correctTone: "Empathetic",
    options: ["Empathetic", "Dismissive", "Patronizing", "Curious"],
  },
  {
    text: "I hear what you're saying.",
    correctTone: "Validating",
    options: ["Bored", "Defensive", "Validating", "Skeptical"],
  },
  {
    text: "Could you tell me more about that?",
    correctTone: "Curious",
    options: ["Curious", "Demanding", "Suspicious", "Uninterested"],
  },
  {
    text: "I think we can find a solution together.",
    correctTone: "Collaborative",
    options: ["Controlling", "Collaborative", "Doubtful", "Passive"],
  },
  {
    text: "I respect your decision on this.",
    correctTone: "Supportive",
    options: ["Judgmental", "Resentful", "Supportive", "Indifferent"],
  },
  {
    text: "Thank you for your patience.",
    correctTone: "Appreciative",
    options: ["Apologetic", "Appreciative", "Sarcastic", "Formal"],
  },
];

const EMPATHY_SCENARIOS = [
  {
    situation: "Your friend says: 'I failed my exam and I feel terrible.'",
    options: [
      { text: "You'll do better next time!", score: 40 },
      { text: "That sucks. Want to study together for the next one?", score: 70 },
      { text: "I'm sorry you're feeling this way. Failing hurts. Would you like to talk about it?", score: 100 },
      { text: "Well, did you study enough?", score: 20 },
    ],
  },
  {
    situation: "A coworker seems stressed and quiet during a meeting.",
    options: [
      { text: "Ask them what's wrong in front of everyone", score: 30 },
      { text: "Ignore it - not your business", score: 20 },
      { text: "After the meeting, privately check in if they're okay", score: 100 },
      { text: "Tell them to cheer up", score: 40 },
    ],
  },
  {
    situation: "Your partner says: 'I don't feel heard in our conversations.'",
    options: [
      { text: "I always listen to you!", score: 20 },
      { text: "Can you give me an example?", score: 60 },
      { text: "I'm sorry. I want to understand - can you help me see what I'm missing?", score: 100 },
      { text: "That's not fair.", score: 10 },
    ],
  },
  {
    situation: "A friend cancels plans last minute.",
    options: [
      { text: "Fine. Whatever.", score: 20 },
      { text: "Is everything okay? No worries if you need to reschedule.", score: 100 },
      { text: "You always do this!", score: 10 },
      { text: "Okay, let me know when you're free.", score: 60 },
    ],
  },
  {
    situation: "Someone shares exciting news but you're having a bad day.",
    options: [
      { text: "That's nice...", score: 30 },
      { text: "Must be nice for you.", score: 10 },
      { text: "That's wonderful! I'm really happy for you!", score: 100 },
      { text: "Cool. Anyway, I'm having a rough day.", score: 40 },
    ],
  },
];

export default function MiniGames() {
  const { toast } = useToast();
  const [activeGame, setActiveGame] = useState<GameType | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [gameScore, setGameScore] = useState(0);
  const [gameStartTime, setGameStartTime] = useState<number>(0);
  const [showResults, setShowResults] = useState(false);
  const [gameRewards, setGameRewards] = useState<GameRewards | null>(null);

  const { data: status, isLoading } = useQuery<MiniGamesStatus>({
    queryKey: ["/api/mini-games/status"],
  });

  const startGameMutation = useMutation({
    mutationFn: async (gameType: GameType) => {
      const res = await apiRequest("POST", `/api/mini-games/${gameType}/start`, {});
      return res.json();
    },
    onSuccess: (data, gameType) => {
      setSessionId(data.session.id);
      setActiveGame(gameType);
      setGameScore(0);
      setGameStartTime(Date.now());
      setShowResults(false);
      setGameRewards(null);
    },
    onError: (error: any) => {
      toast({
        title: "Cannot Start Game",
        description: error.message || "Daily limit reached",
        variant: "destructive",
      });
    },
  });

  const completeGameMutation = useMutation({
    mutationFn: async ({ score, duration }: { score: number; duration: number }) => {
      const res = await apiRequest("POST", `/api/mini-games/${sessionId}/complete`, {
        score,
        duration,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setGameRewards(data.rewards);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: ["/api/mini-games/status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      
      if (data.rewards.item) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    },
  });

  const handleGameComplete = (finalScore: number) => {
    const duration = Math.floor((Date.now() - gameStartTime) / 1000);
    completeGameMutation.mutate({ score: finalScore, duration });
  };

  const exitGame = () => {
    setActiveGame(null);
    setSessionId(null);
    setShowResults(false);
    setGameRewards(null);
  };

  if (activeGame && !showResults) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" size="icon" onClick={exitGame} data-testid="button-exit-game">
            <X className="w-5 h-5" />
          </Button>
          <Badge variant="secondary">
            Score: {gameScore}
          </Badge>
        </div>
        
        {activeGame === "emotion_match" && (
          <EmotionMatchGame 
            onComplete={handleGameComplete}
            onScoreUpdate={setGameScore}
          />
        )}
        {activeGame === "tone_challenge" && (
          <ToneChallengeGame 
            onComplete={handleGameComplete}
            onScoreUpdate={setGameScore}
          />
        )}
        {activeGame === "empathy_ladder" && (
          <EmpathyLadderGame 
            onComplete={handleGameComplete}
            onScoreUpdate={setGameScore}
          />
        )}
      </div>
    );
  }

  if (showResults && gameRewards) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 flex flex-col items-center justify-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-sm space-y-6"
        >
          <GlassCard variant="glow" className="text-center p-6">
            <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Game Complete!</h2>
            <p className="text-4xl font-bold text-primary mb-4">{gameScore}/100</p>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">XP Earned</span>
                <Badge className="bg-blue-500">+{gameRewards.xp} XP</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Peace Points</span>
                <Badge className="bg-gradient-to-r from-pink-500 to-violet-500">+{gameRewards.pp} PP</Badge>
              </div>
              
              {gameRewards.item && (
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="mt-4 p-4 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center">
                      <Gift className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-yellow-400 font-medium">Item Unlocked!</p>
                      <p className="font-semibold">{gameRewards.item.name}</p>
                      <Badge variant="outline" className="text-xs mt-1">
                        {gameRewards.item.rarity}
                      </Badge>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </GlassCard>
          
          <Button 
            className="w-full" 
            size="lg"
            onClick={exitGame}
            data-testid="button-continue"
          >
            Continue
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="mini-games-page">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link to="/marketplace">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Mini-Games</h1>
          <p className="text-muted-foreground">Play games to earn cosmetic items</p>
        </div>
        <Badge variant="secondary">
          <Gamepad2 className="w-3 h-3 mr-1" />
          {status?.totalPlaysToday || 0}/{status?.totalMaxPlays || 6}
        </Badge>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="space-y-4">
          <GlassCard variant="dark" className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Gift className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Daily Rewards</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              Score high to unlock cosmetic items! Higher scores = rarer items.
            </p>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-muted-foreground">60+ Score</p>
                <p className="text-green-400 font-medium">Common</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-muted-foreground">80+ Score</p>
                <p className="text-blue-400 font-medium">Rare</p>
              </div>
              <div className="p-2 rounded-lg bg-muted/30">
                <p className="text-muted-foreground">95+ Score</p>
                <p className="text-purple-400 font-medium">Epic</p>
              </div>
            </div>
          </GlassCard>

          {status?.games && Object.entries(status.games).map(([gameType, game], index) => (
            <motion.div
              key={gameType}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard 
                variant="dark" 
                className={`hover-elevate ${!game.canPlay ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                    gameType === 'emotion_match' 
                      ? 'bg-gradient-to-br from-pink-500/30 to-red-500/30' 
                      : gameType === 'tone_challenge'
                      ? 'bg-gradient-to-br from-blue-500/30 to-cyan-500/30'
                      : 'bg-gradient-to-br from-green-500/30 to-emerald-500/30'
                  }`}>
                    {gameType === 'emotion_match' ? (
                      <Brain className="w-7 h-7 text-pink-400" />
                    ) : gameType === 'tone_challenge' ? (
                      <Zap className="w-7 h-7 text-blue-400" />
                    ) : (
                      <Heart className="w-7 h-7 text-green-400" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-semibold">{game.name}</h3>
                    <p className="text-sm text-muted-foreground">{game.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Progress 
                        value={(game.playsToday / game.maxPlays) * 100} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-muted-foreground">
                        {game.playsToday}/{game.maxPlays}
                      </span>
                    </div>
                  </div>
                  
                  <Button
                    size="sm"
                    disabled={!game.canPlay || startGameMutation.isPending}
                    onClick={() => startGameMutation.mutate(gameType as GameType)}
                    data-testid={`button-play-${gameType}`}
                  >
                    {game.canPlay ? 'Play' : 'Done'}
                  </Button>
                </div>
              </GlassCard>
            </motion.div>
          ))}

          {status?.recentSessions && status.recentSessions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-muted-foreground">Recent Games</h3>
              {status.recentSessions.slice(0, 5).map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard variant="dark" className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-muted/30 flex items-center justify-center">
                          {session.gameType === 'emotion_match' ? (
                            <Brain className="w-5 h-5 text-pink-400" />
                          ) : session.gameType === 'tone_challenge' ? (
                            <Zap className="w-5 h-5 text-blue-400" />
                          ) : (
                            <Heart className="w-5 h-5 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {session.gameType.split('_').map((w: string) => 
                              w.charAt(0).toUpperCase() + w.slice(1)
                            ).join(' ')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.duration ? `${session.duration}s` : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={session.score >= 80 ? "default" : "secondary"}>
                          {session.score}/100
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          +{session.rewardXp} XP
                        </p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function createShuffledCards() {
  const selectedEmotions = EMOTIONS.slice(0, 8);
  const cardPairs = [...selectedEmotions, ...selectedEmotions].map((emotion, index) => ({
    id: index,
    emotion,
    isFlipped: false,
    isMatched: false,
  }));
  
  for (let i = cardPairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cardPairs[i], cardPairs[j]] = [cardPairs[j], cardPairs[i]];
  }
  
  return cardPairs;
}

function EmotionMatchGame({ 
  onComplete, 
  onScoreUpdate 
}: { 
  onComplete: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}) {
  const [cards, setCards] = useState(() => createShuffledCards());
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [isChecking, setIsChecking] = useState(false);

  const handleCardClick = (cardId: number) => {
    if (isChecking) return;
    if (flippedCards.length >= 2) return;
    
    const clickedCard = cards.find(c => c.id === cardId);
    if (!clickedCard || clickedCard.isMatched) return;
    if (flippedCards.includes(cardId)) return;

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);
    
    setCards(prev => prev.map(card => 
      card.id === cardId ? { ...card, isFlipped: true } : card
    ));

    if (newFlipped.length === 2) {
      const currentMoves = moves + 1;
      setMoves(currentMoves);
      setIsChecking(true);
      
      const [firstId, secondId] = newFlipped;
      const firstCard = cards.find(c => c.id === firstId);
      const secondCard = cards.find(c => c.id === secondId);
      
      const isMatch = firstCard && secondCard && firstCard.emotion.name === secondCard.emotion.name;
      
      setTimeout(() => {
        if (isMatch) {
          setCards(prev => prev.map(card => 
            card.id === firstId || card.id === secondId 
              ? { ...card, isMatched: true } 
              : card
          ));
          setMatches(m => {
            const newMatches = m + 1;
            if (newMatches === 8) {
              const finalScore = Math.max(0, Math.min(100, 100 - (currentMoves * 3)));
              onScoreUpdate(finalScore);
              setTimeout(() => onComplete(finalScore), 500);
            }
            return newMatches;
          });
        } else {
          setCards(prev => prev.map(card => 
            card.id === firstId || card.id === secondId 
              ? { ...card, isFlipped: false } 
              : card
          ));
        }
        setFlippedCards([]);
        setIsChecking(false);
      }, 1000);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Matches: {matches}/8</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Moves: {moves}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <motion.button
            key={card.id}
            className={`aspect-square rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
              card.isFlipped || card.isMatched
                ? 'rotate-0'
                : 'bg-gradient-to-br from-muted/50 to-muted/30'
            }`}
            style={{
              backgroundColor: card.isFlipped || card.isMatched ? `${card.emotion.color}40` : undefined,
              borderColor: card.isFlipped || card.isMatched ? card.emotion.color : 'transparent',
              borderWidth: 2,
            }}
            onClick={() => handleCardClick(card.id)}
            whileTap={{ scale: 0.95 }}
            data-testid={`card-${card.id}`}
          >
            {(card.isFlipped || card.isMatched) && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="text-xs font-medium"
                style={{ color: card.emotion.color }}
              >
                {card.emotion.name}
              </motion.span>
            )}
            {!card.isFlipped && !card.isMatched && (
              <span className="text-muted-foreground">?</span>
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ToneChallengeGame({ 
  onComplete, 
  onScoreUpdate 
}: { 
  onComplete: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}) {
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [shuffledQuestions] = useState(() => 
    [...TONE_QUESTIONS].sort(() => Math.random() - 0.5)
  );

  const currentQuestion = shuffledQuestions[currentRound];

  const handleAnswer = (answer: string) => {
    if (showFeedback) return;
    
    setSelectedAnswer(answer);
    setShowFeedback(true);
    
    const isCorrect = answer === currentQuestion.correctTone;
    const newScore = isCorrect ? score + 10 : score;
    
    if (isCorrect) {
      setScore(newScore);
      onScoreUpdate(newScore);
    }
    
    setTimeout(() => {
      if (currentRound + 1 >= 10) {
        onComplete(newScore);
      } else {
        setCurrentRound(r => r + 1);
        setSelectedAnswer(null);
        setShowFeedback(false);
      }
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Round {currentRound + 1}/10</Badge>
        <Badge>Score: {score}</Badge>
      </div>
      
      <Progress value={(currentRound / 10) * 100} className="h-2" />
      
      <GlassCard variant="glow" className="p-6 text-center">
        <p className="text-xl italic mb-2">"{currentQuestion.text}"</p>
        <p className="text-sm text-muted-foreground">What tone does this convey?</p>
      </GlassCard>
      
      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.options.map((option) => {
          const isCorrect = option === currentQuestion.correctTone;
          const isSelected = selectedAnswer === option;
          
          return (
            <Button
              key={option}
              variant={showFeedback && isCorrect ? "default" : "outline"}
              className={`h-auto py-4 px-4 ${
                showFeedback && isSelected && !isCorrect 
                  ? 'border-red-500 bg-red-500/10' 
                  : ''
              } ${
                showFeedback && isCorrect 
                  ? 'border-green-500 bg-green-500/20' 
                  : ''
              }`}
              onClick={() => handleAnswer(option)}
              disabled={showFeedback}
              data-testid={`option-${option}`}
            >
              <span className="flex items-center gap-2">
                {showFeedback && isCorrect && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                {showFeedback && isSelected && !isCorrect && <X className="w-4 h-4 text-red-400" />}
                {option}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function EmpathyLadderGame({ 
  onComplete, 
  onScoreUpdate 
}: { 
  onComplete: (score: number) => void;
  onScoreUpdate: (score: number) => void;
}) {
  const [currentRound, setCurrentRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [shuffledScenarios] = useState(() => 
    [...EMPATHY_SCENARIOS].sort(() => Math.random() - 0.5)
  );

  const currentScenario = shuffledScenarios[currentRound];
  
  const [shuffledOptions, setShuffledOptions] = useState(() => 
    currentScenario.options.map((opt, idx) => ({ ...opt, originalIndex: idx }))
      .sort(() => Math.random() - 0.5)
  );

  const handleSelect = (optionIndex: number, score: number) => {
    if (showFeedback) return;
    
    setSelectedOption(optionIndex);
    setShowFeedback(true);
    
    const roundScore = Math.floor(score / 5);
    setTotalScore(t => {
      const newTotal = t + roundScore;
      onScoreUpdate(newTotal);
      return newTotal;
    });
    
    setTimeout(() => {
      if (currentRound + 1 >= 5) {
        onComplete(totalScore + roundScore);
      } else {
        const nextRound = currentRound + 1;
        const nextScenario = shuffledScenarios[nextRound];
        setShuffledOptions(
          nextScenario.options.map((opt, idx) => ({ ...opt, originalIndex: idx }))
            .sort(() => Math.random() - 0.5)
        );
        setCurrentRound(nextRound);
        setSelectedOption(null);
        setShowFeedback(false);
      }
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Badge variant="secondary">Scenario {currentRound + 1}/5</Badge>
        <Badge>Score: {totalScore}</Badge>
      </div>
      
      <Progress value={(currentRound / 5) * 100} className="h-2" />
      
      <GlassCard variant="glow" className="p-4">
        <p className="text-lg">{currentScenario.situation}</p>
      </GlassCard>
      
      <p className="text-sm text-muted-foreground text-center">
        Choose the most empathetic response:
      </p>
      
      <div className="space-y-3">
        {shuffledOptions.map((option, index) => {
          const isSelected = selectedOption === index;
          const isBest = option.score === 100;
          
          return (
            <motion.button
              key={index}
              className={`w-full p-4 rounded-xl text-left transition-all ${
                showFeedback && isBest
                  ? 'border-2 border-green-500 bg-green-500/20'
                  : showFeedback && isSelected && !isBest
                  ? 'border-2 border-yellow-500 bg-yellow-500/10'
                  : 'border border-muted bg-muted/10 hover-elevate'
              }`}
              onClick={() => handleSelect(index, option.score)}
              disabled={showFeedback}
              whileTap={{ scale: 0.98 }}
              data-testid={`empathy-option-${index}`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  showFeedback && isBest
                    ? 'bg-green-500 text-white'
                    : showFeedback && isSelected
                    ? 'bg-yellow-500 text-white'
                    : 'bg-muted/30'
                }`}>
                  {showFeedback && isBest ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : showFeedback && isSelected ? (
                    <span className="text-xs font-bold">{option.score}</span>
                  ) : (
                    <span className="text-xs">{index + 1}</span>
                  )}
                </div>
                <p className="flex-1">{option.text}</p>
              </div>
            </motion.button>
          );
        })}
      </div>
      
      {showFeedback && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center text-sm text-muted-foreground"
        >
          {selectedOption !== null && shuffledOptions[selectedOption].score === 100 
            ? "Excellent empathetic response!" 
            : "Good try! The green option shows deeper empathy."}
        </motion.div>
      )}
    </div>
  );
}
