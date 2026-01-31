import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, BookOpen, Star, X } from "lucide-react";

interface LoreModalProps {
  itemId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

interface ItemLore {
  id: string;
  name: string;
  description: string;
  rarity: string;
  loreOrigin: string | null;
  loreFlavor: string | null;
  loreCollection: string | null;
}

const RARITY_COLORS: Record<string, string> = {
  common: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  legendary: "bg-amber-500/20 text-amber-300 border-amber-500/30",
};

const RARITY_GLOW: Record<string, string> = {
  common: "",
  rare: "shadow-blue-500/20",
  epic: "shadow-purple-500/30",
  legendary: "shadow-amber-500/40",
};

export function LoreModal({ itemId, isOpen, onClose }: LoreModalProps) {
  const { data: lore, isLoading } = useQuery<ItemLore>({
    queryKey: [`/api/cosmetics/${itemId}/lore`],
    enabled: !!itemId && isOpen,
  });

  const rarityColor = RARITY_COLORS[lore?.rarity || "common"];
  const rarityGlow = RARITY_GLOW[lore?.rarity || "common"];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={`max-w-md border-0 bg-black/90 backdrop-blur-xl shadow-2xl ${rarityGlow}`}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>Item Lore</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Star className="w-8 h-8 text-primary" />
            </motion.div>
          </div>
        ) : lore ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-pink-400 bg-clip-text text-transparent">
                {lore.name}
              </h3>
              <Badge className={rarityColor}>
                {lore.rarity?.toUpperCase() || "COMMON"}
              </Badge>
              {lore.loreCollection && (
                <p className="text-xs text-muted-foreground">
                  {lore.loreCollection} Collection
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                <p className="text-sm text-muted-foreground italic">
                  {lore.description}
                </p>
              </div>

              {lore.loreOrigin && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="space-y-2"
                >
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wider">
                    <BookOpen className="w-4 h-4" />
                    <span>Origin Story</span>
                  </div>
                  <div className="p-4 rounded-lg bg-gradient-to-br from-primary/10 to-pink-500/10 border border-primary/20">
                    <p className="text-sm leading-relaxed">{lore.loreOrigin}</p>
                  </div>
                </motion.div>
              )}

              {lore.loreFlavor && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center"
                >
                  <p className="text-sm italic text-primary/80">
                    "{lore.loreFlavor}"
                  </p>
                </motion.div>
              )}
            </div>

            <Button
              variant="outline"
              onClick={onClose}
              className="w-full"
              data-testid="button-close-lore"
            >
              Close
            </Button>
          </motion.div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No lore available for this item yet.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
