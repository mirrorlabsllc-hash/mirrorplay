import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Crown, 
  Sparkles, 
  Palette,
  Image,
  Music,
  Quote,
  Star,
  Loader2,
  Check
} from "lucide-react";
import type { CosmeticItem, UserProgress } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  backgrounds: Image,
  themes: Palette,
  sound_badges: Music,
  quotes: Quote,
  particle_effects: Star,
};

// Categories to hide from the shop (3D avatar system deprecated)
const hiddenCategories = ["avatar_accessories"];

const rarityColors: Record<string, string> = {
  common: "text-muted-foreground bg-muted",
  rare: "text-blue-400 bg-blue-500/20",
  epic: "text-purple-400 bg-purple-500/20",
  legendary: "text-amber-400 bg-amber-500/20",
};

export default function Marketplace() {
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("all");

  const { data: items, isLoading: itemsLoading } = useQuery<CosmeticItem[]>({
    queryKey: ["/api/shop/items"],
  });

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: inventory } = useQuery<string[]>({
    queryKey: ["/api/inventory/ids"],
  });

  const purchaseMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const res = await apiRequest("POST", "/api/shop/purchase", { itemId });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory/ids"] });
      toast({
        title: "Purchase successful!",
        description: "Item added to your inventory",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Purchase failed",
        description: error.message || "Not enough Peace Points",
        variant: "destructive",
      });
    },
  });

  // Filter out hidden categories (3D avatar accessories deprecated)
  const visibleItems = items?.filter(item => !hiddenCategories.includes(item.category));
  
  const categories = visibleItems 
    ? ["all", ...Array.from(new Set(visibleItems.map(item => item.category)))]
    : ["all"];

  const filteredItems = visibleItems?.filter(item => 
    selectedCategory === "all" || item.category === selectedCategory
  );

  const isOwned = (itemId: string) => inventory?.includes(itemId);

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Customize your experience</p>
        </div>
        <GlassCard variant="dark" className="flex items-center gap-2 py-2 px-3">
          <Crown className="w-4 h-4 text-amber-500" />
          <span className="font-bold">{progress?.totalPp || 0}</span>
        </GlassCard>
      </motion.div>

      {/* Category Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hidden">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="shrink-0 capitalize"
            >
              {cat === "all" ? "All" : cat.replace(/_/g, " ")}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Items Grid */}
      <AnimatePresence mode="wait">
        {itemsLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredItems && filteredItems.length > 0 ? (
          <motion.div
            key={selectedCategory}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-2 gap-3"
          >
            {filteredItems.map((item, index) => {
              const owned = isOwned(item.id);
              const Icon = categoryIcons[item.category] || Sparkles;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard 
                    variant={owned ? "reflection" : "dark"} 
                    className={owned ? "opacity-75" : ""}
                  >
                    <div className="space-y-3">
                      {/* Icon / Preview */}
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

                      {/* Info */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Badge className={rarityColors[item.rarity || "common"]}>
                            {item.rarity}
                          </Badge>
                          {owned && (
                            <Badge variant="secondary" className="text-emerald-500">
                              <Check className="w-3 h-3 mr-1" />
                              Owned
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price / Buy */}
                      {!owned && (
                        <Button
                          className="w-full"
                          size="sm"
                          onClick={() => purchaseMutation.mutate(item.id)}
                          disabled={
                            purchaseMutation.isPending || 
                            (progress?.totalPp || 0) < item.price
                          }
                          data-testid={`button-buy-${item.id}`}
                        >
                          {purchaseMutation.isPending ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Crown className="w-3 h-3 mr-1" />
                              {item.price} PP
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <GlassCard variant="dark" className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No items available in this category</p>
          </GlassCard>
        )}
      </AnimatePresence>
    </div>
  );
}
