export const SESSION_COOKIE = "srp_session";
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 7;

export function sessionCookieOptions(maxAgeSec: number) {
  const secure = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
    maxAge: maxAgeSec,
  };
}
