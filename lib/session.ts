import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { SESSION_COOKIE, SESSION_MAX_AGE_SEC } from "@/lib/auth-cookie";
import { clerkConfigured } from "@/lib/clerk/config";
import { resolveClerkSession } from "@/lib/clerk/resolve-session";

export type SessionPayload = {
  sub: string;
  orgId: string;
  email: string;
  /** When true the session is view-only (operator impersonation). Mutations are rejected. */
  readOnly?: boolean;
  /** OperatorUser.id that started impersonation; present only on read-only sessions. */
  impersonatedBy?: string;
  /** Organization display name — shown in the impersonation banner. */
  orgName?: string;
};

export type SignSessionOptions = {
  maxAgeSec?: number;
  readOnly?: boolean;
  impersonatedBy?: string;
  orgName?: string;
};

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("AUTH_SECRET must be set and at least 16 characters.");
  }
  return new TextEncoder().encode(secret);
}

export function isReadOnlySession(session: SessionPayload): boolean {
  return session.readOnly === true;
}

export async function signSession(
  payload: SessionPayload,
  opts?: SignSessionOptions,
): Promise<string> {
  const claims: Record<string, unknown> = {
    orgId: payload.orgId,
    email: payload.email,
  };
  if (opts?.readOnly) claims.readOnly = true;
  if (opts?.impersonatedBy) claims.impersonatedBy = opts.impersonatedBy;
  if (opts?.orgName) claims.orgName = opts.orgName;

  const maxAge = opts?.maxAgeSec ?? SESSION_MAX_AGE_SEC;
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${maxAge}s`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const orgId = typeof payload.orgId === "string" ? payload.orgId : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!sub || !orgId || !email) return null;

    const session: SessionPayload = { sub, orgId, email };
    if (payload.readOnly === true) session.readOnly = true;
    if (typeof payload.impersonatedBy === "string") session.impersonatedBy = payload.impersonatedBy;
    if (typeof payload.orgName === "string") session.orgName = payload.orgName;
    return session;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const jwtSession = await verifySessionToken(token);
    if (jwtSession) return jwtSession;
  }

  if (clerkConfigured()) {
    return resolveClerkSession();
  }

  return null;
}

/** Reject mutating handlers when the caller is in a read-only impersonation session. */
export async function requireWritableSession(): Promise<SessionPayload | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (isReadOnlySession(session)) {
    return NextResponse.json(
      { error: "Read-only operator session — changes are not allowed." },
      { status: 403 },
    );
  }
  return session;
}
