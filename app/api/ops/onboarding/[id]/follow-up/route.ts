import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import {
  OnboardingFollowUpError,
  previewOnboardingFollowUp,
  scheduleManualOnboardingFollowUp,
  sendManualOnboardingFollowUp,
} from "@/lib/onboarding-funnel/follow-up";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";

type Ctx = { params: Promise<{ id: string }> };

function errorResponse(error: unknown) {
  if (error instanceof OnboardingFollowUpError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("[ops:onboarding-follow-up] unexpected error", error);
  return NextResponse.json({ error: "Follow-up action failed." }, { status: 500 });
}

/** Preview the recommended or selected template. Any authenticated operator may read. */
export async function GET(request: Request, { params }: Ctx) {
  const guard = await guardOperatorApi();
  if (!guard.ok) return guard.response;
  const { id } = await params;
  const templateKey = new URL(request.url).searchParams.get("templateKey");
  try {
    return NextResponse.json(
      await previewOnboardingFollowUp(id, templateKey),
    );
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * POST /api/ops/onboarding/[id]/follow-up
 * Body: { action: "send" | "schedule", requestKey?, templateKey?, scheduledFor? }
 */
export async function POST(request: Request, { params }: Ctx) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;
  const { id } = await params;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";
  const requestKey =
    typeof body.requestKey === "string" && body.requestKey.trim()
      ? body.requestKey.trim()
      : randomUUID();
  const templateKey =
    typeof body.templateKey === "string" ? body.templateKey : null;

  try {
    if (action === "send") {
      const result = await sendManualOnboardingFollowUp({
        progressId: id,
        operatorUserId: guard.ctx.operatorUserId,
        requestKey,
        templateKey,
      });
      await recordOperatorAudit({
        operatorUserId: guard.ctx.operatorUserId,
        action: "onboarding.followup.send",
        targetType: "onboardingProgress",
        targetId: id,
        metadata: {
          followUpId: result.followUpId,
          status: result.status,
          duplicate: result.duplicate,
          templateKey,
        },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "schedule") {
      const rawScheduledFor =
        typeof body.scheduledFor === "string" ? body.scheduledFor : "";
      const result = await scheduleManualOnboardingFollowUp({
        progressId: id,
        operatorUserId: guard.ctx.operatorUserId,
        requestKey,
        templateKey,
        scheduledFor: new Date(rawScheduledFor),
      });
      await recordOperatorAudit({
        operatorUserId: guard.ctx.operatorUserId,
        action: "onboarding.followup.schedule",
        targetType: "onboardingProgress",
        targetId: id,
        metadata: {
          followUpId: result.followUpId,
          status: result.status,
          duplicate: result.duplicate,
          templateKey,
          scheduledFor: rawScheduledFor,
        },
      });
      return NextResponse.json({ ok: true, ...result });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: `onboarding.followup.${action || "unknown"}.failed`,
      targetType: "onboardingProgress",
      targetId: id,
      metadata: {
        code:
          error instanceof OnboardingFollowUpError ? error.code : "unexpected",
      },
    });
    return errorResponse(error);
  }
}
