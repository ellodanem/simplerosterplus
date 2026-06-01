import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { shouldRejectDemoLoginInProduction } from "@/lib/production-hardening";
import {
  OPERATOR_SESSION_COOKIE,
  operatorSessionCookieOptions,
  OPERATOR_SESSION_MAX_AGE_SEC,
} from "@/lib/ops/auth-cookie";
import { signOperatorSession, operatorSecretConfigured } from "@/lib/ops/session";
import { recordOperatorAudit } from "@/lib/ops/audit";

export async function POST(request: Request) {
  if (!operatorSecretConfigured()) {
    return NextResponse.json(
      { error: "OPERATOR_AUTH_SECRET is not configured" },
      { status: 500 },
    );
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

  if (shouldRejectDemoLoginInProduction(email, password)) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const operator = await prisma.operatorUser.findUnique({
    where: { email },
    select: { id: true, email: true, role: true, passwordHash: true, disabledAt: true },
  });

  // Uniform failure for missing / disabled / no-password to avoid enumeration.
  if (!operator || operator.disabledAt || !operator.passwordHash) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const ok = await verifyPassword(password, operator.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  const token = await signOperatorSession({
    sub: operator.id,
    email: operator.email,
    role: operator.role,
  });

  await prisma.operatorUser.update({
    where: { id: operator.id },
    data: { lastLoginAt: new Date() },
  });
  await recordOperatorAudit({
    operatorUserId: operator.id,
    action: "auth.login",
    targetType: "session",
    targetId: operator.id,
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    OPERATOR_SESSION_COOKIE,
    token,
    operatorSessionCookieOptions(OPERATOR_SESSION_MAX_AGE_SEC),
  );
  return res;
}
