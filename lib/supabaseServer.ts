import { createClient } from "@supabase/supabase-js";
import { storage } from "./storage.js";

type RequestLike = {
  headers?: Record<string, string | string[] | undefined>;
};

export class SupabaseAuthError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

if (!process.env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseServer = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | undefined,
  name: string
): string | undefined {
  if (!headers) return undefined;
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) return value[0];
  return value;
}

function getBearerToken(req: RequestLike): string | null {
  const authHeader = getHeaderValue(req.headers, "authorization");
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function requireSupabaseUser(req: RequestLike) {
  const accessToken = getBearerToken(req);
  if (!accessToken) {
    throw new SupabaseAuthError(401, "Missing authorization token");
  }

  const { data, error } = await supabaseServer.auth.getUser(accessToken);
  if (error || !data?.user) {
    throw new SupabaseAuthError(401, "Invalid Supabase session");
  }

  const supaUser = data.user;
  const email = supaUser.email;
  if (!email) {
    throw new SupabaseAuthError(400, "Supabase user missing email");
  }

  const metadata = (supaUser.user_metadata || {}) as Record<string, any>;
  const provider =
    (supaUser.app_metadata as Record<string, any> | undefined)?.provider ??
    "supabase";

  const fullName = metadata.full_name || metadata.name || metadata.fullName || "";
  const derivedFirst =
    metadata.firstName ||
    metadata.first_name ||
    metadata.given_name ||
    (fullName ? String(fullName).split(" ")[0] : "");
  const derivedLast =
    metadata.lastName ||
    metadata.last_name ||
    metadata.family_name ||
    (fullName ? String(fullName).split(" ").slice(1).join(" ") : "");

  const profileImageUrl =
    metadata.avatar_url || metadata.picture || metadata.profileImageUrl || "";

  let user = await storage.getUserByEmail(email);

  if (user) {
    if (user.authProvider !== provider || user.authProviderId !== supaUser.id) {
      user =
        (await storage.updateUser(user.id, {
          authProvider: provider,
          authProviderId: supaUser.id,
          emailVerified: true,
          profileImageUrl: user.profileImageUrl || profileImageUrl,
        })) || user;
    }
  } else {
    user = await storage.createUser({
      email,
      firstName: derivedFirst,
      lastName: derivedLast,
      profileImageUrl,
      authProvider: provider,
      authProviderId: supaUser.id,
      emailVerified: true,
    });
  }

  return user;
}
