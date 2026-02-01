import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Users,
  UserPlus,
  Trophy,
  CircleDot,
  Check,
  X,
  Crown,
  Flame,
  ArrowLeft,
  Loader2,
  Mail,
  Plus,
} from "lucide-react";
import { Link } from "wouter";
import type { User, UserProgress, Friendship, Circle } from "@shared/schema";

function FriendsTab() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: friends = [], isLoading: friendsLoading } = useQuery<
    { friendship: Friendship; friend: User }[]
  >({
    queryKey: ["/api/friends"],
  });

  const { data: pending = [], isLoading: pendingLoading } = useQuery<
    { friendship: Friendship; user: User }[]
  >({
    queryKey: ["/api/friends/pending"],
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest("POST", "/api/friends/request", { email });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Friend request sent!" });
      setEmail("");
      setDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/friends/${id}/accept`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({ title: "Friend request accepted!" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/friends/${id}/reject`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends/pending"] });
      toast({ title: "Friend request rejected" });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/friends/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
      toast({ title: "Friend removed" });
    },
  });

  if (friendsLoading || pendingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-medium">Your Friends</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-friend">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Friend
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Friend</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="friend-email">Friend's Email</Label>
                <Input
                  id="friend-email"
                  type="email"
                  placeholder="friend@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-friend-email"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => sendRequestMutation.mutate(email)}
                disabled={!email || sendRequestMutation.isPending}
                data-testid="button-send-request"
              >
                {sendRequestMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Send Request
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {pending.length > 0 && (
        <GlassCard className="p-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-3">
            Pending Requests ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(({ friendship, user }) => (
              <div
                key={friendship.id}
                className="flex items-center justify-between gap-2 flex-wrap"
                data-testid={`pending-request-${friendship.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-green-500"
                    onClick={() => acceptMutation.mutate(friendship.id)}
                    data-testid={`button-accept-${friendship.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-red-500"
                    onClick={() => rejectMutation.mutate(friendship.id)}
                    data-testid={`button-reject-${friendship.id}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {friends.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No friends yet</p>
          <p className="text-sm text-muted-foreground">Add friends to see them here!</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {friends.map(({ friendship, friend }) => (
            <GlassCard
              key={friendship.id}
              className="p-4 flex items-center justify-between gap-2 flex-wrap"
              data-testid={`friend-${friend.id}`}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={friend.profileImageUrl || undefined} />
                  <AvatarFallback>
                    {friend.firstName?.[0] || friend.email?.[0]?.toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {friend.firstName} {friend.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{friend.email}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-muted-foreground"
                onClick={() => removeMutation.mutate(friendship.id)}
                data-testid={`button-remove-${friend.id}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function CirclesTab() {
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [circleName, setCircleName] = useState("");
  const [circleDescription, setCircleDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const { data: circles = [], isLoading } = useQuery<{ circle: Circle; memberCount: number }[]>({
    queryKey: ["/api/circles"],
  });

  const { data: publicCircles = [] } = useQuery<Circle[]>({
    queryKey: ["/api/circles/public"],
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/circles", {
        name: circleName,
        description: circleDescription,
        isPublic,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({ title: "Circle created!" });
      setCreateOpen(false);
      setCircleName("");
      setCircleDescription("");
      setIsPublic(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (circleId: string) => {
      const response = await apiRequest("POST", `/api/circles/${circleId}/join`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({ title: "Joined circle!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (circleId: string) => {
      const response = await apiRequest("DELETE", `/api/circles/${circleId}/leave`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({ title: "Left circle" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const myCircleIds = circles.map((c) => c.circle.id);
  const joinableCircles = publicCircles.filter((c) => !myCircleIds.includes(c.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-medium">Your Circles</h2>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-create-circle">
              <Plus className="w-4 h-4 mr-2" />
              Create Circle
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Circle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="circle-name">Name</Label>
                <Input
                  id="circle-name"
                  placeholder="My Circle"
                  value={circleName}
                  onChange={(e) => setCircleName(e.target.value)}
                  data-testid="input-circle-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="circle-description">Description</Label>
                <Input
                  id="circle-description"
                  placeholder="A group for..."
                  value={circleDescription}
                  onChange={(e) => setCircleDescription(e.target.value)}
                  data-testid="input-circle-description"
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="is-public">Public</Label>
                <Switch
                  id="is-public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                  data-testid="switch-public"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!circleName || createMutation.isPending}
                data-testid="button-submit-circle"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {circles.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <CircleDot className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No circles yet</p>
          <p className="text-sm text-muted-foreground">Create or join a circle to get started!</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {circles.map(({ circle, memberCount }) => (
            <GlassCard
              key={circle.id}
              className="p-4 flex items-center justify-between gap-2 flex-wrap"
              data-testid={`circle-${circle.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <CircleDot className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{circle.name}</p>
                    {circle.isPublic && (
                      <Badge variant="secondary" className="text-xs">
                        Public
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{memberCount} members</p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => leaveMutation.mutate(circle.id)}
                data-testid={`button-leave-${circle.id}`}
              >
                Leave
              </Button>
            </GlassCard>
          ))}
        </div>
      )}

      {joinableCircles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Public Circles</h3>
          {joinableCircles.map((circle) => (
            <GlassCard
              key={circle.id}
              className="p-4 flex items-center justify-between gap-2 flex-wrap"
              data-testid={`public-circle-${circle.id}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <CircleDot className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">{circle.name}</p>
                  <p className="text-xs text-muted-foreground">{circle.description}</p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => joinMutation.mutate(circle.id)}
                data-testid={`button-join-${circle.id}`}
              >
                Join
              </Button>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

function LeaderboardTab() {
  const [view, setView] = useState<"global" | "friends">("global");

  const { data: globalLeaderboard = [], isLoading: globalLoading } = useQuery<
    { user: User; progress: UserProgress }[]
  >({
    queryKey: ["/api/leaderboard"],
    enabled: view === "global",
  });

  const { data: friendsLeaderboard = [], isLoading: friendsLoading } = useQuery<
    { user: User; progress: UserProgress }[]
  >({
    queryKey: ["/api/leaderboard/friends"],
    enabled: view === "friends",
  });

  const isLoading = view === "global" ? globalLoading : friendsLoading;
  const leaderboard = view === "global" ? globalLeaderboard : friendsLeaderboard;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={view === "global" ? "default" : "outline"}
          onClick={() => setView("global")}
          data-testid="button-global-leaderboard"
        >
          Global
        </Button>
        <Button
          size="sm"
          variant={view === "friends" ? "default" : "outline"}
          onClick={() => setView("friends")}
          data-testid="button-friends-leaderboard"
        >
          Friends
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : leaderboard.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Trophy className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No data yet</p>
          {view === "friends" && (
            <p className="text-sm text-muted-foreground">Add friends to see their rankings!</p>
          )}
        </GlassCard>
      ) : (
        <div className="space-y-2">
          {leaderboard.map(({ user, progress }, index) => (
            <GlassCard
              key={user.id}
              className="p-4 flex items-center gap-4"
              data-testid={`leaderboard-${user.id}`}
            >
              <div className="w-8 text-center">
                {index === 0 ? (
                  <Crown className="w-6 h-6 text-yellow-500 mx-auto" />
                ) : index === 1 ? (
                  <span className="text-lg font-bold text-gray-400">2</span>
                ) : index === 2 ? (
                  <span className="text-lg font-bold text-amber-700">3</span>
                ) : (
                  <span className="text-lg font-medium text-muted-foreground">{index + 1}</span>
                )}
              </div>
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback>
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Level {progress.level}</span>
                  <span className="flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-500" />
                    {progress.currentStreak}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">{progress.totalXp?.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">XP</p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Social() {
  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-semibold">Social</h1>
        </div>

        <Tabs defaultValue="friends" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="friends" data-testid="tab-friends">
              <Users className="w-4 h-4 mr-2" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="circles" data-testid="tab-circles">
              <CircleDot className="w-4 h-4 mr-2" />
              Circles
            </TabsTrigger>
            <TabsTrigger value="leaderboard" data-testid="tab-leaderboard">
              <Trophy className="w-4 h-4 mr-2" />
              Leaderboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            <FriendsTab />
          </TabsContent>
          <TabsContent value="circles">
            <CirclesTab />
          </TabsContent>
          <TabsContent value="leaderboard">
            <LeaderboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
