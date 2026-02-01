import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { InteractiveGlassCard } from "@/components/InteractiveGlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Trophy,
  Users,
  Target,
  Clock,
  Sparkles,
  Plus,
  Medal,
  Crown,
  Loader2,
  CheckCircle2,
  Flame,
  Zap,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatDistanceToNow, format, differenceInDays, differenceInHours } from "date-fns";
import type { CircleChallenge, Circle, CircleChallengeProgress, User } from "@shared/schema";

interface ChallengeWithContext {
  challenge: CircleChallenge;
  circle: Circle;
  userProgress: CircleChallengeProgress | null;
  isJoined: boolean;
}

interface LeaderboardEntry {
  user: User;
  progress: CircleChallengeProgress;
}

export default function CircleChallenges() {
  const { toast } = useToast();
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedCircleForCreate, setSelectedCircleForCreate] = useState<string>("");
  const [newChallenge, setNewChallenge] = useState({
    title: "",
    description: "",
    goal: 10,
    goalType: "practices",
    rewardXp: 100,
    rewardPp: 50,
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  });

  const { data: activeChallenges = [], isLoading } = useQuery<ChallengeWithContext[]>({
    queryKey: ["/api/circle-challenges/active"],
  });

  const { data: myCircles = [] } = useQuery<{ circle: Circle; memberCount: number }[]>({
    queryKey: ["/api/circles"],
  });

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/circle-challenges", selectedChallenge, "leaderboard"],
    enabled: !!selectedChallenge,
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const res = await apiRequest("POST", `/api/circle-challenges/${challengeId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circle-challenges/active"] });
      toast({ title: "Joined challenge!" });
    },
    onError: () => {
      toast({ title: "Failed to join challenge", variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newChallenge & { circleId: string }) => {
      const res = await apiRequest("POST", `/api/circles/${data.circleId}/challenges`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circle-challenges/active"] });
      setShowCreateDialog(false);
      setNewChallenge({
        title: "",
        description: "",
        goal: 10,
        goalType: "practices",
        rewardXp: 100,
        rewardPp: 50,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      });
      toast({ title: "Challenge created!" });
    },
    onError: () => {
      toast({ title: "Failed to create challenge", variant: "destructive" });
    },
  });

  const getTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const end = new Date(endDate);
    const daysLeft = differenceInDays(end, now);
    const hoursLeft = differenceInHours(end, now) % 24;

    if (daysLeft > 0) {
      return `${daysLeft}d ${hoursLeft}h left`;
    } else if (hoursLeft > 0) {
      return `${hoursLeft}h left`;
    } else {
      return "Ending soon";
    }
  };

  const getGoalTypeIcon = (goalType: string) => {
    switch (goalType) {
      case "practices":
        return <Target className="w-4 h-4" />;
      case "xp":
        return <Zap className="w-4 h-4" />;
      case "streak_days":
        return <Flame className="w-4 h-4" />;
      default:
        return <Trophy className="w-4 h-4" />;
    }
  };

  const getGoalTypeLabel = (goalType: string) => {
    switch (goalType) {
      case "practices":
        return "Practices";
      case "xp":
        return "XP";
      case "streak_days":
        return "Streak Days";
      default:
        return goalType;
    }
  };

  const handleCreateChallenge = () => {
    if (!selectedCircleForCreate || !newChallenge.title.trim()) return;
    createMutation.mutate({
      ...newChallenge,
      circleId: selectedCircleForCreate,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/journey">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Circle Challenges</h1>
              <p className="text-sm text-muted-foreground">
                Compete with your circles
              </p>
            </div>
          </div>

          {myCircles.length > 0 && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm" data-testid="button-create-challenge">
                  <Plus className="w-4 h-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create Circle Challenge</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="circle">Circle</Label>
                    <Select value={selectedCircleForCreate} onValueChange={setSelectedCircleForCreate}>
                      <SelectTrigger data-testid="select-circle">
                        <SelectValue placeholder="Select a circle" />
                      </SelectTrigger>
                      <SelectContent>
                        {myCircles.map(({ circle }) => (
                          <SelectItem key={circle.id} value={circle.id}>
                            {circle.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="title">Challenge Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Weekly Practice Sprint"
                      value={newChallenge.title}
                      onChange={(e) =>
                        setNewChallenge({ ...newChallenge, title: e.target.value })
                      }
                      data-testid="input-challenge-title"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the challenge..."
                      value={newChallenge.description}
                      onChange={(e) =>
                        setNewChallenge({ ...newChallenge, description: e.target.value })
                      }
                      data-testid="input-challenge-description"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="goalType">Goal Type</Label>
                      <Select
                        value={newChallenge.goalType}
                        onValueChange={(v) =>
                          setNewChallenge({ ...newChallenge, goalType: v })
                        }
                      >
                        <SelectTrigger data-testid="select-goal-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="practices">Practices</SelectItem>
                          <SelectItem value="xp">XP Earned</SelectItem>
                          <SelectItem value="streak_days">Streak Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="goal">Target</Label>
                      <Input
                        id="goal"
                        type="number"
                        min={1}
                        value={newChallenge.goal}
                        onChange={(e) =>
                          setNewChallenge({ ...newChallenge, goal: parseInt(e.target.value) || 1 })
                        }
                        data-testid="input-goal"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rewardXp">XP Reward</Label>
                      <Input
                        id="rewardXp"
                        type="number"
                        min={0}
                        value={newChallenge.rewardXp}
                        onChange={(e) =>
                          setNewChallenge({ ...newChallenge, rewardXp: parseInt(e.target.value) || 0 })
                        }
                        data-testid="input-reward-xp"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rewardPp">PP Reward</Label>
                      <Input
                        id="rewardPp"
                        type="number"
                        min={0}
                        value={newChallenge.rewardPp}
                        onChange={(e) =>
                          setNewChallenge({ ...newChallenge, rewardPp: parseInt(e.target.value) || 0 })
                        }
                        data-testid="input-reward-pp"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={newChallenge.startDate}
                        onChange={(e) =>
                          setNewChallenge({ ...newChallenge, startDate: e.target.value })
                        }
                        data-testid="input-start-date"
                      />
                    </div>
                    <div>
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={newChallenge.endDate}
                        onChange={(e) =>
                          setNewChallenge({ ...newChallenge, endDate: e.target.value })
                        }
                        data-testid="input-end-date"
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateChallenge}
                    disabled={createMutation.isPending || !selectedCircleForCreate || !newChallenge.title.trim()}
                    data-testid="button-submit-challenge"
                  >
                    {createMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Create Challenge
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeChallenges.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Active Challenges</h3>
            <p className="text-sm text-muted-foreground mb-4" data-testid="text-no-challenges">
              {myCircles.length === 0
                ? "Join a circle to participate in challenges!"
                : "Create a challenge for your circle or wait for others to create one."}
            </p>
            {myCircles.length === 0 && (
              <Link href="/circles">
                <Button variant="outline" data-testid="button-join-circle">
                  <Users className="w-4 h-4 mr-2" />
                  Find Circles
                </Button>
              </Link>
            )}
          </GlassCard>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {activeChallenges.map(({ challenge, circle, userProgress, isJoined }) => (
                <motion.div
                  key={challenge.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <InteractiveGlassCard
                    className={`p-4 ${
                      selectedChallenge === challenge.id ? "ring-1 ring-primary/30" : ""
                    }`}
                    onClick={() =>
                      setSelectedChallenge(
                        selectedChallenge === challenge.id ? null : challenge.id
                      )
                    }
                    data-testid={`challenge-${challenge.id}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold">{challenge.title}</span>
                          {userProgress?.completed && (
                            <Badge variant="default" className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Users className="w-3 h-3" />
                          <span>{circle.name}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          <Clock className="w-3 h-3 mr-1" />
                          {getTimeRemaining(challenge.endDate)}
                        </Badge>
                      </div>
                    </div>

                    {challenge.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {challenge.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        {getGoalTypeIcon(challenge.goalType)}
                        <span>
                          {challenge.goal} {getGoalTypeLabel(challenge.goalType)}
                        </span>
                      </div>
                      {(challenge.rewardXp || challenge.rewardPp) && (
                        <div className="flex items-center gap-2 text-sm text-amber-400">
                          <Sparkles className="w-4 h-4" />
                          <span>
                            {challenge.rewardXp ? `${challenge.rewardXp} XP` : ""}
                            {challenge.rewardXp && challenge.rewardPp ? " + " : ""}
                            {challenge.rewardPp ? `${challenge.rewardPp} PP` : ""}
                          </span>
                        </div>
                      )}
                    </div>

                    {isJoined && userProgress ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Your Progress</span>
                          <span className="font-medium">
                            {userProgress.progress ?? 0} / {challenge.goal}
                          </span>
                        </div>
                        <Progress
                          value={Math.min(((userProgress.progress ?? 0) / challenge.goal) * 100, 100)}
                          className="h-2"
                        />
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          joinMutation.mutate(challenge.id);
                        }}
                        disabled={joinMutation.isPending}
                        data-testid={`button-join-${challenge.id}`}
                      >
                        {joinMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                          <Trophy className="w-4 h-4 mr-1" />
                        )}
                        Join Challenge
                      </Button>
                    )}

                    {selectedChallenge === challenge.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        className="mt-4 pt-4 border-t border-border/50"
                      >
                        <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                          <Medal className="w-4 h-4 text-amber-400" />
                          Leaderboard
                        </h4>
                        {leaderboard.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            No participants yet. Be the first to join!
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {leaderboard.map((entry, index) => (
                              <div
                                key={entry.user.id}
                                className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                                data-testid={`leaderboard-entry-${entry.user.id}`}
                              >
                                <div className="w-6 h-6 flex items-center justify-center">
                                  {index === 0 ? (
                                    <Crown className="w-5 h-5 text-amber-400" />
                                  ) : index === 1 ? (
                                    <Medal className="w-5 h-5 text-gray-300" />
                                  ) : index === 2 ? (
                                    <Medal className="w-5 h-5 text-amber-600" />
                                  ) : (
                                    <span className="text-sm text-muted-foreground">{index + 1}</span>
                                  )}
                                </div>
                                <Avatar className="w-7 h-7">
                                  <AvatarImage src={entry.user.profileImageUrl || ""} />
                                  <AvatarFallback>
                                    {(entry.user.firstName || entry.user.email || "U")[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="flex-1 text-sm truncate">
                                  {entry.user.firstName || entry.user.email?.split("@")[0]}
                                </span>
                                <div className="flex items-center gap-1 text-sm">
                                  <span className="font-medium">{entry.progress.progress}</span>
                                  <span className="text-muted-foreground">/ {challenge.goal}</span>
                                </div>
                                {entry.progress.completed && (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>
                            {format(new Date(challenge.startDate), "MMM d")} -{" "}
                            {format(new Date(challenge.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </InteractiveGlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
