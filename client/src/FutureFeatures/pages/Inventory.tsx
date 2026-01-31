import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Package, 
  Sparkles, 
  Palette,
  Image,
  Music,
  Quote,
  Star,
  Check,
  ChevronLeft,
  Gift,
  BookOpen
} from "lucide-react";
import { Link } from "wouter";
import { LoreModal } from "@/components/LoreModal";
import type { CosmeticItem } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  backgrounds: Image,
  themes: Palette,
  sound_badges: Music,
  quotes: Quote,
  particle_effects: Star,
};

// Categories to hide from display (3D avatar system deprecated)
const hiddenCategories = ["avatar_accessories"];

const rarityColors: Record<string, string> = {
  common: "text-muted-foreground bg-muted",
  rare: "text-blue-400 bg-blue-500/20",
  epic: "text-purple-400 bg-purple-500/20",
  legendary: "text-amber-400 bg-amber-500/20",
};

export default function Inventory() {
  const { toast } = useToast();
  const [giftDialogOpen, setGiftDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [giftMessage, setGiftMessage] = useState("");
  const [loreItemId, setLoreItemId] = useState<string | null>(null);

  const { data: inventory, isLoading } = useQuery<{ item: CosmeticItem }[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: equipped } = useQuery<{ category: string; itemId: string }[]>({
    queryKey: ["/api/inventory/equipped"],
  });

  const equipMutation = useMutation({
    mutationFn: async ({ itemId, category }: { itemId: string; category: string }) => {
      const res = await apiRequest("POST", "/api/inventory/equip", { itemId, category });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/equipped"] });
      toast({
        title: "Item equipped!",
        description: "Your customization has been applied",
      });
    },
  });

  const sendGiftMutation = useMutation({
    mutationFn: async ({ itemId, toUserEmail, message }: { itemId: string; toUserEmail: string; message?: string }) => {
      const res = await apiRequest("POST", "/api/gifts/send", { 
        itemId, 
        toUserEmail, 
        message,
        buyAndGift: false
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      queryClient.invalidateQueries({ queryKey: ["/api/gifts/sent"] });
      setGiftDialogOpen(false);
      setSelectedItem(null);
      setRecipientEmail("");
      setGiftMessage("");
      toast({
        title: "Gift sent!",
        description: "Your gift has been sent successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send gift",
        variant: "destructive",
      });
    },
  });

  const isEquipped = (itemId: string) => 
    equipped?.some(e => e.itemId === itemId);

  const groupedItems = inventory?.reduce((acc, { item }) => {
    // Skip hidden categories (3D avatar accessories deprecated)
    if (hiddenCategories.includes(item.category)) {
      return acc;
    }
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, CosmeticItem[]>) || {};

  // Count only visible items (excluding hidden categories)
  const visibleItemCount = inventory?.filter(({ item }) => !hiddenCategories.includes(item.category)).length || 0;

  const openGiftDialog = (item: CosmeticItem) => {
    setSelectedItem(item);
    setGiftDialogOpen(true);
  };

  const handleSendGift = () => {
    if (!selectedItem || !recipientEmail) return;
    sendGiftMutation.mutate({
      itemId: selectedItem.id,
      toUserEmail: recipientEmail,
      message: giftMessage || undefined,
    });
  };

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
        <div className="flex-1">
          <h1 className="text-2xl font-bold">My Inventory</h1>
          <p className="text-muted-foreground">
            {visibleItemCount} items collected
          </p>
        </div>
        <Link to="/gifts">
          <Button variant="outline" size="sm" data-testid="link-gifts">
            <Gift className="w-4 h-4 mr-2" />
            Gifts
          </Button>
        </Link>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : inventory && inventory.length > 0 ? (
        Object.entries(groupedItems).map(([category, items], catIndex) => {
          const Icon = categoryIcons[category] || Sparkles;
          return (
            <motion.div
              key={category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: catIndex * 0.1 }}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold flex items-center gap-2 capitalize">
                <Icon className="w-5 h-5 text-primary" />
                {category.replace(/_/g, " ")}
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                {items.map((item, index) => {
                  const itemEquipped = isEquipped(item.id);
                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <GlassCard variant={itemEquipped ? "glow" : "dark"}>
                        <div className="space-y-3">
                          <div className="w-full aspect-square rounded-lg bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                            {item.imageUrl ? (
                              <img 
                                src={item.imageUrl} 
                                alt={item.name}
                                className="w-full h-full object-cover rounded-lg"
                              />
                            ) : (
                              <Icon className="w-12 h-12 text-muted-foreground" />
                            )}
                          </div>

                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1 flex-wrap">
                              <Badge className={rarityColors[item.rarity || "common"]}>
                                {item.rarity}
                              </Badge>
                              {itemEquipped && (
                                <Badge variant="secondary" className="text-emerald-500">
                                  <Check className="w-3 h-3 mr-1" />
                                  Equipped
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium truncate">{item.name}</h3>
                          </div>

                          <div className="flex gap-2">
                            {!itemEquipped && (
                              <Button
                                className="flex-1"
                                size="sm"
                                variant="outline"
                                onClick={() => equipMutation.mutate({ itemId: item.id, category: item.category })}
                                disabled={equipMutation.isPending}
                                data-testid={`button-equip-${item.id}`}
                              >
                                Equip
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setLoreItemId(item.id)}
                              data-testid={`button-lore-${item.id}`}
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openGiftDialog(item)}
                              disabled={itemEquipped}
                              data-testid={`button-gift-${item.id}`}
                            >
                              <Gift className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          );
        })
      ) : (
        <GlassCard variant="dark" className="text-center py-12">
          <Package className="w-16 h-16 mx-auto mb-4 text-muted-foreground/50" />
          <h3 className="text-lg font-medium mb-2">No items yet</h3>
          <p className="text-muted-foreground mb-4">
            Visit the marketplace to get your first items!
          </p>
          <Link to="/marketplace">
            <Button data-testid="link-marketplace">
              <Sparkles className="w-4 h-4 mr-2" />
              Browse Shop
            </Button>
          </Link>
        </GlassCard>
      )}

      <Dialog open={giftDialogOpen} onOpenChange={setGiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Gift</DialogTitle>
            <DialogDescription>
              Send "{selectedItem?.name}" to a friend
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipient-email">Recipient Email</Label>
              <Input
                id="recipient-email"
                type="email"
                placeholder="friend@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                data-testid="input-recipient-email"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="gift-message">Message (optional)</Label>
              <Textarea
                id="gift-message"
                placeholder="Add a personal message..."
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                rows={3}
                data-testid="input-gift-message"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setGiftDialogOpen(false)}
              data-testid="button-cancel-gift"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSendGift}
              disabled={!recipientEmail || sendGiftMutation.isPending}
              data-testid="button-confirm-gift"
            >
              {sendGiftMutation.isPending ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Gift className="w-4 h-4 mr-2" />
              )}
              Send Gift
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LoreModal 
        itemId={loreItemId} 
        isOpen={!!loreItemId} 
        onClose={() => setLoreItemId(null)} 
      />
    </div>
  );
}
