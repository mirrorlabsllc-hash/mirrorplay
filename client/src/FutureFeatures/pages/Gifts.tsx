import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Gift, 
  ChevronLeft,
  Check,
  X,
  Inbox,
  Send,
  Clock,
  Sparkles,
  Image,
  Palette,
  Music,
  Quote,
  Star
} from "lucide-react";
import { Link } from "wouter";
import type { CosmeticItem, User, Gift as GiftType } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  backgrounds: Image,
  themes: Palette,
  sound_badges: Music,
  quotes: Quote,
  particle_effects: Star,
};

const statusColors: Record<string, string> = {
  pending: "text-amber-400 bg-amber-500/20",
  accepted: "text-emerald-400 bg-emerald-500/20",
  rejected: "text-red-400 bg-red-500/20",
};

// Categories to hide from display (3D avatar system deprecated)
const hiddenCategories = ["avatar_accessories"];

// Filter function to exclude hidden category gifts
const filterHiddenCategories = <T extends { item: { category: string } }>(gifts: T[] | undefined): T[] => {
  return gifts?.filter(g => !hiddenCategories.includes(g.item.category)) || [];
};

type ReceivedGift = { gift: GiftType; item: CosmeticItem; sender: User };
type SentGift = { gift: GiftType; item: CosmeticItem; recipient: User };

export default function Gifts() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");

  const { data: pendingGifts, isLoading: loadingPending } = useQuery<ReceivedGift[]>({
    queryKey: ["/api/gifts/pending"],
  });

  const { data: receivedGifts, isLoading: loadingReceived } = useQuery<ReceivedGift[]>({
    queryKey: ["/api/gifts/received"],
  });

  const { data: sentGifts, isLoading: loadingSent } = useQuery<SentGift[]>({
    queryKey: ["/api/gifts/sent"],
  });

  const acceptMutation = useMutation({
    mutationFn: async (giftId: string) => {
      const res = await apiRequest("POST", `/api/gifts/${giftId}/accept`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Gift accepted!",
        description: "The item has been added to your inventory",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to accept gift",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (giftId: string) => {
      const res = await apiRequest("POST", `/api/gifts/${giftId}/reject`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/received"] });
      toast({
        title: "Gift rejected",
        description: "The item has been returned to sender",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reject gift",
        variant: "destructive",
      });
    },
  });

  const renderGiftCard = (
    gift: GiftType, 
    item: CosmeticItem, 
    user: User, 
    isReceived: boolean, 
    showActions: boolean = false
  ) => {
    const Icon = categoryIcons[item.category] || Sparkles;
    return (
      <motion.div
        key={gift.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard variant="dark">
          <div className="flex gap-4">
            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center flex-shrink-0">
              {item.imageUrl ? (
                <img 
                  src={item.imageUrl} 
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <Icon className="w-8 h-8 text-muted-foreground" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="font-medium truncate">{item.name}</h3>
                <Badge className={statusColors[gift.status || "pending"]}>
                  {gift.status}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={user.profileImageUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {user.firstName?.[0] || user.email?.[0] || "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">
                  {isReceived ? "From" : "To"}: {user.firstName || user.email}
                </span>
              </div>

              {gift.message && (
                <p className="text-sm text-muted-foreground italic truncate">
                  "{gift.message}"
                </p>
              )}

              {showActions && (
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={() => acceptMutation.mutate(gift.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                    data-testid={`button-accept-gift-${gift.id}`}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectMutation.mutate(gift.id)}
                    disabled={acceptMutation.isPending || rejectMutation.isPending}
                    data-testid={`button-reject-gift-${gift.id}`}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </GlassCard>
      </motion.div>
    );
  };

  const isLoading = loadingPending || loadingReceived || loadingSent;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <Link to="/profile">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ChevronLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Gifts</h1>
          <p className="text-muted-foreground">
            {filterHiddenCategories(pendingGifts).length} pending
          </p>
        </div>
      </motion.div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-1" data-testid="tab-pending">
            <Clock className="w-4 h-4" />
            Pending
            {filterHiddenCategories(pendingGifts).length > 0 && (
              <Badge variant="secondary" className="ml-1">{filterHiddenCategories(pendingGifts).length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="flex items-center gap-1" data-testid="tab-received">
            <Inbox className="w-4 h-4" />
            Received
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-1" data-testid="tab-sent">
            <Send className="w-4 h-4" />
            Sent
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : pendingGifts && filterHiddenCategories(pendingGifts).length > 0 ? (
            filterHiddenCategories(pendingGifts).map(({ gift, item, sender }) => 
              renderGiftCard(gift, item, sender, true, true)
            )
          ) : (
            <GlassCard variant="dark" className="text-center py-12">
              <Gift className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No pending gifts</h3>
              <p className="text-muted-foreground">
                When friends send you gifts, they'll appear here
              </p>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="received" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : receivedGifts && filterHiddenCategories(receivedGifts).length > 0 ? (
            filterHiddenCategories(receivedGifts).map(({ gift, item, sender }) => 
              renderGiftCard(gift, item, sender, true, false)
            )
          ) : (
            <GlassCard variant="dark" className="text-center py-12">
              <Inbox className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No gifts received yet</h3>
              <p className="text-muted-foreground">
                All received gifts will appear here
              </p>
            </GlassCard>
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          ) : sentGifts && filterHiddenCategories(sentGifts).length > 0 ? (
            filterHiddenCategories(sentGifts).map(({ gift, item, recipient }) => 
              renderGiftCard(gift, item, recipient, false, false)
            )
          ) : (
            <GlassCard variant="dark" className="text-center py-12">
              <Send className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium mb-2">No gifts sent yet</h3>
              <p className="text-muted-foreground mb-4">
                Send gifts to friends from your inventory!
              </p>
              <Link to="/inventory">
                <Button data-testid="link-inventory">
                  <Gift className="w-4 h-4 mr-2" />
                  Go to Inventory
                </Button>
              </Link>
            </GlassCard>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
