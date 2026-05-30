// Operator console session cookie. Deliberately SEPARATE from the tenant app's
// `srp_session` (see lib/auth-cookie.ts): different name, different secret, its own
// audience claim. On the planned `admin.simplerosterplus.com` subdomain this cookie is
// scoped to that host, so a customer session can never satisfy the operator gate and
// vice-versa. See docs/OPERATOR_CONSOLE.md.

export const OPERATOR_SESSION_COOKIE = "srp_operator_session";

// Shorter than the tenant session: the control plane has a larger blast radius, so we
// re-authenticate operators more often.
export const OPERATOR_SESSION_MAX_AGE_SEC = 60 * 60 * 8; // 8 hours

// JWT audience — verified on every request so a tenant token can't be replayed here.
export const OPERATOR_JWT_AUDIENCE = "srp-operator";

export function operatorSessionCookieOptions(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSec,
  };
}
