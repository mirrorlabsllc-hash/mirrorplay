import { stripe } from "../../lib/stripe.js";
import { storage } from "../../lib/storage.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type ResLike = {
  status: (code: number) => ResLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getBaseUrl(req: ReqLike) {
  const proto = getHeaderValue(req.headers, "x-forwarded-proto") || "https";
  const host =
    getHeaderValue(req.headers, "x-forwarded-host") ||
    getHeaderValue(req.headers, "host");
  return process.env.PUBLIC_BASE_URL || (host ? `${proto}://${host}` : "");
}

function getJsonBody(req: ReqLike): Record<string, any> {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return req.body as Record<string, any>;
}

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const body = getJsonBody(req);
    const priceId = body?.priceId as string | undefined;

    if (!priceId) {
      return res.status(400).json({ message: "Price ID is required" });
    }

    const user = await requireSupabaseUser(req);

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { userId: user.id },
      });
      await storage.updateUserStripeCustomerId(user.id, customer.id);
      customerId = customer.id;
    }

    const baseUrl = getBaseUrl(req);
    const createCheckoutSession = async (customer: string) =>
      stripe.checkout.sessions.create({
        customer,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${baseUrl}/subscribe?success=true`,
        cancel_url: `${baseUrl}/subscribe?canceled=true`,
      });

    let session;
    try {
      session = await createCheckoutSession(customerId);
    } catch (error: any) {
      const message = error?.raw?.message || error?.message || "";
      if (message.includes("No such customer")) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          metadata: { userId: user.id },
        });
        await storage.updateUserStripeCustomerId(user.id, customer.id);
        customerId = customer.id;
        session = await createCheckoutSession(customerId);
      } else {
        throw error;
      }
    }

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error creating checkout session:", error);
    res.status(500).json({
      message: "Failed to create checkout session",
      error:
        process.env.NODE_ENV !== "production"
          ? error?.message || error?.raw?.message || "Unknown error"
          : undefined,
    });
  }
}

