import { storage } from "../lib/storage.js";
import { insertTestimonialSchema } from "@shared/schema";
import { requireSupabaseUser, SupabaseAuthError } from "../lib/supabaseServer.js";

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
  if (req.method === "GET") {
    try {
      const testimonials = await storage.getApprovedTestimonials();
      return res.status(200).json(testimonials);
    } catch (error) {
      console.error("Error fetching testimonials:", error);
      return res.status(500).json({ message: "Failed to fetch testimonials" });
    }
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    await requireSupabaseUser(req);

    const publicSchema = insertTestimonialSchema.pick({
      name: true,
      content: true,
    });

    const parseResult = publicSchema.safeParse(getJsonBody(req));
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Validation failed",
        errors: parseResult.error.flatten().fieldErrors,
      });
    }

    const testimonial = await storage.createTestimonial({
      ...parseResult.data,
      rating: 5,
      featured: false,
      approved: false,
    });

    res.status(200).json(testimonial);
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Error creating testimonial:", error);
    res.status(500).json({ message: "Failed to create testimonial" });
  }
}

