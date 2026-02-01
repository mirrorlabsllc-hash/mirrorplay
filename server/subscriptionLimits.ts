import { storage } from "./storage";
import { stripe } from "../api/_lib/stripe";

export type SubscriptionTier = 'free' | 'peace_plus' | 'pro_mind';

const isDevelopment = process.env.NODE_ENV === 'development';

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: isDevelopment ? Infinity : 3,
  peace_plus: Infinity,
  pro_mind: Infinity,
};

const STRIPE_TIER_CACHE_TTL_MS = 5 * 60 * 1000;
const stripeTierCache = new Map<string, { tier: SubscriptionTier; expiresAt: number }>();

function isPaidTier(tier?: string | null): tier is SubscriptionTier {
  return tier === "peace_plus" || tier === "pro_mind";
}

async function getStripeTierFromApi(customerId: string): Promise<SubscriptionTier> {
  const cached = stripeTierCache.get(customerId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.tier;
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return "free";
  }

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });

  const active = subscriptions.data
    .filter((sub) => sub.status === "active" || sub.status === "trialing")
    .sort((a, b) => b.created - a.created)[0];

  if (!active) {
    stripeTierCache.set(customerId, { tier: "free", expiresAt: Date.now() + STRIPE_TIER_CACHE_TTL_MS });
    return "free";
  }

  const price = active.items.data[0]?.price;
  const tierFromPrice = price?.metadata?.tier;
  if (isPaidTier(tierFromPrice)) {
    stripeTierCache.set(customerId, { tier: tierFromPrice, expiresAt: Date.now() + STRIPE_TIER_CACHE_TTL_MS });
    return tierFromPrice;
  }

  const productId =
    typeof price?.product === "string" ? price.product : price?.product?.id;
  if (productId) {
    const product = await stripe.products.retrieve(productId);
    const tierFromProduct = product?.metadata?.tier;
    if (isPaidTier(tierFromProduct)) {
      stripeTierCache.set(customerId, { tier: tierFromProduct, expiresAt: Date.now() + STRIPE_TIER_CACHE_TTL_MS });
      return tierFromProduct;
    }
  }

  stripeTierCache.set(customerId, { tier: "free", expiresAt: Date.now() + STRIPE_TIER_CACHE_TTL_MS });
  return "free";
}

export function getDailyLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const user = await storage.getUser(userId);
  
  if (!user?.stripeCustomerId) {
    const allowManual =
      process.env.ALLOW_MANUAL_SUBSCRIPTION === "true" ||
      process.env.NODE_ENV !== "production";

    if (allowManual) {
      const subscription = await storage.getSubscription(userId);
      if (isPaidTier(subscription?.tier)) {
        return subscription.tier;
      }
    }

    return 'free';
  }

  try {
    const stripeSubscription = await storage.getStripeSubscriptionByCustomerId(user.stripeCustomerId);

    if (!stripeSubscription || !['active', 'trialing'].includes(stripeSubscription.status)) {
      return await getStripeTierFromApi(user.stripeCustomerId);
    }

    const items = stripeSubscription.items as any;
    const productId = items?.data?.[0]?.price?.product;
    if (!productId) {
      return await getStripeTierFromApi(user.stripeCustomerId);
    }

    const product = await storage.getStripeProductById(productId);
    const tierFromMetadata = (product?.metadata as any)?.tier;
    if (isPaidTier(tierFromMetadata)) {
      return tierFromMetadata;
    }

    return await getStripeTierFromApi(user.stripeCustomerId);
  } catch (error) {
    console.warn("Stripe schema unavailable, falling back to Stripe API:", error);
    return await getStripeTierFromApi(user.stripeCustomerId);
  }
}

export async function getDailyUsage(userId: string): Promise<number> {
  return storage.getTodayPracticeSessionCount(userId);
}

export interface UsageCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  tier: SubscriptionTier;
  usedToday: number;
}

export async function canAnalyze(userId: string): Promise<UsageCheckResult> {
  const tier = await getSubscriptionTier(userId);
  const limit = getDailyLimit(tier);
  const usedToday = await getDailyUsage(userId);
  
  const remaining = limit === Infinity ? Infinity : Math.max(0, limit - usedToday);
  const allowed = limit === Infinity || usedToday < limit;

  return {
    allowed,
    remaining,
    limit,
    tier,
    usedToday,
  };
}
