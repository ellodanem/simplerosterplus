import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";

// Suspend / reactivate an organization. Highest-impact lifecycle action → superadmin only.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("superadmin");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { action?: string; reason?: string };
  try {
    body = (await request.json()) as { action?: string; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = body.action;
  if (action !== "suspend" && action !== "reactivate") {
    return NextResponse.json(
      { error: "action must be 'suspend' or 'reactivate'" },
      { status: 400 },
    );
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  const org = await prisma.organization.findUnique({
    where: { id },
    select: { id: true, name: true, suspendedAt: true },
  });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const nextSuspendedAt = action === "suspend" ? new Date() : null;
  await prisma.organization.update({
    where: { id },
    data: { suspendedAt: nextSuspendedAt },
  });

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: `org.${action}`,
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      reason: reason || null,
      before: { suspendedAt: org.suspendedAt },
      after: { suspendedAt: nextSuspendedAt },
    },
  });

  return NextResponse.json({ ok: true, suspendedAt: nextSuspendedAt });
}
