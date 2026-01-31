import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Trophy,
  Timer,
  Users,
  Sparkles,
  Medal,
  Crown,
  Star,
  Zap,
  ArrowLeft,
  ChevronRight,
  Target,
  Gift,
} from "lucide-react";
import type { WeeklyTournament, User, TournamentParticipant } from "@shared/schema";

interface TournamentPrizes {
  first?: { xp: number; pp: number; badge: string };
  second?: { xp: number; pp: number; badge: string };
  third?: { xp: number; pp: number; badge: string };
}

interface LeaderboardEntry {
  user: User;
  participant: TournamentParticipant;
}

interface UserRankData {
  joined: boolean;
  rank?: number;
  totalParticipants?: number;
  score?: number;
  practiceCount?: number;
}

function CountdownTimer({ endDate }: { endDate: Date }) {
  const [timeLeft, setTimeLeft] = useState(getTimeRemaining(endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(endDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [endDate]);

  function getTimeRemaining(end: Date) {
    const total = new Date(end).getTime() - Date.now();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { total, days, hours, minutes, seconds };
  }

  if (timeLeft.total <= 0) {
    return <span className="text-destructive">Tournament ended</span>;
  }

  return (
    <div className="flex gap-2">
      {[
        { value: timeLeft.days, label: "D" },
        { value: timeLeft.hours, label: "H" },
        { value: timeLeft.minutes, label: "M" },
        { value: timeLeft.seconds, label: "S" },
      ].map((unit, i) => (
        <motion.div
          key={unit.label}
          className="flex flex-col items-center"
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
            <span className="text-lg font-bold text-amber-400">
              {unit.value.toString().padStart(2, "0")}
            </span>
          </div>
          <span className="text-xs text-muted-foreground mt-1">{unit.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5 text-yellow-400" />;
    case 2:
      return <Medal className="w-5 h-5 text-gray-400" />;
    case 3:
      return <Medal className="w-5 h-5 text-amber-600" />;
    default:
      return <span className="text-sm font-medium text-muted-foreground">#{rank}</span>;
  }
}

function LeaderboardItem({
  entry,
  rank,
  isCurrentUser,
}: {
  entry: LeaderboardEntry;
  rank: number;
  isCurrentUser: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: rank * 0.05 }}
      className={`flex items-center gap-3 p-3 rounded-lg ${
        isCurrentUser
          ? "bg-primary/10 border border-primary/30"
          : rank <= 3
          ? "bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20"
          : "bg-muted/30"
      }`}
      data-testid={`leaderboard-entry-${rank}`}
    >
      <div className="w-8 flex justify-center">{getRankIcon(rank)}</div>
      
      <Avatar className="w-10 h-10 border-2 border-muted">
        <AvatarImage src={entry.user.profileImageUrl || undefined} />
        <AvatarFallback className="bg-primary/20">
          {(entry.user.username || entry.user.firstName || "U").charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">
          {entry.user.username || entry.user.firstName || "Anonymous"}
          {isCurrentUser && <span className="text-xs text-primary ml-2">(You)</span>}
        </p>
        <p className="text-xs text-muted-foreground">
          {entry.participant.practiceCount || 0} practices
        </p>
      </div>
      
      <div className="text-right">
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="font-bold">{entry.participant.score || 0}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function WeeklyTournamentPage() {
  const { toast } = useToast();
  
  const { data: tournament, isLoading: tournamentLoading } = useQuery<WeeklyTournament | null>({
    queryKey: ["/api/tournaments/active"],
  });

  const { data: upcomingTournaments } = useQuery<WeeklyTournament[]>({
    queryKey: ["/api/tournaments/upcoming"],
  });

  const { data: leaderboard, isLoading: leaderboardLoading } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/tournaments", tournament?.id, "leaderboard"],
    enabled: !!tournament?.id,
  });

  const { data: userRank } = useQuery<UserRankData>({
    queryKey: ["/api/tournaments", tournament?.id, "my-rank"],
    enabled: !!tournament?.id,
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/tournaments/${tournament?.id}/join`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament?.id, "my-rank"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tournaments", tournament?.id, "leaderboard"] });
      toast({
        title: "Joined Tournament!",
        description: "Start practicing to earn points and climb the leaderboard!",
      });
    },
    onError: () => {
      toast({
        title: "Failed to join",
        description: "Could not join the tournament. Please try again.",
        variant: "destructive",
      });
    },
  });

  const prizes = tournament?.prizes as TournamentPrizes | undefined;

  if (tournamentLoading) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen pb-24 pt-4 px-4" data-testid="no-tournament">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <Link to="/journey">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 space-y-6"
        >
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
            <Trophy className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold">No Active Tournament</h1>
          <p className="text-muted-foreground max-w-sm mx-auto">
            Check back soon for the next weekly competition!
          </p>

          {upcomingTournaments && upcomingTournaments.length > 0 && (
            <div className="mt-8 space-y-4">
              <h2 className="font-semibold">Upcoming Tournaments</h2>
              {upcomingTournaments.map((t) => (
                <GlassCard key={t.id} variant="dark" className="text-left">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                      <Star className="w-6 h-6 text-violet-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium">{t.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Starts {new Date(t.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{t.theme}</Badge>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="weekly-tournament">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <Link to="/journey">
            <Button variant="ghost" size="sm" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="relative overflow-visible">
          <div className="absolute -top-6 left-1/2 -translate-x-1/2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>
          
          <div className="pt-8 text-center space-y-3">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
              {tournament.theme} Challenge
            </Badge>
            <h1 className="text-2xl font-bold">{tournament.title || tournament.name}</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {tournament.description}
            </p>
          </div>

          <div className="mt-6 flex justify-center">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2 flex items-center justify-center gap-1">
                <Timer className="w-3 h-3" />
                Time Remaining
              </p>
              <CountdownTimer endDate={new Date(tournament.endDate)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {userRank?.joined ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="dark" data-testid="user-rank-card">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/30 flex items-center justify-center border-2 border-primary/50">
                  <span className="text-xl font-bold">#{userRank.rank || "-"}</span>
                </div>
                <div>
                  <p className="font-semibold">Your Rank</p>
                  <p className="text-sm text-muted-foreground">
                    of {userRank.totalParticipants || 0} participants
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 justify-end">
                  <Zap className="w-5 h-5 text-amber-400" />
                  <span className="text-2xl font-bold">{userRank.score || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {userRank.practiceCount || 0} practices
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassCard variant="dark" className="text-center py-6">
            <Target className="w-10 h-10 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-2">Ready to Compete?</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Join this tournament and start earning points!
            </p>
            <Button
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              data-testid="button-join-tournament"
            >
              {joinMutation.isPending ? "Joining..." : "Join Tournament"}
            </Button>
          </GlassCard>
        </motion.div>
      )}

      {prizes && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-semibold text-lg mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-violet-400" />
            Prizes & Rewards
          </h2>
          <div className="grid grid-cols-3 gap-3">
            {[
              { place: "1st", data: prizes.first, color: "from-yellow-400 to-amber-500", icon: Crown },
              { place: "2nd", data: prizes.second, color: "from-gray-300 to-gray-400", icon: Medal },
              { place: "3rd", data: prizes.third, color: "from-amber-600 to-orange-600", icon: Medal },
            ].map((prize, i) => (
              <motion.div
                key={prize.place}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
              >
                <GlassCard variant="dark" className="text-center py-4" data-testid={`prize-${i + 1}`}>
                  <div className={`w-10 h-10 mx-auto rounded-full bg-gradient-to-br ${prize.color} flex items-center justify-center mb-2`}>
                    <prize.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{prize.place} Place</p>
                  {prize.data && (
                    <div className="space-y-1">
                      <p className="text-sm font-semibold">{prize.data.xp} XP</p>
                      <p className="text-xs text-pink-400">{prize.data.pp} PP</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {prize.data.badge}
                      </Badge>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {tournament.rules && tournament.rules.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard variant="dark">
            <h3 className="font-semibold mb-3">Rules</h3>
            <ul className="space-y-2">
              {tournament.rules.map((rule, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <ChevronRight className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                  {rule}
                </li>
              ))}
            </ul>
          </GlassCard>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            Leaderboard
          </h2>
          {leaderboard && (
            <Badge variant="outline">{leaderboard.length} players</Badge>
          )}
        </div>

        {leaderboardLoading ? (
          <div className="text-center py-8">
            <Sparkles className="w-8 h-8 text-primary mx-auto animate-pulse" />
            <p className="text-sm text-muted-foreground mt-2">Loading leaderboard...</p>
          </div>
        ) : leaderboard && leaderboard.length > 0 ? (
          <div className="space-y-2" data-testid="leaderboard">
            <AnimatePresence>
              {leaderboard.map((entry, index) => (
                <LeaderboardItem
                  key={entry.participant.id}
                  entry={entry}
                  rank={index + 1}
                  isCurrentUser={currentUser?.id === entry.user.id}
                />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <GlassCard variant="dark" className="text-center py-8">
            <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No participants yet</p>
            <p className="text-sm text-muted-foreground">Be the first to join!</p>
          </GlassCard>
        )}
      </motion.div>

      {userRank?.joined && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="pb-4"
        >
          <Link to="/">
            <Button className="w-full" size="lg" data-testid="button-practice-now">
              <Sparkles className="w-4 h-4 mr-2" />
              Practice Now to Earn Points
            </Button>
          </Link>
        </motion.div>
      )}
    </div>
  );
}
