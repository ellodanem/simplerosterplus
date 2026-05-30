import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";

const DAY_MS = 24 * 60 * 60 * 1000;

// Extend (or start) a trial by N days. Billing lifecycle → billing role or higher.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("billing");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { days?: number };
  try {
    body = (await request.json()) as { days?: number };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const days = Number.isFinite(body.days) ? Math.round(body.days as number) : 14;
  if (days <= 0 || days > 365) {
    return NextResponse.json({ error: "days must be between 1 and 365" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, trialEndsAt: true, subscriptionStatus: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  // Extend from the later of "now" or the existing trial end, so extending an active trial
  // adds time rather than shortening it.
  const base = org.trialEndsAt && org.trialEndsAt.getTime() > Date.now() ? org.trialEndsAt : new Date();
  const nextTrialEndsAt = new Date(base.getTime() + days * DAY_MS);
  const nextStatus = org.subscriptionStatus ?? "trialing";

  await prisma.organization.update({
    where: { id },
    data: { trialEndsAt: nextTrialEndsAt, subscriptionStatus: nextStatus },
  });

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: "org.extend_trial",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      days,
      before: { trialEndsAt: org.trialEndsAt, subscriptionStatus: org.subscriptionStatus },
      after: { trialEndsAt: nextTrialEndsAt, subscriptionStatus: nextStatus },
    },
  });

  return NextResponse.json({ ok: true, trialEndsAt: nextTrialEndsAt });
}
