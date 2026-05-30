import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth-cookie";
import {
  OPERATOR_SESSION_COOKIE,
  OPERATOR_JWT_AUDIENCE,
} from "@/lib/ops/auth-cookie";

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

// Tenant app routes that the middleware gates (everything else self-guards in its page/route).
// Mirrors the previous explicit matcher so behavior on the customer plane is unchanged.
const TENANT_GATED: RegExp[] = [
  /^\/staff(\/|$)/,
  /^\/roster(\/|$)/,
  /^\/attendance(\/|$)/,
  /^\/api\/staff(\/|$)/,
  /^\/api\/roster(\/|$)/,
  /^\/api\/requests(\/|$)/,
  /^\/api\/attendance(\/|$)/,
  /^\/api\/auth\/me$/,
  /^\/api\/auth\/logout$/,
];

function isTenantGated(pathname: string): boolean {
  return TENANT_GATED.some((re) => re.test(pathname));
}

// The operator console is served on its own subdomain in production
// (admin.simplerosterplus.com). Locally / on the app host it's reachable at /ops. The
// subdomain is matched here so the edge gate runs regardless of host. ADMIN_HOST allows an
// exact override. See docs/OPERATOR_CONSOLE.md.
function isAdminHost(request: NextRequest): boolean {
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();
  const configured = process.env.ADMIN_HOST?.toLowerCase();
  return host.startsWith("admin.") || (!!configured && host === configured);
}

// Operator gate. Separate secret (OPERATOR_AUTH_SECRET), separate cookie, audience-bound
// JWT so a tenant session can never satisfy it. Layer 2 (the OperatorUser allow-list) is
// enforced in lib/ops/context on the server. `opsPath` is the effective /ops… or /api/ops…
// path; `rewriteTo` is set when an admin-host page path must be rewritten under /ops.
async function gateOperator(
  request: NextRequest,
  opsPath: string,
  rewriteTo?: URL,
): Promise<NextResponse> {
  const proceed = () => (rewriteTo ? NextResponse.rewrite(rewriteTo) : NextResponse.next());

  // Public within the operator plane: the login page and the login POST.
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ZKTeco ADMS device callbacks — no session, on any host.
  if (pathname.startsWith("/iclock")) {
    return NextResponse.next();
  }

  // --- Operator console subdomain (admin.*) ---
  // Pages are served bare (e.g. admin.host/organizations) and rewritten under /ops.
  if (isAdminHost(request)) {
    if (pathname.startsWith("/api")) {
      // Only operator APIs are valid on the admin host; gate them, let others fall through.
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

  // --- App host: operator console at /ops (path-based, e.g. local dev) ---
  if (pathname.startsWith("/ops") || pathname.startsWith("/api/ops")) {
    return gateOperator(request, pathname);
  }

  // --- Tenant app plane (existing custom auth) ---
  if (pathname === "/login") {
    return NextResponse.next();
  }
  if (pathname === "/api/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }

  // Only the tenant-gated routes are protected here; everything else self-guards.
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

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  try {
    await jwtVerify(token, key, { algorithms: ["HS256"] });
    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
}

export const config = {
  // Catch-all so the admin-host rewrite can map bare paths (e.g. "/") to /ops. Static assets
  // and files with an extension are excluded. Non-gated paths early-return inside middleware.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
