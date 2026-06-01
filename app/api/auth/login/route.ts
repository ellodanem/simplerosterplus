import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { shouldRejectDemoLoginInProduction } from "@/lib/production-hardening";
import { SESSION_COOKIE, sessionCookieOptions, SESSION_MAX_AGE_SEC } from "@/lib/auth-cookie";
import { signSession } from "@/lib/session";

export async function POST(request: Request) {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 16) {
    return NextResponse.json({ error: "AUTH_SECRET is not configured" }, { status: 500 });
  }

  let body: { email?: string; password?: string; organizationId?: string };
  try {
    body = (await request.json()) as { email?: string; password?: string; organizationId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const organizationId =
    typeof body.organizationId === "string" ? body.organizationId.trim() : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (shouldRejectDemoLoginInProduction(email, password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const candidates = await prisma.appUser.findMany({
    where: { email },
    select: {
      id: true,
      organizationId: true,
      email: true,
      passwordHash: true,
      organization: { select: { id: true, name: true } },
    },
  });

  const matching: typeof candidates = [];
  for (const user of candidates) {
    if (await verifyPassword(password, user.passwordHash)) {
      matching.push(user);
    }
  }

  if (matching.length === 0) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  if (matching.length > 1 && !organizationId) {
    return NextResponse.json(
      {
        error: "Multiple organizations use this email. Choose which one to sign in to.",
        code: "ORG_SELECT_REQUIRED",
        organizations: matching.map((user) => ({
          id: user.organizationId,
          name: user.organization.name,
        })),
      },
      { status: 409 },
    );
  }

  const user =
    matching.length === 1
      ? matching[0]
      : matching.find((candidate) => candidate.organizationId === organizationId);

  if (!user) {
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
