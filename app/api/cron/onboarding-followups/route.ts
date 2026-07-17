import { NextResponse } from "next/server";
import { runOnboardingFollowUpCycle } from "@/lib/onboarding-funnel/automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  return request.headers.get("x-cron-secret") === secret;
}

/**
 * Detect abandonment, optionally plan automatic sequence rows, and deliver due
 * scheduled follow-ups. Safe for repeated cron invocations.
 */
export async function POST(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runOnboardingFollowUpCycle();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron:onboarding-followups] cycle failed", error);
    return NextResponse.json(
      { error: "Onboarding follow-up cycle failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
