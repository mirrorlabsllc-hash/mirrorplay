import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft,
  Gift,
  UserPlus,
  UserCheck,
  Star,
  Flame,
  Target,
  Award,
  Sparkles,
  Heart,
  Check,
  Loader2,
} from "lucide-react";
import type { User, UserProgress, CosmeticItem } from "@shared/schema";

interface UserProfileData {
  user: User;
  progress: UserProgress;
  badges: { badge: { id: string; name: string; icon: string; description: string } }[];
  isFriend: boolean;
  friendshipStatus: string | null;
}

interface InventoryItem {
  id: string;
  item: CosmeticItem;
}

export default function UserProfile() {
  const [, params] = useRoute("/user/:id");
  const userId = params?.id;
  const { toast } = useToast();
  const [showGiftDialog, setShowGiftDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);

  const { data: profile, isLoading } = useQuery<UserProfileData>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: myInventory } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
    enabled: showGiftDialog,
  });

  const addFriendMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/friends/request", { friendId: userId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId] });
      toast({ title: "Friend request sent!" });
    },
    onError: () => {
      toast({ title: "Failed to send request", variant: "destructive" });
    },
  });

  const sendGiftMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/gifts/send", {
        toUserId: userId,
        itemId,
        message: "A gift for you!",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      setShowGiftDialog(false);
      setSelectedItem(null);
      toast({ title: "Gift sent!", description: "Your friend will be notified" });
    },
    onError: () => {
      toast({ title: "Failed to send gift", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-muted-foreground mb-4">User not found</p>
        <Link to="/community">
          <Button variant="outline">Back to Community</Button>
        </Link>
      </div>
    );
  }

  const { user, progress, badges, isFriend, friendshipStatus } = profile;
  const xpToNextLevel = 100;
  const currentLevelXp = (progress?.totalXp || 0) % xpToNextLevel;
  const levelProgress = (currentLevelXp / xpToNextLevel) * 100;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="user-profile">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link to="/community">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-xl font-bold">Profile</h1>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard variant="glow" className="relative overflow-visible">
          <div className="flex items-center gap-4">
            <Avatar className="w-20 h-20 ring-2 ring-primary/30">
              <AvatarImage src={user.profileImageUrl || undefined} />
              <AvatarFallback className="text-2xl">
                {user.firstName?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1">
              <h2 className="text-xl font-bold">
                {user.firstName ? `${user.firstName} ${user.lastName || ""}`.trim() : "User"}
              </h2>
              
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="secondary" className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  Level {progress?.level || 1}
                </Badge>
              </div>
            </div>
          </div>

          <div className="absolute -right-2 -top-2">
            <ProgressRing 
              progress={levelProgress} 
              size={60} 
              strokeWidth={4}
              showPercentage={false}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold">{progress?.level || 1}</span>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      <motion.div 
        className="grid grid-cols-3 gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard variant="dark" className="text-center py-4">
          <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{progress?.currentStreak || 0}</p>
          <p className="text-xs text-muted-foreground">Day Streak</p>
        </GlassCard>
        
        <GlassCard variant="dark" className="text-center py-4">
          <Target className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{progress?.practiceCount || 0}</p>
          <p className="text-xs text-muted-foreground">Sessions</p>
        </GlassCard>
        
        <GlassCard variant="dark" className="text-center py-4">
          <Sparkles className="w-5 h-5 text-violet-400 mx-auto mb-1" />
          <p className="text-xl font-bold">{progress?.totalXp || 0}</p>
          <p className="text-xs text-muted-foreground">Total XP</p>
        </GlassCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex gap-3"
      >
        {!isFriend && friendshipStatus !== "pending" && (
          <Button 
            className="flex-1" 
            onClick={() => addFriendMutation.mutate()}
            disabled={addFriendMutation.isPending}
            data-testid="add-friend-button"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Friend
          </Button>
        )}
        
        {friendshipStatus === "pending" && (
          <Button className="flex-1" variant="secondary" disabled>
            <UserCheck className="w-4 h-4 mr-2" />
            Request Pending
          </Button>
        )}
        
        {isFriend && (
          <>
            <Button className="flex-1" variant="secondary" disabled>
              <UserCheck className="w-4 h-4 mr-2" />
              Friends
            </Button>
            <Button 
              onClick={() => setShowGiftDialog(true)}
              data-testid="send-gift-button"
            >
              <Gift className="w-4 h-4 mr-2" />
              Send Gift
            </Button>
          </>
        )}
      </motion.div>

      {badges && badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-3"
        >
          <h3 className="font-semibold">Achievements</h3>
          <div className="flex flex-wrap gap-2">
            {badges.slice(0, 6).map((b) => (
              <Badge key={b.badge.id} variant="secondary" className="py-1.5">
                <Award className="w-3 h-3 mr-1" />
                {b.badge.name}
              </Badge>
            ))}
            {badges.length > 6 && (
              <Badge variant="outline">+{badges.length - 6} more</Badge>
            )}
          </div>
        </motion.div>
      )}

      <Dialog open={showGiftDialog} onOpenChange={setShowGiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send a Gift</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an item from your inventory to send as a gift
            </p>
            
            {myInventory && myInventory.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto">
                {myInventory.map((inv) => (
                  <motion.div
                    key={inv.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedItem?.id === inv.id 
                        ? "border-primary bg-primary/10" 
                        : "border-muted hover:border-primary/50"
                    }`}
                    onClick={() => setSelectedItem(inv)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="aspect-square rounded-md bg-muted/30 flex items-center justify-center mb-2">
                      {inv.item.imageUrl ? (
                        <img 
                          src={inv.item.imageUrl} 
                          alt={inv.item.name}
                          className="w-full h-full object-cover rounded-md"
                        />
                      ) : (
                        <Sparkles className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm font-medium truncate">{inv.item.name}</p>
                    {selectedItem?.id === inv.id && (
                      <Check className="w-4 h-4 text-primary absolute top-2 right-2" />
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No items in inventory</p>
                <Link to="/marketplace">
                  <Button variant="outline" size="sm">
                    Visit Shop
                  </Button>
                </Link>
              </div>
            )}
            
            {selectedItem && (
              <Button 
                className="w-full"
                onClick={() => sendGiftMutation.mutate(selectedItem.item.id)}
                disabled={sendGiftMutation.isPending}
              >
                {sendGiftMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Gift className="w-4 h-4 mr-2" />
                )}
                Send Gift
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
