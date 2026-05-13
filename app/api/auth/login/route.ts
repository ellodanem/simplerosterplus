import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, sessionCookieOptions, SESSION_MAX_AGE_SEC } from "@/lib/auth-cookie";
import { signSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
  }

  let body: { email?: string; password?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  const user = await prisma.appUser.findFirst({
    where: { email },
    select: { id: true, organizationId: true, email: true, passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signSession({
    sub: user.id,
    orgId: user.organizationId,
    email: user.email,
  });

  const res = NextResponse.json({ ok: true, organizationId: user.organizationId });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_MAX_AGE_SEC));
  return res;
}
