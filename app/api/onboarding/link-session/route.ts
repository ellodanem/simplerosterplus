import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  ONBOARDING_ANON_COOKIE,
  linkAnonymousOnboardingSession,
  recordMilestone,
} from "@/lib/onboarding-funnel/record-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANON_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * POST /api/onboarding/link-session
 * Authenticated: attach anonymous signup session to the current AppUser.
 * Body: { anonymousSessionId?: string } — falls back to cookie.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // empty body ok — use cookie
  }

  const jar = await cookies();
  const fromBody =
    typeof body.anonymousSessionId === "string" ? body.anonymousSessionId.trim() : "";
  const fromCookie = jar.get(ONBOARDING_ANON_COOKIE)?.value?.trim() ?? "";
  const anonymousSessionId = fromBody || fromCookie;
  if (!anonymousSessionId || !ANON_RE.test(anonymousSessionId)) {
    return NextResponse.json({ ok: true, linked: false, reason: "no_anonymous_session" });
  }

  const user = await prisma.appUser.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      organizationId: true,
      organization: { select: { name: true } },
    },
  });
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await linkAnonymousOnboardingSession({
    anonymousSessionId,
    userId: user.id,
    organizationId: user.organizationId,
    contactEmail: user.email,
    businessName: user.organization.name,
  });

  // Ensure account_created exists even if provision tracking raced.
  await recordMilestone({
    stage: "account_created",
    source: "link_session",
    userId: user.id,
    organizationId: user.organizationId,
    anonymousSessionId,
    contactEmail: user.email,
    businessName: user.organization.name,
  });

  const res = NextResponse.json({ ok: true, linked: true });
  res.cookies.set(ONBOARDING_ANON_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
