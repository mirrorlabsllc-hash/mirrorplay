import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Crown, 
  Zap,
  Check,
  ChevronLeft,
  Sparkles,
  Mic,
  Brain,
  Infinity,
  Loader2,
  Settings
} from "lucide-react";
import { Link, useSearch } from "wouter";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring: { interval: string } | null;
}

interface StripeProduct {
  id: string;
  name: string;
  description: string;
  metadata: { tier?: string };
  prices: StripePrice[];
}

interface StripeSubscriptionResponse {
  subscription: any;
  tier: string;
  status?: string;
}

const planFeatures: Record<string, { icon: any; text: string }[]> = {
  free: [
    { icon: Brain, text: "1 practice per day" },
    { icon: Sparkles, text: "Basic feedback" },
    { icon: Check, text: "Chapter 1 of Story Mode" },
  ],
  peace_plus: [
    { icon: Infinity, text: "Unlimited daily practice" },
    { icon: Brain, text: "Deeper feedback & insights" },
    { icon: Sparkles, text: "Full Story Mode access" },
    { icon: Crown, text: "2x Peace Points earnings" },
  ],
  pro_mind: [
    { icon: Infinity, text: "Everything in Mirror Play+" },
    { icon: Mic, text: "Voice cloning & coaching" },
    { icon: Sparkles, text: "All cosmetics unlocked" },
    { icon: Crown, text: "5x Peace Points earnings" },
    { icon: Zap, text: "Priority support" },
  ],
};

const planStyles: Record<string, { color: string; popular?: boolean; gradient?: boolean }> = {
  free: { color: "border-muted" },
  peace_plus: { color: "border-violet-500/50", popular: true },
  pro_mind: { color: "border-amber-500/50", gradient: true },
};

export default function Subscribe() {
  const { toast } = useToast();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    if (success === "true") {
      toast({
        title: "Welcome to Mirror Play+!",
        description: "Your journey to deeper emotional intelligence starts now.",
      });
    } else if (canceled === "true") {
      toast({
        title: "No changes made",
        description: "Take your time - we're here when you're ready.",
      });
    }
  }, [success, canceled, toast]);

  const { data: stripeSubscription, isLoading: loadingSubscription } = useQuery<StripeSubscriptionResponse>({
    queryKey: ["/api/stripe/subscription"],
  });

  const { data: productsData } = useQuery<{ products: StripeProduct[] }>({
    queryKey: ["/api/stripe/products"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const response = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/stripe/portal", {});
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open customer portal",
        variant: "destructive",
      });
    },
  });

  const currentTier = stripeSubscription?.tier || "free";
  const hasActiveSubscription = stripeSubscription?.subscription && stripeSubscription.status === "active";

  // Fallback products when Stripe isn't connected
  const fallbackProducts = [
    {
      id: "peace_plus_fallback",
      tier: "peace_plus",
      name: "Mirror Play+",
      price: "$4.99",
      period: "per month",
      description: "Practice as much as you need with unlimited daily sessions, deeper insights, and full story mode access.",
      priceId: null,
    },
    {
      id: "pro_mind_fallback",
      tier: "pro_mind",
      name: "Pro Mind",
      price: "$9.99",
      period: "per month",
      description: "Everything in Mirror Play+ plus voice cloning, all cosmetics, 5x Peace Points, and priority support.",
      priceId: null,
    },
  ];

  const stripeProducts = (productsData?.products || []).map((product) => {
    const tier = product.metadata?.tier || product.name.toLowerCase().replace(/\s+/g, "_");
    const price = product.prices[0];
    const priceDisplay = price ? `$${(price.unit_amount / 100).toFixed(2)}` : "$0";
    
    return {
      id: product.id,
      tier,
      name: product.name,
      price: priceDisplay,
      period: price?.recurring?.interval === "month" ? "per month" : "per period",
      description: product.description || "",
      priceId: price?.id || null,
    };
  });

  const plans = [
    {
      id: "free",
      tier: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Start your journey with 1 daily practice session",
      priceId: null,
    },
    ...(stripeProducts.length > 0 ? stripeProducts : fallbackProducts),
  ];

  const sortedPlans = plans.sort((a, b) => {
    const order = ["free", "peace_plus", "pro_mind"];
    return order.indexOf(a.tier) - order.indexOf(b.tier);
  });

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
          <h1 className="text-2xl font-bold">Unlock Your Potential</h1>
          <p className="text-muted-foreground">Keep growing with Mirror Play+</p>
        </div>
      </motion.div>

      {loadingSubscription ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-4">
          {sortedPlans.map((plan, index) => {
            const isCurrent = currentTier === plan.tier;
            const style = planStyles[plan.tier] || { color: "border-muted" };
            const features = planFeatures[plan.tier] || [];
            
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GlassCard 
                  variant={style.popular ? "glow" : "dark"}
                  className={cn(
                    "relative border-2",
                    style.color,
                    isCurrent && "ring-2 ring-primary"
                  )}
                >
                  {style.popular && (
                    <Badge className="absolute -top-2 right-4 bg-violet-500">
                      Most Popular
                    </Badge>
                  )}
                  
                  {isCurrent && (
                    <Badge className="absolute -top-2 left-4 bg-emerald-500">
                      Current Plan
                    </Badge>
                  )}

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className={cn(
                          "text-2xl font-bold",
                          style.gradient && "bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent"
                        )}>
                          {plan.price}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {plan.period}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold mt-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground">{plan.description}</p>
                    </div>

                    <ul className="space-y-2">
                      {features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <feature.icon className="w-4 h-4 text-primary" />
                          {feature.text}
                        </li>
                      ))}
                    </ul>

                    {isCurrent && hasActiveSubscription && plan.tier !== "free" && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => portalMutation.mutate()}
                        disabled={portalMutation.isPending}
                        data-testid="button-manage-subscription"
                      >
                        {portalMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Settings className="w-4 h-4 mr-2" />
                        )}
                        Manage Plan
                      </Button>
                    )}

                    {isCurrent && plan.tier === "free" && (
                      <Button variant="outline" className="w-full" disabled data-testid="button-current-plan">
                        Current Plan
                      </Button>
                    )}

                    {!isCurrent && plan.priceId && (
                      <Button 
                        className={cn(
                          "w-full",
                          style.gradient && "bg-gradient-to-r from-amber-500 to-orange-500"
                        )}
                        onClick={() => checkoutMutation.mutate(plan.priceId!)}
                        disabled={checkoutMutation.isPending}
                        data-testid={`button-upgrade-${plan.tier}`}
                      >
                        {checkoutMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : null}
                        Continue with {plan.name}
                      </Button>
                    )}

                    {!isCurrent && !plan.priceId && plan.tier === "free" && (
                      <Button variant="outline" className="w-full" disabled>
                        Free Forever
                      </Button>
                    )}

                    {!isCurrent && !plan.priceId && plan.tier !== "free" && (
                      <Button variant="outline" className="w-full" disabled>
                        Coming Soon
                      </Button>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.p 
        className="text-center text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        Subscriptions are handled securely by Stripe. Cancel anytime.
      </motion.p>
    </div>
  );
}
