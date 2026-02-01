import { getStripePublishableKey } from "../_lib/stripe";

type ReqLike = {
  method?: string;
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
    const publishableKey = await getStripePublishableKey();
    res.status(200).json({ publishableKey });
  } catch (error) {
    console.error("Error getting publishable key:", error);
    res.status(500).json({ message: "Failed to get Stripe key" });
  }
}
