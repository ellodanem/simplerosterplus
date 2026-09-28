import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { guardOperatorApi } from "@/lib/ops/api";
import { recordOperatorAudit } from "@/lib/ops/audit";
import { DEFAULT_COLUMN_LAYOUT } from "@/lib/payroll/columns";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await guardOperatorApi("support");
  if (!guard.ok) return guard.response;

  const { id } = await params;
  let body: { enabled?: boolean; reason?: string };
  try {
    body = (await request.json()) as { enabled?: boolean; reason?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "enabled must be a boolean" }, { status: 400 });
  }

  const org = await prisma.organization.findUnique({ where: { id }, select: { id: true } });
  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  const config = await prisma.payrollConfig.upsert({
    where: { organizationId: id },
    create: {
      organizationId: id,
      enabled: body.enabled,
      countryCode: "LC",
      columnLayout: DEFAULT_COLUMN_LAYOUT,
    },
    update: { enabled: body.enabled },
    select: { enabled: true, countryCode: true },
  });

  await recordOperatorAudit({
    operatorUserId: guard.ctx.operatorUserId,
    action: body.enabled ? "org.payroll.enable" : "org.payroll.disable",
    targetType: "organization",
    targetId: id,
    organizationId: id,
    metadata: {
      reason: typeof body.reason === "string" ? body.reason.trim() || null : null,
      after: config,
    },
  });

  return NextResponse.json({ ok: true, ...config });
}
