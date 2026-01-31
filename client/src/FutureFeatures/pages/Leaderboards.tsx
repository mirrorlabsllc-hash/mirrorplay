import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  ChevronLeft,
  Trophy,
  Medal,
  Users,
  Globe,
  Crown,
  Flame,
  Star,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User, UserProgress, Circle } from "@shared/schema";

interface LeaderboardEntry {
  user: User;
  progress: UserProgress;
}

interface CircleWithOwner extends Circle {
  owner?: User;
}

type LeaderboardType = "global" | "friends" | "circle";

export default function Leaderboards() {
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>("global");
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);

  const { data: globalLeaderboard = [], isLoading: loadingGlobal } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
    enabled: leaderboardType === "global",
  });

  const { data: friendsLeaderboard = [], isLoading: loadingFriends } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard/friends"],
    enabled: leaderboardType === "friends",
  });

  const { data: myCircles = [] } = useQuery<CircleWithOwner[]>({
    queryKey: ["/api/circles"],
    enabled: leaderboardType === "circle",
  });

  const { data: circleLeaderboard = [], isLoading: loadingCircle } = useQuery<LeaderboardEntry[]>({
    queryKey: [`/api/leaderboard/circle/${selectedCircleId}`],
    enabled: leaderboardType === "circle" && !!selectedCircleId,
  });

  const currentLeaderboard = 
    leaderboardType === "global" ? globalLeaderboard :
    leaderboardType === "friends" ? friendsLeaderboard :
    circleLeaderboard;

  const isLoading = 
    (leaderboardType === "global" && loadingGlobal) ||
    (leaderboardType === "friends" && loadingFriends) ||
    (leaderboardType === "circle" && loadingCircle);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <span className="w-5 h-5 flex items-center justify-center text-sm text-muted-foreground">#{rank}</span>;
  };

  const getRankBg = (rank: number) => {
    if (rank === 1) return "bg-amber-500/10 border-amber-500/30";
    if (rank === 2) return "bg-gray-500/10 border-gray-500/30";
    if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
    return "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 p-4 pb-24">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl mx-auto"
      >
        <div className="flex items-center gap-2 mb-6">
          <Link href="/community">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Leaderboards</h1>
            <p className="text-sm text-muted-foreground">
              See who's leading in emotional intelligence
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <GlassCard className="p-2 mb-4">
          <div className="flex gap-2">
            <Button
              variant={leaderboardType === "global" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setLeaderboardType("global")}
              data-testid="button-filter-global"
            >
              <Globe className="w-4 h-4 mr-1" />
              Global
            </Button>
            <Button
              variant={leaderboardType === "friends" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setLeaderboardType("friends")}
              data-testid="button-filter-friends"
            >
              <Users className="w-4 h-4 mr-1" />
              Friends
            </Button>
            <Button
              variant={leaderboardType === "circle" ? "default" : "ghost"}
              size="sm"
              className="flex-1"
              onClick={() => setLeaderboardType("circle")}
              data-testid="button-filter-circle"
            >
              <Crown className="w-4 h-4 mr-1" />
              Circle
            </Button>
          </div>
        </GlassCard>

        {/* Circle Selector */}
        {leaderboardType === "circle" && (
          <div className="mb-4">
            <Select
              value={selectedCircleId || ""}
              onValueChange={setSelectedCircleId}
            >
              <SelectTrigger data-testid="select-circle">
                <SelectValue placeholder="Select a circle" />
              </SelectTrigger>
              <SelectContent>
                {myCircles.map((circle) => (
                  <SelectItem key={circle.id} value={circle.id}>
                    {circle.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Leaderboard */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : currentLeaderboard.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground" data-testid="text-empty-state">
              {leaderboardType === "friends"
                ? "Add friends to see them here!"
                : leaderboardType === "circle"
                ? selectedCircleId
                  ? "No members in this circle yet"
                  : "Select a circle to view its leaderboard"
                : "No users on the leaderboard yet"}
            </p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {currentLeaderboard.map((entry, index) => {
              const rank = index + 1;
              return (
                <motion.div
                  key={entry.user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/user/${entry.user.id}`}>
                    <GlassCard
                      className={cn(
                        "p-4 hover-elevate cursor-pointer",
                        getRankBg(rank)
                      )}
                      data-testid={`leaderboard-entry-${entry.user.id}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-shrink-0">
                          {getRankIcon(rank)}
                        </div>

                        <Avatar className="w-10 h-10">
                          <AvatarImage src={entry.user.profileImageUrl || ""} />
                          <AvatarFallback>
                            {(entry.user.firstName || entry.user.email || "U")[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {entry.user.firstName 
                              ? `${entry.user.firstName} ${entry.user.lastName || ""}`.trim()
                              : entry.user.email?.split("@")[0]}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="outline" className="py-0">
                              <Star className="w-3 h-3 mr-1" />
                              Level {entry.progress.level || 1}
                            </Badge>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {(entry.progress.totalXp || 0).toLocaleString()} XP
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
                            <Flame className="w-3 h-3 text-orange-400" />
                            {entry.progress.currentStreak || 0} day streak
                          </div>
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
