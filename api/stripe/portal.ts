import { stripe } from "../../lib/stripe.js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";

type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
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

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const user = await requireSupabaseUser(req);
    if (!user?.stripeCustomerId) {
      return res.status(400).json({ message: "No subscription found" });
    }

    const baseUrl = getBaseUrl(req);

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${baseUrl}/subscribe`,
    });

    res.status(200).json({ url: session.url });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error creating portal session:", error);
    res.status(500).json({ message: "Failed to create portal session" });
  }
}

