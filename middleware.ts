import {
  clerkMiddleware,
  createRouteMatcher,
  type ClerkMiddlewareAuth,
} from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import {
  OPERATOR_SESSION_COOKIE,
  OPERATOR_JWT_AUDIENCE,
} from "@/lib/ops/auth-cookie";
import { clerkConfigured, tenantSignInAbsoluteUrl, tenantSignInPath } from "@/lib/clerk/config";
import { isOnboardingSetupWritePath } from "@/lib/ops/setup-write-paths";

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

function operatorSecretKey(): Uint8Array {
  const secret = process.env.OPERATOR_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    return new Uint8Array(0);
  }
  return new TextEncoder().encode(secret);
}

const TENANT_GATED: RegExp[] = [
  /^\/staff(\/|$)/,
  /^\/roster(\/|$)/,
  /^\/attendance(\/|$)/,
  /^\/settings(\/|$)/,
  /^\/api\/staff(\/|$)/,
  /^\/api\/roster(\/|$)/,
  /^\/api\/requests(\/|$)/,
  /^\/api\/attendance(\/|$)/,
  /^\/api\/billing(\/|$)/,
  /^\/api\/auth\/me$/,
  /^\/api\/auth\/logout$/,
];

function isTenantGated(pathname: string): boolean {
  return TENANT_GATED.some((re) => re.test(pathname));
}

const isClerkPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/create-organization(.*)",
  "/demo(.*)",
  "/login(.*)",
  "/share(.*)",
  "/api/clerk/webhook(.*)",
  "/api/stripe/webhook(.*)",
  "/api/marketing(.*)",
  "/api/onboarding/signup-intent(.*)",
  "/api/cron/reclaim-demos(.*)",
  "/iclock(.*)",
  "/api/auth/login(.*)",
  "/api/auth/end-impersonation(.*)",
]);

function isAdminHost(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const configured = process.env.ADMIN_HOST?.toLowerCase();
  return host.startsWith("admin.") || (!!configured && host === configured);
}

/** Production Vercel alias — Clerk production rejects this origin (blank SignIn). */
const LEGACY_VERCEL_APP_HOST = "simplerosterplus.vercel.app";

function canonicalAppOrigin(): string {
  const raw = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://app.simplerosterplus.com";
}

/**
 * Send browser traffic off the legacy Vercel hostname onto the Clerk-allowed app host.
 * Leave /iclock and /api alone so device ingest and webhooks keep working on whatever URL is configured.
 */
function redirectLegacyVercelAppHost(request: NextRequest): NextResponse | null {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  if (host !== LEGACY_VERCEL_APP_HOST) return null;

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/iclock") || pathname.startsWith("/api/")) return null;

  const dest = new URL(request.url);
  const canonical = new URL(canonicalAppOrigin());
  if (dest.host === canonical.host) return null;

  dest.protocol = canonical.protocol;
  dest.host = canonical.host;
  return NextResponse.redirect(dest, 308);
}

async function gateOperator(
  request: NextRequest,
  opsPath: string,
  rewriteTo?: URL,
): Promise<NextResponse> {
  const proceed = () => (rewriteTo ? NextResponse.rewrite(rewriteTo) : NextResponse.next());

  if (opsPath === "/ops/login") return proceed();
  if (opsPath === "/api/ops/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }

  const key = operatorSecretKey();
  if (key.length === 0) {
    if (opsPath.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Server misconfigured: OPERATOR_AUTH_SECRET" },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/ops/login", request.url));
  }

  const token = request.cookies.get(OPERATOR_SESSION_COOKIE)?.value;
  const unauthorized = () => {
    if (opsPath.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/ops/login", request.url);
    login.searchParams.set("next", opsPath + request.nextUrl.search);
    return NextResponse.redirect(login);
  };

  if (!token) return unauthorized();
  try {
    await jwtVerify(token, key, {
      algorithms: ["HS256"],
      audience: OPERATOR_JWT_AUDIENCE,
    });
    return proceed();
  } catch {
    return unauthorized();
  }
}

async function verifyTenantJwt(
  request: NextRequest,
): Promise<{ valid: boolean; readOnly?: boolean; onboardingSimulate?: boolean }> {
  const key = secretKey();
  if (key.length === 0) return { valid: false };

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return { valid: false };

  try {
    const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
    return {
      valid: true,
      readOnly: payload.readOnly === true,
      onboardingSimulate: payload.onboardingSimulate === true,
    };
  } catch {
    return { valid: false };
  }
}

async function handleRequest(
  auth: ClerkMiddlewareAuth | null,
  request: NextRequest,
): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/iclock")) {
    return NextResponse.next();
  }

  const legacyRedirect = redirectLegacyVercelAppHost(request);
  if (legacyRedirect) return legacyRedirect;

  if (isAdminHost(request)) {
    if (pathname.startsWith("/api")) {
      if (pathname.startsWith("/api/ops")) return gateOperator(request, pathname);
      return NextResponse.next();
    }
    const effective =
      pathname === "/ops" || pathname.startsWith("/ops/")
        ? pathname
        : `/ops${pathname === "/" ? "" : pathname}`;
    if (effective === pathname) {
      return gateOperator(request, effective);
    }
    const url = request.nextUrl.clone();
    url.pathname = effective;
    return gateOperator(request, effective, url);
  }

  if (pathname.startsWith("/ops") || pathname.startsWith("/api/ops")) {
    return gateOperator(request, pathname);
  }

  const jwtSession = await verifyTenantJwt(request);

  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/ops") &&
    !pathname.startsWith("/api/stripe/") &&
    !pathname.startsWith("/api/clerk/") &&
    pathname !== "/api/auth/login" &&
    pathname !== "/api/auth/end-impersonation"
  ) {
    const method = request.method;
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      if (jwtSession.valid && jwtSession.onboardingSimulate) {
        if (!isOnboardingSetupWritePath(pathname)) {
          return NextResponse.json(
            {
              error:
                "Onboarding simulation — only setup wizard changes are allowed. End the session to return to ops.",
            },
            { status: 403 },
          );
        }
      } else if (jwtSession.valid && jwtSession.readOnly) {
        return NextResponse.json(
          { error: "Read-only operator session — changes are not allowed." },
          { status: 403 },
        );
      }
    }
  }

  if (pathname === "/login" && clerkConfigured()) {
    return NextResponse.redirect(new URL(tenantSignInPath(), request.url));
  }

  if (jwtSession.valid) {
    return NextResponse.next();
  }

  if (clerkConfigured()) {
    if (isClerkPublicRoute(request)) {
      return NextResponse.next();
    }
    await auth!.protect({ unauthenticatedUrl: tenantSignInAbsoluteUrl(request.url) });

    if (!jwtSession.valid) {
      const { userId, orgId } = await auth!();
      const allowWithoutOrg =
        pathname.startsWith("/create-organization") ||
        pathname.startsWith("/demo/") ||
        pathname.startsWith("/sign-up") ||
        pathname.startsWith("/sign-in");
      if (userId && !orgId && !allowWithoutOrg && !pathname.startsWith("/api/")) {
        return NextResponse.redirect(new URL("/create-organization", request.url));
      }
    }

    return NextResponse.next();
  }

  if (pathname === "/login") {
    return NextResponse.next();
  }
  if (pathname === "/api/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }

  if (!isTenantGated(pathname)) {
    return NextResponse.next();
  }

  const key = secretKey();
  if (key.length === 0) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Server misconfigured: AUTH_SECRET" }, { status: 500 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(login);
}

const useClerk = Boolean(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() &&
    process.env.CLERK_SECRET_KEY?.trim(),
);

export default useClerk
  ? clerkMiddleware((auth, req) => handleRequest(auth, req))
  : (req: NextRequest) => handleRequest(null, req);

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
