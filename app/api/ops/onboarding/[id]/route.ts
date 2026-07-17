import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/ops/onboarding/[id]
 * Body: { action: "clear_abandoned" | "suppress" | "unsuppress" | "mark_contacted" | "clear_needs_support" | "add_note", note?: string }
 */
export async function PATCH(request: Request, { params }: Ctx) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const progress = await prisma.onboardingProgress.findUnique({ where: { id } });
  if (!progress) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  if (action === "clear_abandoned") {
    await prisma.onboardingProgress.update({
      where: { id },
      data: { abandonedAt: null, abandonmentReason: null },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.clear_abandoned",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "suppress") {
    await prisma.onboardingProgress.update({
      where: { id },
      data: {
        doNotContact: true,
        followUpStatus: "suppressed",
        nextFollowUpAt: null,
      },
    });
    await prisma.onboardingFollowUp.updateMany({
      where: { onboardingProgressId: id, status: { in: ["draft", "scheduled"] } },
      data: { status: "cancelled" },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.suppress",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "unsuppress") {
    await prisma.onboardingProgress.update({
      where: { id },
      data: { doNotContact: false, followUpStatus: "none" },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.unsuppress",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "mark_contacted") {
    await prisma.onboardingProgress.update({
      where: { id },
      data: {
        followUpStatus: "contacted",
        lastFollowUpAt: new Date(),
        abandonedAt: null,
        abandonmentReason: null,
      },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.mark_contacted",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear_needs_support") {
    await prisma.onboardingProgress.update({
      where: { id },
      data: { needsSupport: false, supportResolvedAt: new Date() },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.clear_needs_support",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "add_note") {
    const note = typeof body.note === "string" ? body.note.trim() : "";
    if (!note) return NextResponse.json({ error: "note is required" }, { status: 400 });
    if (note.length > 4000) {
      return NextResponse.json({ error: "note is too long" }, { status: 400 });
    }
    await prisma.onboardingNote.create({
      data: {
        onboardingProgressId: id,
        userId: progress.userId,
        authorOperatorUserId: guard.ctx.operatorUserId,
        body: note,
      },
    });
    await recordOperatorAudit({
      operatorUserId: guard.ctx.operatorUserId,
      action: "onboarding.note",
      targetType: "onboardingProgress",
      targetId: id,
      organizationId: progress.organizationId,
      metadata: { length: note.length },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
