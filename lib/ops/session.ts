import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  OPERATOR_SESSION_COOKIE,
  OPERATOR_SESSION_MAX_AGE_SEC,
  OPERATOR_JWT_AUDIENCE,
} from "@/lib/ops/auth-cookie";

// Operator JWT. Signed with OPERATOR_AUTH_SECRET — a DISTINCT secret from the tenant
// app's AUTH_SECRET, so the two token pools cannot cross-validate even if a cookie leaks
// across subdomains. See docs/OPERATOR_CONSOLE.md.

export type OperatorSessionPayload = {
  sub: string; // OperatorUser.id
  email: string;
  role: string; // OperatorRole
};

export function operatorSecretConfigured(): boolean {
  const secret = process.env.OPERATOR_AUTH_SECRET;
  return !!secret && secret.length >= 16;
}

export function operatorSecretKey(): Uint8Array {
  const secret = process.env.OPERATOR_AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("OPERATOR_AUTH_SECRET must be set and at least 16 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signOperatorSession(payload: OperatorSessionPayload): Promise<string> {
  return new SignJWT({ email: payload.email, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setAudience(OPERATOR_JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${OPERATOR_SESSION_MAX_AGE_SEC}s`)
    .sign(operatorSecretKey());
}

export async function verifyOperatorToken(
  token: string,
): Promise<OperatorSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, operatorSecretKey(), {
      algorithms: ["HS256"],
      audience: OPERATOR_JWT_AUDIENCE,
    });
    const sub = typeof payload.sub === "string" ? payload.sub : null;
    const email = typeof payload.email === "string" ? payload.email : null;
    const role = typeof payload.role === "string" ? payload.role : null;
    if (!sub || !email || !role) return null;
    return { sub, email, role };
  } catch {
    return null;
  }
}

export async function getOperatorSession(): Promise<OperatorSessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(OPERATOR_SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyOperatorToken(token);
}
