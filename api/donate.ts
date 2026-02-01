import { stripe } from "../lib/stripe.js";

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
    const amount = body?.amount as number | undefined;

    if (!amount || typeof amount !== "number" || amount < 1 || amount > 10000) {
      return res
        .status(400)
        .json({ message: "Please enter an amount between $1 and $10,000" });
    }

    const amountInCents = Math.round(amount * 100);

    const baseUrl = getBaseUrl(req);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Support Mirror Labs",
              description: "One-time donation to support emotional intelligence tools",
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${baseUrl}/?donated=true`,
      cancel_url: `${baseUrl}/`,
    });

    res.status(200).json({ url: session.url });
  } catch (error) {
    console.error("Error creating donation session:", error);
    res.status(500).json({ message: "Failed to create donation session" });
  }
}
