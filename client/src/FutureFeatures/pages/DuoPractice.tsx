import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Users,
  UserPlus,
  MessageSquare,
  ChevronRight,
  Send,
  Clock,
  CheckCircle,
  AlertCircle,
  Trophy,
  ArrowLeft,
  RefreshCw,
  Loader2,
  Star,
  Sparkles,
} from "lucide-react";
import type { User, DuoSession, DuoMessage } from "@shared/schema";
import type { Scenario } from "@shared/scenarios";

interface DuoInvitation {
  session: DuoSession;
  host: User;
  scenario: Scenario;
}

interface ActiveDuoSession {
  session: DuoSession;
  partner: User;
  scenario: Scenario;
}

interface SessionDetails {
  session: DuoSession;
  messages: DuoMessage[];
  scenario: Scenario;
  host: User;
  partner: User;
  isHost: boolean;
}

export default function DuoPractice() {
  const [, setLocation] = useLocation();
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [response, setResponse] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { toast } = useToast();

  const { data: pendingInvitations, isLoading: loadingPending } = useQuery<DuoInvitation[]>({
    queryKey: ["/api/duo/pending"],
  });

  const { data: activeSessions, isLoading: loadingActive } = useQuery<ActiveDuoSession[]>({
    queryKey: ["/api/duo/active"],
  });

  const { data: duoScenarios } = useQuery<Scenario[]>({
    queryKey: ["/api/duo/scenarios"],
  });

  const { data: friends } = useQuery<User[]>({
    queryKey: ["/api/duo/friends"],
    enabled: showInviteForm,
  });

  const { data: sessionDetails, isLoading: loadingSession, refetch: refetchSession } = useQuery<SessionDetails>({
    queryKey: ["/api/duo", activeSessionId],
    enabled: !!activeSessionId,
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { partnerUserId: string; scenarioId: string }) => {
      return apiRequest("POST", "/api/duo/invite", data);
    },
    onSuccess: () => {
      toast({ title: "Invitation Sent", description: "Your partner will receive the invitation." });
      setShowInviteForm(false);
      setSelectedScenario(null);
      setSelectedFriend(null);
      queryClient.invalidateQueries({ queryKey: ["/api/duo/active"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to send invitation.", variant: "destructive" });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return apiRequest("POST", `/api/duo/${sessionId}/accept`);
    },
    onSuccess: (_, sessionId) => {
      toast({ title: "Invitation Accepted", description: "The practice session is now active!" });
      queryClient.invalidateQueries({ queryKey: ["/api/duo/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/duo/active"] });
      setActiveSessionId(sessionId);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to accept invitation.", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async (data: { message: string; role: string; phase: string }) => {
      const res = await apiRequest("POST", `/api/duo/${activeSessionId}/respond`, data);
      return res.json();
    },
    onSuccess: (result: any) => {
      setResponse("");
      refetchSession();
      toast({
        title: `Score: ${result.score}`,
        description: result.feedback,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to submit response.", variant: "destructive" });
    },
  });

  const completeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/duo/${activeSessionId}/complete`);
      return res.json();
    },
    onSuccess: (result: any) => {
      toast({
        title: "Session Completed!",
        description: `Both earned ${result.xpReward} XP. Great teamwork!`,
      });
      setActiveSessionId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/duo/active"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to complete session.", variant: "destructive" });
    },
  });

  const handleSendResponse = () => {
    if (!response.trim() || !sessionDetails) return;
    
    const currentPhase = sessionDetails.scenario?.phases?.[0]?.name || "Practice";
    const role = sessionDetails.isHost 
      ? (sessionDetails.scenario?.roleA || "Person A")
      : (sessionDetails.scenario?.roleB || "Person B");
    
    respondMutation.mutate({
      message: response.trim(),
      role,
      phase: currentPhase,
    });
  };

  if (activeSessionId && sessionDetails) {
    const isMyTurn = 
      (sessionDetails.isHost && sessionDetails.session.currentTurn === "host") ||
      (!sessionDetails.isHost && sessionDetails.session.currentTurn === "partner");
    
    const myRole = sessionDetails.isHost 
      ? (sessionDetails.scenario?.roleA || "Person A")
      : (sessionDetails.scenario?.roleB || "Person B");
    
    const partnerRole = sessionDetails.isHost 
      ? (sessionDetails.scenario?.roleB || "Person B")
      : (sessionDetails.scenario?.roleA || "Person A");

    return (
      <div className="min-h-screen pb-24 pt-4 px-4" data-testid="duo-session">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-4"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setActiveSessionId(null)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{sessionDetails.scenario?.title || "Duo Practice"}</h1>
            <p className="text-sm text-muted-foreground">
              You are: <span className="text-primary font-medium">{myRole}</span>
            </p>
          </div>
        </motion.div>

        <GlassCard className="mb-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-violet-500">
                <AvatarImage src={sessionDetails.host?.profileImageUrl || undefined} />
                <AvatarFallback>{sessionDetails.host?.firstName?.[0] || "H"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{sessionDetails.host?.firstName || "Host"}</p>
                <Badge variant="outline" className="text-xs">{sessionDetails.scenario?.roleA || "Person A"}</Badge>
              </div>
            </div>
            <div className="text-center">
              <Users className="w-5 h-5 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">vs</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium">{sessionDetails.partner?.firstName || "Partner"}</p>
                <Badge variant="outline" className="text-xs">{sessionDetails.scenario?.roleB || "Person B"}</Badge>
              </div>
              <Avatar className="h-10 w-10 border-2 border-pink-500">
                <AvatarImage src={sessionDetails.partner?.profileImageUrl || undefined} />
                <AvatarFallback>{sessionDetails.partner?.firstName?.[0] || "P"}</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </GlassCard>

        <GlassCard variant="dark" className="mb-4">
          <p className="text-sm text-muted-foreground">{sessionDetails.scenario?.context}</p>
        </GlassCard>

        <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
          <AnimatePresence>
            {sessionDetails.messages.map((msg, idx) => {
              const isMe = msg.userId === (sessionDetails.isHost ? sessionDetails.session.hostUserId : sessionDetails.session.partnerUserId);
              return (
                <motion.div
                  key={msg.id || idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[80%] ${isMe ? "bg-violet-500/20" : "bg-muted/50"} rounded-lg p-3`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">{msg.role}</Badge>
                      {msg.score && (
                        <Badge className="text-xs bg-amber-500/20 text-amber-300">
                          <Star className="w-3 h-3 mr-1" />{msg.score}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{msg.message}</p>
                    {msg.feedback && (
                      <p className="text-xs text-muted-foreground mt-2 italic">{msg.feedback}</p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {sessionDetails.session.status === "active" && (
          <div className="space-y-3">
            {isMyTurn ? (
              <>
                <div className="flex items-center gap-2 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-sm font-medium">Your turn to respond as {myRole}</span>
                </div>
                <Textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder={`Respond as ${myRole}...`}
                  className="min-h-[100px]"
                  data-testid="input-response"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleSendResponse}
                    disabled={!response.trim() || respondMutation.isPending}
                    className="flex-1"
                    data-testid="button-send"
                  >
                    {respondMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Send className="w-4 h-4 mr-2" />
                    )}
                    Send Response
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => refetchSession()}
                    data-testid="button-refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <GlassCard variant="dark" className="text-center py-6">
                <Clock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Waiting for {partnerRole} to respond...</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchSession()}
                  className="mt-2"
                  data-testid="button-refresh-waiting"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for updates
                </Button>
              </GlassCard>
            )}

            {sessionDetails.messages.length >= 4 && (
              <Button
                variant="outline"
                onClick={() => completeMutation.mutate()}
                disabled={completeMutation.isPending}
                className="w-full"
                data-testid="button-complete"
              >
                {completeMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trophy className="w-4 h-4 mr-2" />
                )}
                Complete Session
              </Button>
            )}
          </div>
        )}

        {sessionDetails.session.status === "completed" && (
          <GlassCard variant="glow" className="text-center">
            <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold mb-2">Session Completed!</h3>
            <div className="flex justify-center gap-4">
              <div>
                <p className="text-2xl font-bold text-violet-400">{sessionDetails.session.hostScore}</p>
                <p className="text-xs text-muted-foreground">Host Score</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-pink-400">{sessionDetails.session.partnerScore}</p>
                <p className="text-xs text-muted-foreground">Partner Score</p>
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="duo-practice">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Link href="/journey">
            <Button variant="ghost" size="icon" data-testid="button-back-hub">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Duo Practice</h1>
            <p className="text-muted-foreground">Practice with a partner</p>
          </div>
        </div>
      </motion.div>

      {pendingInvitations && pendingInvitations.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            Pending Invitations
          </h2>
          <div className="space-y-3">
            {pendingInvitations.map((inv) => (
              <GlassCard key={inv.session.id} className="hover-elevate">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={inv.host?.profileImageUrl || undefined} />
                    <AvatarFallback>{inv.host?.firstName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{inv.host?.firstName} invited you</p>
                    <p className="text-sm text-muted-foreground">{inv.scenario?.title}</p>
                  </div>
                  <Button
                    onClick={() => acceptMutation.mutate(inv.session.id)}
                    disabled={acceptMutation.isPending}
                    data-testid={`button-accept-${inv.session.id}`}
                  >
                    {acceptMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Accept
                  </Button>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}

      {activeSessions && activeSessions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-emerald-400" />
            Active Sessions
          </h2>
          <div className="space-y-3">
            {activeSessions.map((sess) => (
              <GlassCard
                key={sess.session.id}
                className="hover-elevate cursor-pointer"
                onClick={() => setActiveSessionId(sess.session.id)}
                data-testid={`card-session-${sess.session.id}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={sess.partner?.profileImageUrl || undefined} />
                    <AvatarFallback>{sess.partner?.firstName?.[0] || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">With {sess.partner?.firstName}</p>
                    <p className="text-sm text-muted-foreground">{sess.scenario?.title}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="w-full"
          variant={showInviteForm ? "outline" : "default"}
          data-testid="button-invite-toggle"
        >
          <UserPlus className="w-4 h-4 mr-2" />
          {showInviteForm ? "Cancel" : "Invite a Friend to Practice"}
        </Button>
      </motion.div>

      <AnimatePresence>
        {showInviteForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <GlassCard>
              <h3 className="font-semibold mb-3">1. Select a Scenario</h3>
              <div className="space-y-2">
                {duoScenarios?.map((scenario) => (
                  <div
                    key={scenario.id}
                    onClick={() => setSelectedScenario(scenario.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedScenario === scenario.id
                        ? "border-primary bg-primary/10"
                        : "border-border hover-elevate"
                    }`}
                    data-testid={`scenario-${scenario.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{scenario.title}</p>
                        <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      </div>
                      <Badge variant="outline">{scenario.category}</Badge>
                    </div>
                    {scenario.roleA && scenario.roleB && (
                      <div className="flex gap-2 mt-2">
                        <Badge className="bg-violet-500/20 text-violet-300">{scenario.roleA}</Badge>
                        <Badge className="bg-pink-500/20 text-pink-300">{scenario.roleB}</Badge>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>

            <GlassCard>
              <h3 className="font-semibold mb-3">2. Choose a Partner</h3>
              {friends && friends.length > 0 ? (
                <div className="space-y-2">
                  {friends.map((friend) => (
                    <div
                      key={friend.id}
                      onClick={() => setSelectedFriend(friend.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center gap-3 ${
                        selectedFriend === friend.id
                          ? "border-primary bg-primary/10"
                          : "border-border hover-elevate"
                      }`}
                      data-testid={`friend-${friend.id}`}
                    >
                      <Avatar>
                        <AvatarImage src={friend.profileImageUrl || undefined} />
                        <AvatarFallback>{friend.firstName?.[0] || "?"}</AvatarFallback>
                      </Avatar>
                      <p className="font-medium">{friend.firstName} {friend.lastName}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No friends yet. Add friends in the Community hub!</p>
                  <Link href="/social">
                    <Button variant="ghost" className="mt-2">Go to Social</Button>
                  </Link>
                </div>
              )}
            </GlassCard>

            <Button
              onClick={() => {
                if (selectedScenario && selectedFriend) {
                  inviteMutation.mutate({
                    partnerUserId: selectedFriend,
                    scenarioId: selectedScenario,
                  });
                }
              }}
              disabled={!selectedScenario || !selectedFriend || inviteMutation.isPending}
              className="w-full"
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Invitation
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {!showInviteForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" />
            Available Duo Scenarios
          </h2>
          <div className="space-y-3">
            {duoScenarios?.map((scenario) => (
              <GlassCard key={scenario.id} variant="dark">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{scenario.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{scenario.description}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <Badge variant="outline">{scenario.category}</Badge>
                      <Badge variant="outline">Level {scenario.requiredLevel}+</Badge>
                      {scenario.roleA && <Badge className="bg-violet-500/20 text-violet-300">{scenario.roleA}</Badge>}
                      {scenario.roleB && <Badge className="bg-pink-500/20 text-pink-300">{scenario.roleB}</Badge>}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </motion.div>
      )}

      {(loadingPending || loadingActive || loadingSession) && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
