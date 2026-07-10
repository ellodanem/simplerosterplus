import { getOrgPublicAppUrlOverride } from "@/lib/public-app-url-settings";

/**
 * Canonical public HTTPS base URL (no trailing slash) for ADMS pairing copy and server-side fetches.
 * Prefer per-org `public_app_url` AppSetting, then APP_URL / NEXT_PUBLIC_APP_URL, then VERCEL_URL.
 */
export function normalizePublicAppUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  let u = t.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

export function getPublicAppUrlFromEnv(): string {
  const explicit = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (explicit?.trim()) return normalizePublicAppUrl(explicit);
  if (process.env.VERCEL_URL) {
    const host = process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
    return `https://${host}`;
  }
  return "";
}

function resolvePublicAppUrlFromHeaders(headers: Headers): string {
  const fwdHost = headers.get("x-forwarded-host");
  const fwdProto = headers.get("x-forwarded-proto") ?? "https";
  const host = fwdHost ?? headers.get("host");
  if (!host) return "";
  return normalizePublicAppUrl(`${fwdProto}://${host}`);
}

function resolvePublicAppUrlFromRequestUrl(request: Request): string {
  const url = new URL(request.url);
  const fwdHost = request.headers.get("x-forwarded-host");
  const fwdProto = request.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const host = fwdHost ?? url.host;
  return normalizePublicAppUrl(`${fwdProto}://${host}`);
}

export type PublicAppUrlSource = "org" | "env" | "request" | "none";

export type ResolvedPublicAppUrl = {
  url: string;
  source: PublicAppUrlSource;
};

/**
 * Resolve public base URL: org AppSetting → env → optional request/headers fallback.
 */
export async function resolvePublicAppUrlForOrg(
  organizationId: string,
  opts?: { request?: Request; headers?: Headers },
): Promise<ResolvedPublicAppUrl> {
  const fromOrg = await getOrgPublicAppUrlOverride(organizationId);
  if (fromOrg) return { url: fromOrg, source: "org" };

  const fromEnv = getPublicAppUrlFromEnv();
  if (fromEnv) return { url: fromEnv, source: "env" };

  if (opts?.request) {
    const fromRequest = resolvePublicAppUrlFromRequestUrl(opts.request);
    if (fromRequest) return { url: fromRequest, source: "request" };
  }
  if (opts?.headers) {
    const fromHeaders = resolvePublicAppUrlFromHeaders(opts.headers);
    if (fromHeaders) return { url: fromHeaders, source: "request" };
  }

  return { url: "", source: "none" };
}

/** @deprecated Prefer `resolvePublicAppUrlForOrg` with organizationId. */
export function resolvePublicAppUrlFromRequest(request: Request): string {
  const fromEnv = getPublicAppUrlFromEnv();
  if (fromEnv) return fromEnv;
  return resolvePublicAppUrlFromRequestUrl(request);
}

export function buildAdmsIclockUrls(base: string): { pushUrl: string; pollUrl: string } {
  const b = base.replace(/\/$/, "");
  return {
    pushUrl: `${b}/iclock/cdata`,
    pollUrl: `${b}/iclock/getrequest`,
  };
}

/**
 * Split the public base URL into the hostname + port a ZKTeco terminal actually types into its
 * Cloud Server / ADMS screen. The firmware appends `/iclock/*` itself, so `serverPath` is a
 * constant. Returns nulls when `base` is empty or unparseable so callers can fall back.
 */
export function buildAdmsServerFields(base: string): {
  serverHost: string;
  serverPort: number;
  serverPath: string;
} | null {
  const trimmed = base.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const port = url.port ? Number(url.port) : url.protocol === "https:" ? 443 : 80;
    return { serverHost: url.hostname, serverPort: port, serverPath: "/iclock" };
  } catch {
    return null;
  }
}
