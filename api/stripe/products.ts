import { stripe } from "../../lib/stripe";

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
    const [productsResponse, pricesResponse] = await Promise.all([
      stripe.products.list({ active: true, limit: 100 }),
      stripe.prices.list({ active: true, limit: 100 }),
    ]);

    const productsMap = new Map(
      productsResponse.data.map((product) => [
        product.id,
        {
          id: product.id,
          name: product.name,
          description: product.description,
          metadata: product.metadata,
          prices: [] as Array<{
            id: string;
            unit_amount: number | null;
            currency: string;
            recurring: { interval: string } | null;
          }>,
        },
      ])
    );

    for (const price of pricesResponse.data) {
      const productId =
        typeof price.product === "string" ? price.product : price.product?.id;
      if (!productId) continue;

      const product = productsMap.get(productId);
      if (!product) continue;

      product.prices.push({
        id: price.id,
        unit_amount: price.unit_amount,
        currency: price.currency,
        recurring: price.recurring,
      });
    }

    const products = Array.from(productsMap.values()).filter(
      (product) => product.prices.length > 0
    );

    res.status(200).json({ products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
}
