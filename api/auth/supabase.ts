import { createClient } from "@supabase/supabase-js";
import { requireSupabaseUser, SupabaseAuthError } from "../../lib/supabaseServer.js";

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey)
    : null;

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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    let user;

    try {
      user = await requireSupabaseUser(req);
    } catch (error) {
      const body = getJsonBody(req);
      const accessToken = body?.accessToken as string | undefined;
      if (!accessToken) throw error;

      if (!supabaseAdmin) {
        return res.status(500).json({ message: "Supabase admin not configured" });
      }

      const { data, error: supaError } = await supabaseAdmin.auth.getUser(accessToken);
      if (supaError || !data?.user) {
        return res.status(401).json({ message: "Invalid Supabase session" });
      }

      user = await requireSupabaseUser({ headers: { authorization: `Bearer ${accessToken}` } });
    }

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof SupabaseAuthError) {
      return res.status(error.status).json({ message: error.message });
    }

    console.error("Supabase auth exchange error:", error);
    res.status(500).json({ message: "Supabase auth failed" });
  }
}

