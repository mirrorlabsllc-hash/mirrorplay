import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  Calendar,
  Trophy,
  Flame,
  Star,
  Check,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";
import type { Challenge, ChallengeParticipant } from "@shared/schema";

type ChallengeWithStatus = Challenge & {
  isJoined: boolean;
  progress: number;
  completed: boolean;
};

function getChallengeIcon(type: string | null) {
  switch (type) {
    case "daily":
      return <Calendar className="w-5 h-5" />;
    case "weekly":
      return <Flame className="w-5 h-5" />;
    case "monthly":
      return <Trophy className="w-5 h-5" />;
    case "special":
      return <Star className="w-5 h-5" />;
    default:
      return <Target className="w-5 h-5" />;
  }
}

function getChallengeTypeColor(type: string | null) {
  switch (type) {
    case "daily":
      return "bg-blue-500/20 text-blue-400";
    case "weekly":
      return "bg-orange-500/20 text-orange-400";
    case "monthly":
      return "bg-purple-500/20 text-purple-400";
    case "special":
      return "bg-yellow-500/20 text-yellow-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

function getGoalTypeLabel(goalType: string | null) {
  switch (goalType) {
    case "practice_count":
      return "practices";
    case "min_score":
      return "high scores";
    case "streak_days":
      return "streak days";
    default:
      return "goal";
  }
}

function formatDate(date: Date | null) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function ChallengeCard({ challenge }: { challenge: ChallengeWithStatus }) {
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/challenges/${challenge.id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/challenges"] });
      toast({ title: "Joined challenge!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const progressPercent = challenge.goal ? Math.min((challenge.progress / challenge.goal) * 100, 100) : 0;

  return (
    <GlassCard
      className="p-5 space-y-4"
      data-testid={`challenge-${challenge.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${getChallengeTypeColor(challenge.type)}`}>
            {getChallengeIcon(challenge.type)}
          </div>
          <div>
            <h3 className="font-medium">{challenge.title}</h3>
            <p className="text-sm text-muted-foreground">{challenge.description}</p>
          </div>
        </div>
        <Badge variant="secondary" className={getChallengeTypeColor(challenge.type)}>
          {challenge.type}
        </Badge>
      </div>

      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1">
          <Target className="w-4 h-4" />
          {challenge.goal} {getGoalTypeLabel(challenge.goalType)}
        </span>
        <span className="flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-yellow-500" />
          {challenge.rewardXp} XP
        </span>
        {(challenge.rewardPp || 0) > 0 && (
          <span className="flex items-center gap-1">
            <span className="text-purple-400">+{challenge.rewardPp} PP</span>
          </span>
        )}
        <span>
          {formatDate(challenge.startDate)} - {formatDate(challenge.endDate)}
        </span>
      </div>

      {challenge.isJoined ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {challenge.progress} / {challenge.goal}
            </span>
          </div>
          <Progress value={progressPercent} className="h-2" />
          {challenge.completed && (
            <div className="flex items-center gap-2 text-green-500 text-sm">
              <Check className="w-4 h-4" />
              <span>Completed!</span>
            </div>
          )}
        </div>
      ) : (
        <Button
          className="w-full"
          onClick={() => joinMutation.mutate()}
          disabled={joinMutation.isPending}
          data-testid={`button-join-${challenge.id}`}
        >
          {joinMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Target className="w-4 h-4 mr-2" />
          )}
          Join Challenge
        </Button>
      )}
    </GlassCard>
  );
}

export default function Challenges() {
  const { data: challenges = [], isLoading } = useQuery<ChallengeWithStatus[]>({
    queryKey: ["/api/challenges"],
  });

  const activeChallenge = challenges.find((c) => !c.completed && c.type === "weekly") || 
                          challenges.find((c) => !c.completed);
  const isCompleted = activeChallenge?.completed;

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/journey">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold">Weekly Challenge</h1>
            <p className="text-sm text-muted-foreground">One focus, one goal</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : !activeChallenge ? (
          <GlassCard className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No active challenge</p>
            <p className="text-sm text-muted-foreground">Check back soon for a new weekly challenge!</p>
          </GlassCard>
        ) : (
          <ChallengeCard challenge={activeChallenge} />
        )}
      </div>
    </div>
  );
}
