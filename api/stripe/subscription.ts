import { stripe } from "../../lib/stripe";
import { requireSupabaseUser, SupabaseAuthError } from "../../server/supabaseServer";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);

    if (!user?.stripeCustomerId) {
      return res.status(200).json({ subscription: null, tier: "free" });
    }

    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripeCustomerId,
      status: "all",
      limit: 5,
    });

    const active = subscriptions.data
      .filter((sub) => sub.status === "active" || sub.status === "trialing")
      .sort((a, b) => b.created - a.created)[0];

    if (!active) {
      return res.status(200).json({ subscription: null, tier: "free" });
    }

    const metadata = (active.metadata || {}) as Record<string, string>;
    const tier = metadata.tier || "free";

    res.status(200).json({
      subscription: active,
      tier,
      status: active.status,
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error fetching Stripe subscription:", error);
    res.status(500).json({ message: "Failed to fetch subscription" });
  }
}
