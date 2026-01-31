import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ChevronLeft,
  Users,
  Plus,
  Globe,
  Lock,
  Crown,
  LogOut,
  UserPlus,
  Search,
  Loader2,
  X
} from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { Circle, User, CircleMember } from "@shared/schema";

interface CircleWithOwner extends Circle {
  owner?: User;
  memberCount?: number;
  isMember?: boolean;
}

interface CircleMemberWithUser {
  member: CircleMember;
  user: User;
}

export default function Circles() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCircle, setNewCircle] = useState({
    name: "",
    description: "",
    isPublic: false,
  });
  const [selectedCircle, setSelectedCircle] = useState<string | null>(null);

  const { data: myCircles = [], isLoading: loadingMyCircles } = useQuery<CircleWithOwner[]>({
    queryKey: ["/api/circles"],
  });

  const { data: publicCircles = [], isLoading: loadingPublic } = useQuery<CircleWithOwner[]>({
    queryKey: ["/api/circles/public"],
  });

  const { data: circleMembers = [] } = useQuery<CircleMemberWithUser[]>({
    queryKey: [`/api/circles/${selectedCircle}/members`],
    enabled: !!selectedCircle,
  });

  const createCircleMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      const res = await apiRequest("POST", "/api/circles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setShowCreateDialog(false);
      setNewCircle({ name: "", description: "", isPublic: false });
      toast({ title: "Circle created!" });
    },
    onError: () => {
      toast({ title: "Failed to create circle", variant: "destructive" });
    },
  });

  const joinCircleMutation = useMutation({
    mutationFn: async (circleId: string) => {
      const res = await apiRequest("POST", `/api/circles/${circleId}/join`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      toast({ title: "Joined circle!" });
    },
    onError: () => {
      toast({ title: "Failed to join circle", variant: "destructive" });
    },
  });

  const leaveCircleMutation = useMutation({
    mutationFn: async (circleId: string) => {
      const res = await apiRequest("DELETE", `/api/circles/${circleId}/leave`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/circles"] });
      setSelectedCircle(null);
      toast({ title: "Left circle" });
    },
    onError: () => {
      toast({ title: "Failed to leave circle", variant: "destructive" });
    },
  });

  const filteredPublicCircles = publicCircles.filter(
    (circle) =>
      !myCircles.some((mc) => mc.id === circle.id) &&
      (searchQuery === "" ||
        circle.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateCircle = () => {
    if (!newCircle.name.trim()) return;
    createCircleMutation.mutate(newCircle);
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
            <Link href="/community">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-page-title">Circles</h1>
              <p className="text-sm text-muted-foreground">
                Join or create friend groups
              </p>
            </div>
          </div>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-circle">
                <Plus className="w-4 h-4 mr-1" />
                New Circle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Circle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div>
                  <Label htmlFor="circle-name">Name</Label>
                  <Input
                    id="circle-name"
                    placeholder="e.g., Work Friends"
                    value={newCircle.name}
                    onChange={(e) =>
                      setNewCircle({ ...newCircle, name: e.target.value })
                    }
                    data-testid="input-circle-name"
                  />
                </div>
                <div>
                  <Label htmlFor="circle-description">Description</Label>
                  <Textarea
                    id="circle-description"
                    placeholder="What's this circle about?"
                    value={newCircle.description}
                    onChange={(e) =>
                      setNewCircle({ ...newCircle, description: e.target.value })
                    }
                    data-testid="input-circle-description"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    id="circle-public"
                    checked={newCircle.isPublic}
                    onCheckedChange={(checked) =>
                      setNewCircle({ ...newCircle, isPublic: checked })
                    }
                    data-testid="switch-circle-public"
                  />
                  <Label htmlFor="circle-public" className="flex items-center gap-2">
                    {newCircle.isPublic ? (
                      <><Globe className="w-4 h-4" /> Public</>
                    ) : (
                      <><Lock className="w-4 h-4" /> Private</>
                    )}
                  </Label>
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateCircle}
                  disabled={createCircleMutation.isPending || !newCircle.name.trim()}
                  data-testid="button-submit-circle"
                >
                  {createCircleMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Create Circle
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* My Circles */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            My Circles
          </h2>
          
          {loadingMyCircles ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : myCircles.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <Users className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-circles">
                You haven't joined any circles yet.
                Create one or join a public circle below!
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {myCircles.map((circle) => (
                  <motion.div
                    key={circle.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <GlassCard
                      className={cn(
                        "p-4 cursor-pointer transition-all",
                        selectedCircle === circle.id && "ring-1 ring-primary/30"
                      )}
                      onClick={() =>
                        setSelectedCircle(
                          selectedCircle === circle.id ? null : circle.id
                        )
                      }
                      data-testid={`circle-${circle.id}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-medium">{circle.name}</span>
                            <Badge variant="outline" className="text-xs py-0">
                              {circle.isPublic ? (
                                <><Globe className="w-3 h-3 mr-1" /> Public</>
                              ) : (
                                <><Lock className="w-3 h-3 mr-1" /> Private</>
                              )}
                            </Badge>
                          </div>
                          {circle.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {circle.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {circle.memberCount || 1} member{(circle.memberCount || 1) !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      {selectedCircle === circle.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          className="mt-4 pt-4 border-t border-border/50"
                        >
                          <div className="flex flex-wrap gap-2 mb-4">
                            {circleMembers.map(({ user }) => (
                              <div
                                key={user.id}
                                className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                              >
                                <Avatar className="w-6 h-6">
                                  <AvatarImage src={user.profileImageUrl || ""} />
                                  <AvatarFallback>
                                    {(user.firstName || user.email || "U")[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">
                                  {user.firstName || user.email?.split("@")[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                leaveCircleMutation.mutate(circle.id);
                              }}
                              disabled={leaveCircleMutation.isPending}
                              data-testid={`button-leave-${circle.id}`}
                            >
                              <LogOut className="w-4 h-4 mr-1" />
                              Leave
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Discover Public Circles */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Globe className="w-5 h-5 text-primary" />
            Discover Public Circles
          </h2>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search public circles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-circles"
            />
            {searchQuery && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery("")}
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {loadingPublic ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPublicCircles.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <p className="text-muted-foreground text-sm">
                {searchQuery
                  ? "No circles match your search"
                  : "No public circles available"}
              </p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {filteredPublicCircles.map((circle) => (
                <GlassCard key={circle.id} className="p-4" data-testid={`public-circle-${circle.id}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium">{circle.name}</span>
                        {circle.owner && (
                          <Badge variant="outline" className="text-xs py-0">
                            <Crown className="w-3 h-3 mr-1" />
                            {circle.owner.firstName || circle.owner.email?.split("@")[0]}
                          </Badge>
                        )}
                      </div>
                      {circle.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {circle.description}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => joinCircleMutation.mutate(circle.id)}
                      disabled={joinCircleMutation.isPending}
                      data-testid={`button-join-${circle.id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Join
                    </Button>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
