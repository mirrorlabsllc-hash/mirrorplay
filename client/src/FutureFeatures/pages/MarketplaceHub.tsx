import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { GlassCard } from "@/components/GlassCard";
import { EnergyMeter } from "@/components/EnergyMeter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ShoppingBag,
  Package,
  Zap,
  Sparkles,
  Gift,
  Crown,
  Star,
  ChevronRight,
  Heart,
  Loader2,
  Gamepad2,
} from "lucide-react";
import type { UserProgress, CosmeticItem } from "@shared/schema";

interface EventData {
  event: {
    id: string;
    name: string;
    description: string;
    theme: string;
    accentColor: string;
    endDate: string;
  };
  rewards: any[];
  userProgress: any;
}

const energyPackages = [
  { id: "small", name: "Energy Boost", energy: 25, price: 50, icon: Zap },
  { id: "medium", name: "Energy Pack", energy: 60, price: 100, icon: Zap },
  { id: "large", name: "Full Recharge", energy: 100, price: 150, icon: Sparkles },
];

export default function MarketplaceHub() {
  const { toast } = useToast();
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split("?")[1] || "");
  const defaultTab = searchParams.get("tab") || "shop";

  const { data: progress } = useQuery<UserProgress>({
    queryKey: ["/api/progress"],
  });

  const { data: shopItems } = useQuery<CosmeticItem[]>({
    queryKey: ["/api/cosmetics"],
  });

  const { data: inventory } = useQuery<any[]>({
    queryKey: ["/api/inventory"],
  });

  const { data: activeEvent } = useQuery<EventData>({
    queryKey: ["/api/events/active"],
  });

  const purchaseEnergyMutation = useMutation({
    mutationFn: async (packageId: string) => {
      const res = await apiRequest("POST", "/api/energy/purchase", { packageId });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
      toast({
        title: "Energy Purchased!",
        description: `Energy restored! New total: ${data.newEnergy}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Purchase Failed",
        description: error.message || "Not enough Peace Points",
        variant: "destructive",
      });
    },
  });

  const featuredItems = shopItems?.slice(0, 4) || [];
  const inventoryCount = inventory?.length || 0;
  const userPP = progress?.totalPp || 0;

  return (
    <div className="min-h-screen pb-24 pt-4 px-4 space-y-6" data-testid="marketplace-hub">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-muted-foreground">Spend your Peace Points</p>
        </div>
        <Badge className="bg-gradient-to-r from-pink-500 to-violet-500">
          <Heart className="w-3 h-3 mr-1" />
          {progress?.totalPp || 0} PP
        </Badge>
      </motion.div>

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="shop" data-testid="tab-shop">Shop</TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            Inventory
            {inventoryCount > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {inventoryCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="energy" data-testid="tab-energy">Energy</TabsTrigger>
        </TabsList>

        <TabsContent value="shop" className="space-y-4">
          {activeEvent?.event && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Link to={`/events/${activeEvent.event.id}`}>
                <GlassCard 
                  variant="glow" 
                  className="hover-elevate"
                  style={{ borderColor: activeEvent.event.accentColor }}
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${activeEvent.event.accentColor}30` }}
                    >
                      <Star className="w-6 h-6" style={{ color: activeEvent.event.accentColor }} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{activeEvent.event.name}</h3>
                      <p className="text-sm text-muted-foreground">Limited time event</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Featured Items</h2>
              <Link to="/marketplace/all">
                <Button variant="ghost" size="sm">View all</Button>
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {featuredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard variant="dark" className="hover-elevate">
                    <div className="aspect-square rounded-lg bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center mb-3">
                      {item.imageUrl ? (
                        <img 
                          src={item.imageUrl} 
                          alt={item.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <Sparkles className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                    <h3 className="font-medium text-sm truncate">{item.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <Heart className="w-3 h-3 text-pink-400" />
                      <span className="text-sm">{item.price} PP</span>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Link to="/mini-games">
              <GlassCard variant="glow" className="hover-elevate">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Gamepad2 className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Mini-Games</h3>
                    <p className="text-sm text-muted-foreground">Play to earn cosmetic items</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </GlassCard>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Link to="/subscribe">
              <GlassCard variant="glow" className="hover-elevate">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
                    <Crown className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Upgrade to Pro</h3>
                    <p className="text-sm text-muted-foreground">Unlimited energy & more</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </GlassCard>
            </Link>
          </motion.div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Link to="/inventory">
            <GlassCard variant="dark" className="hover-elevate">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">My Inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    {inventoryCount} items collected
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </GlassCard>
          </Link>

          <Link to="/gifts">
            <GlassCard variant="dark" className="hover-elevate">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Gifts</h3>
                  <p className="text-sm text-muted-foreground">Send & receive gifts</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </div>
            </GlassCard>
          </Link>
        </TabsContent>

        <TabsContent value="energy" className="space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <EnergyMeter />
          </motion.div>

          <div className="space-y-3">
            <h2 className="font-semibold">Buy Energy</h2>
            
            {energyPackages.map((pkg, index) => {
              const canAfford = userPP >= pkg.price;
              const isLoading = purchaseEnergyMutation.isPending;
              
              return (
                <motion.div
                  key={pkg.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <GlassCard variant="dark" className="hover-elevate">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                        <pkg.icon className="w-6 h-6 text-white" />
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="font-semibold">{pkg.name}</h3>
                        <p className="text-sm text-muted-foreground">+{pkg.energy} energy</p>
                      </div>
                      
                      <Button 
                        size="sm"
                        disabled={!canAfford || isLoading}
                        onClick={() => purchaseEnergyMutation.mutate(pkg.id)}
                        data-testid={`button-buy-energy-${pkg.id}`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        ) : (
                          <Heart className="w-3 h-3 mr-1" />
                        )}
                        {pkg.price} PP
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          <GlassCard variant="dark">
            <p className="text-sm text-muted-foreground text-center">
              Energy regenerates 10 points every hour. Pro members have unlimited energy.
            </p>
          </GlassCard>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GlassCard variant="glow" className="text-center">
              <Sparkles className="w-8 h-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold mb-2">Support Development</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Help us build more features and improve Mirror Play
              </p>
              <Link to="/subscribe?donate=true">
                <Button variant="outline" data-testid="button-donate">
                  <Heart className="w-4 h-4 mr-2 text-pink-400" />
                  Donate to Support Us
                </Button>
              </Link>
            </GlassCard>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
