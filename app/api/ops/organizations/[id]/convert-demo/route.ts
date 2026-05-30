import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";

const DAY_MS = 24 * 60 * 60 * 1000;

// Convert a demo sandbox into a real trial: clear demo flags, start a trial. Billing+.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("billing");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { days?: number };
  try {
    body = (await request.json().catch(() => ({}))) as { days?: number };
  } catch {
    body = {};
  }
  const days = Number.isFinite(body.days) ? Math.round(body.days as number) : 14;

  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      isDemo: true,
      demoExpiresAt: true,
      trialEndsAt: true,
      subscriptionStatus: true,
    },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  if (!org.isDemo) {
    return NextResponse.json({ error: "Organization is not a demo" }, { status: 409 });
  }

  const nextTrialEndsAt = new Date(Date.now() + days * DAY_MS);
  await prisma.organization.update({
    where: { id },
    data: {
      isDemo: false,
      demoExpiresAt: null,
      trialEndsAt: nextTrialEndsAt,
      subscriptionStatus: "trialing",
    },
  });

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "org.convert_demo",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      days,
      before: {
        isDemo: org.isDemo,
        demoExpiresAt: org.demoExpiresAt,
        trialEndsAt: org.trialEndsAt,
        subscriptionStatus: org.subscriptionStatus,
      },
      after: {
        isDemo: false,
        demoExpiresAt: null,
        trialEndsAt: nextTrialEndsAt,
        subscriptionStatus: "trialing",
      },
    },
  });

  return NextResponse.json({ ok: true, trialEndsAt: nextTrialEndsAt });
}
