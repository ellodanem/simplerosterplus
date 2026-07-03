import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { RULE_TEMPLATES, type SchedulingRuleRecord } from "@/lib/scheduling-rule-registry";

function toRecord(row: {
  id: string;
  type: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  params: unknown;
}): SchedulingRuleRecord {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    enabled: row.enabled,
    sortOrder: row.sortOrder,
    params: (row.params && typeof row.params === "object" && !Array.isArray(row.params)
      ? row.params
      : {}) as Record<string, unknown>,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.schedulingRule.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const template = RULE_TEMPLATES[existing.type];
  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (typeof body.sortOrder === "number") data.sortOrder = body.sortOrder;
  if (body.params && typeof body.params === "object" && !Array.isArray(body.params)) {
    data.params = { ...(template?.defaultParams ?? {}), ...(body.params as object) };
  }

  const row = await prisma.schedulingRule.update({ where: { id }, data });
  return NextResponse.json(toRecord(row));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await context.params;
  const existing = await prisma.schedulingRule.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.schedulingRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
