import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  GraduationCap,
  Users,
  UserPlus,
  Check,
  X,
  Star,
  MessageCircle,
  Loader2
} from "lucide-react";
import { Link } from "wouter";
import type { User, Mentorship } from "@shared/schema";

interface MentorshipWithUser extends Mentorship {
  mentor?: User;
  mentee?: User;
  mentorProgress?: { level: number; totalXp: number };
}

interface AvailableMentor {
  user: User;
  level: number;
  totalXp: number;
  feedbackCount: number;
}

export default function MentorshipPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("mentors");

  const { data: myMentorships = [], isLoading } = useQuery<MentorshipWithUser[]>({
    queryKey: ["/api/mentorship"],
  });

  const { data: availableMentors = [], isLoading: loadingMentors } = useQuery<AvailableMentor[]>({
    queryKey: ["/api/mentorship/available"],
  });

  const { data: pendingRequests = [] } = useQuery<MentorshipWithUser[]>({
    queryKey: ["/api/mentorship/pending"],
  });

  const requestMentorMutation = useMutation({
    mutationFn: async (mentorId: string) => {
      const res = await apiRequest("POST", "/api/mentorship/request", { mentorId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorship"] });
      toast({ title: "Mentorship request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async ({ mentorshipId, accept }: { mentorshipId: string; accept: boolean }) => {
      const res = await apiRequest("POST", `/api/mentorship/${mentorshipId}/respond`, { accept });
      return res.json();
    },
    onSuccess: (_, { accept }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mentorship"] });
      toast({ title: accept ? "Mentorship accepted!" : "Request declined" });
    },
    onError: () => {
      toast({ title: "Failed to respond", variant: "destructive" });
    },
  });

  const activeMentorships = myMentorships.filter(m => m.status === "active");
  const isMentoring = activeMentorships.filter(m => m.mentor);
  const beingMentored = activeMentorships.filter(m => m.mentee);

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
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Mentorship</h1>
            <p className="text-sm text-muted-foreground">
              Learn from or guide others
            </p>
          </div>
        </div>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <GlassCard className="p-4 mb-6 border-yellow-500/30">
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-yellow-400" />
              Pending Requests ({pendingRequests.length})
            </h3>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={request.mentee?.profileImageUrl || ""} />
                    <AvatarFallback>
                      {(request.mentee?.firstName || "U")[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">
                      {request.mentee?.firstName || request.mentee?.email?.split("@")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Wants you as their mentor
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-green-400"
                      onClick={() => respondMutation.mutate({ mentorshipId: request.id, accept: true })}
                      data-testid={`button-accept-${request.id}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-red-400"
                      onClick={() => respondMutation.mutate({ mentorshipId: request.id, accept: false })}
                      data-testid={`button-decline-${request.id}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="mentors" data-testid="tab-mentors">
              <GraduationCap className="w-4 h-4 mr-2" />
              Find Mentors
            </TabsTrigger>
            <TabsTrigger value="my" data-testid="tab-my">
              <Users className="w-4 h-4 mr-2" />
              My Mentorships
            </TabsTrigger>
          </TabsList>

          <TabsContent value="mentors">
            {loadingMentors ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : availableMentors.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <GraduationCap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No mentors available right now. Check back later!
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {availableMentors.map((mentor) => (
                  <GlassCard key={mentor.user.id} className="p-4" data-testid={`mentor-${mentor.user.id}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={mentor.user.profileImageUrl || ""} />
                        <AvatarFallback>
                          {(mentor.user.firstName || "M")[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium">
                          {mentor.user.firstName 
                            ? `${mentor.user.firstName} ${mentor.user.lastName || ""}`.trim()
                            : mentor.user.email?.split("@")[0]}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="py-0">
                            <Star className="w-3 h-3 mr-1" />
                            Level {mentor.level}
                          </Badge>
                          <span>{mentor.feedbackCount} mentees helped</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => requestMentorMutation.mutate(mentor.user.id)}
                        disabled={requestMentorMutation.isPending}
                        data-testid={`button-request-${mentor.user.id}`}
                      >
                        Request
                      </Button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : activeMentorships.length === 0 ? (
              <GlassCard className="p-8 text-center">
                <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  No active mentorships. Find a mentor or wait for mentee requests!
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-6">
                {beingMentored.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">My Mentors</h3>
                    <div className="space-y-3">
                      {beingMentored.map((m) => (
                        <GlassCard key={m.id} className="p-4" data-testid={`my-mentor-${m.id}`}>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={m.mentor?.profileImageUrl || ""} />
                              <AvatarFallback>
                                {(m.mentor?.firstName || "M")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {m.mentor?.firstName || m.mentor?.email?.split("@")[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.feedbackCount || 0} feedback sessions
                              </p>
                            </div>
                            <Link href={`/messages`}>
                              <Button size="icon" variant="ghost">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                )}

                {isMentoring.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-3">My Mentees</h3>
                    <div className="space-y-3">
                      {isMentoring.map((m) => (
                        <GlassCard key={m.id} className="p-4" data-testid={`my-mentee-${m.id}`}>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={m.mentee?.profileImageUrl || ""} />
                              <AvatarFallback>
                                {(m.mentee?.firstName || "M")[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="font-medium">
                                {m.mentee?.firstName || m.mentee?.email?.split("@")[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {m.feedbackCount || 0} feedback sessions
                              </p>
                            </div>
                            <Link href={`/messages`}>
                              <Button size="icon" variant="ghost">
                                <MessageCircle className="w-4 h-4" />
                              </Button>
                            </Link>
                          </div>
                        </GlassCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
