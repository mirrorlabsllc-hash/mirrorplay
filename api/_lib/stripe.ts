import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2026-01-28.clover",
});

export async function getStripePublishableKey() {
  const publishableKey =
    process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLISHABLE_KEY_TEST;
  if (!publishableKey) {
    throw new Error("Missing STRIPE_PUBLISHABLE_KEY");
  }
  return publishableKey;
}
