import { storage } from "./storage";

export type SubscriptionTier = 'free' | 'peace_plus' | 'pro_mind';

const isDevelopment = process.env.NODE_ENV === 'development';

const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: isDevelopment ? Infinity : 3,
  peace_plus: Infinity,
  pro_mind: Infinity,
};

export function getDailyLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier] ?? TIER_LIMITS.free;
}

export async function getSubscriptionTier(userId: string): Promise<SubscriptionTier> {
  const user = await storage.getUser(userId);
  
  if (!user?.stripeCustomerId) {
    return 'free';
  }

  const stripeSubscription = await storage.getStripeSubscriptionByCustomerId(user.stripeCustomerId);
  
  if (!stripeSubscription || !['active', 'trialing'].includes(stripeSubscription.status)) {
    return 'free';
  }

  const items = stripeSubscription.items as any;
  if (!items?.data?.[0]?.price?.product) {
    return 'free';
  }

  const productId = items.data[0].price.product;
  const product = await storage.getStripeProductById(productId);
  
  if (!product?.metadata) {
    return 'free';
  }

  const tierFromMetadata = (product.metadata as any)?.tier;
  if (tierFromMetadata === 'peace_plus' || tierFromMetadata === 'pro_mind') {
    return tierFromMetadata;
  }

  return 'free';
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
