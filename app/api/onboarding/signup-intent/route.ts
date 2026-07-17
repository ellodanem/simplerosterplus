import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import {
  ONBOARDING_ANON_COOKIE,
  recordMilestone,
} from "@/lib/onboarding-funnel/record-event";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ANON_RE = /^[a-zA-Z0-9_-]{8,64}$/;

/**
 * POST /api/onboarding/signup-intent
 * Records signup_started after meaningful Clerk form interaction (not a page view).
 * Body: { anonymousSessionId?: string, source?: string }
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let anonymousSessionId =
    typeof body.anonymousSessionId === "string" ? body.anonymousSessionId.trim() : "";
  if (!anonymousSessionId) {
    anonymousSessionId = randomUUID().replace(/-/g, "");
  }
  if (!ANON_RE.test(anonymousSessionId)) {
    return NextResponse.json({ error: "Invalid anonymousSessionId" }, { status: 400 });
  }

  const signupSource =
    typeof body.source === "string" && body.source.trim()
      ? body.source.trim().slice(0, 64)
      : "self_serve";

  try {
    const result = await recordMilestone({
      stage: "signup_started",
      source: "signup_beacon",
      anonymousSessionId,
      signupSource,
      metadata: { intent: "signup" },
    });

    const res = NextResponse.json({
      ok: true,
      anonymousSessionId,
      created: result.created,
      progressId: result.progressId,
    });
    res.cookies.set(ONBOARDING_ANON_COOKIE, anonymousSessionId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    console.error("[onboarding] signup-intent failed", err);
    return NextResponse.json({ error: "Could not record signup intent" }, { status: 500 });
  }
}
