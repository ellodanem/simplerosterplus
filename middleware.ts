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

// Operator console gate. Separate secret (OPERATOR_AUTH_SECRET), separate cookie, and an
// audience-bound JWT so a tenant session can never satisfy it. Layer 2 (the OperatorUser
// allow-list) is enforced in lib/ops/context on the server. See docs/OPERATOR_CONSOLE.md.
async function handleOperator(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Public within the operator plane: the login page and the login POST.
  if (pathname === "/ops/login") return NextResponse.next();
  if (pathname === "/api/ops/auth/login" && request.method === "POST") {
    return NextResponse.next();
  }

  const key = operatorSecretKey();
  if (key.length === 0) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Server misconfigured: OPERATOR_AUTH_SECRET" },
        { status: 500 },
      );
    }
    return NextResponse.redirect(new URL("/ops/login", request.url));
  }

  const token = request.cookies.get(OPERATOR_SESSION_COOKIE)?.value;
  const unauthorized = () => {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/ops/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  };

  if (!token) return unauthorized();
  try {
    await jwtVerify(token, key, {
      algorithms: ["HS256"],
      audience: OPERATOR_JWT_AUDIENCE,
    });
    return NextResponse.next();
  } catch {
    return unauthorized();
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ZKTeco ADMS device callbacks — no session; not in matcher below but documented for operators.
  if (pathname.startsWith("/iclock")) {
    return NextResponse.next();
  }

  // Operator console plane (its own auth boundary).
  if (pathname.startsWith("/ops") || pathname.startsWith("/api/ops")) {
    return handleOperator(request);
  }

  // --- Tenant app plane (existing custom auth) ---
  if (pathname === "/login") {
    return NextResponse.next();
  }

  if (pathname === "/api/auth/login" && request.method === "POST") {
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
  matcher: [
    "/staff/:path*",
    "/staff",
    "/roster/:path*",
    "/roster",
    "/attendance/:path*",
    "/attendance",
    "/api/staff/:path*",
    "/api/staff",
    "/api/roster/:path*",
    "/api/requests/:path*",
    "/api/requests",
    "/api/attendance/:path*",
    "/api/auth/me",
    "/api/auth/logout",
    // Operator console plane
    "/ops",
    "/ops/:path*",
    "/api/ops/:path*",
  ],
};
