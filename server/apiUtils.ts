export type ReqLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

export type ResLike = {
  status: (code: number) => ResLike;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

export function getHeaderValue(
  headers: Record<string, string | string[] | undefined>,
  name: string
) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export function getJsonBody(req: ReqLike): Record<string, any> {
  const body = req.body;
  if (!body) return {};
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString("utf8")) as Record<string, any>;
    } catch {
      return {};
    }
  }
  if (typeof body === "string") {
    try {
      return JSON.parse(body) as Record<string, any>;
    } catch {
      return {};
    }
  }
  return body as Record<string, any>;
}

export function getRequestUrl(req: ReqLike) {
  const proto = getHeaderValue(req.headers, "x-forwarded-proto") || "https";
  const host =
    getHeaderValue(req.headers, "x-forwarded-host") ||
    getHeaderValue(req.headers, "host") ||
    "localhost";
  const base = `${proto}://${host}`;
  const path = req.url || "/";
  return new URL(path, base);
}

export function getQueryParam(req: ReqLike, name: string): string | undefined {
  const queryValue = req.query?.[name];
  if (Array.isArray(queryValue)) {
    return queryValue[0];
  }
  if (typeof queryValue === "string") {
    return queryValue;
  }

  const url = getRequestUrl(req);
  const value = url.searchParams.get(name);
  return value ?? undefined;
}

export function getLastPathSegment(req: ReqLike): string | undefined {
  const url = getRequestUrl(req);
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : undefined;
}
