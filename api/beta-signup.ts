import { storage } from "../server/storage";

type ReqLike = {
  method?: string;
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const body = getJsonBody(req);
    const email = body?.email as string | undefined;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Valid email is required" });
    }

    const signup = await storage.createBetaSignup({
      email: email.toLowerCase(),
      source: "landing",
    });

    res.status(200).json({ success: true, id: signup.id });
  } catch (error: any) {
    if (error?.message?.includes("unique") || error?.code === "23505") {
      return res.status(400).json({ message: "You're already signed up!" });
    }
    console.error("Error creating beta signup:", error);
    res.status(500).json({ message: "Failed to sign up" });
  }
}
