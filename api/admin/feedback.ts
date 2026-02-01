import { storage } from "../../lib/storage.js";

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

export default async function handler(req: ReqLike, res: ResLike) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const authHeader = getHeaderValue(req.headers, "authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token || token !== process.env.ADMIN_FEEDBACK_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const feedback = await storage.getPrototypeFeedback(200);
    res.status(200).json(feedback);
  } catch (error) {
    console.error("Error fetching prototype feedback:", error);
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
}

