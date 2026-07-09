import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SCHEDULING_RULES_ENABLED } from "@/lib/auto-scheduler-feature";
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

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await prisma.schedulingRule.findMany({
    where: { organizationId: session.orgId },
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json({ rules: rows.map(toRecord), templates: RULE_TEMPLATES });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!SCHEDULING_RULES_ENABLED) {
    return NextResponse.json({ error: "Scheduling rules are not available yet." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const type = typeof body.type === "string" ? body.type : "";
  if (!RULE_TEMPLATES[type]) {
    return NextResponse.json({ error: `Unknown rule type: ${type}` }, { status: 400 });
  }

  const name = typeof body.name === "string" && body.name.trim() ? body.name.trim() : RULE_TEMPLATES[type]!.label;
  const enabled = body.enabled !== false;
  const params = body.params && typeof body.params === "object" && !Array.isArray(body.params)
    ? body.params
    : RULE_TEMPLATES[type]!.defaultParams;

  const maxSort = await prisma.schedulingRule.aggregate({
    where: { organizationId: session.orgId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const row = await prisma.schedulingRule.create({
    data: {
      organizationId: session.orgId,
      type,
      name,
      enabled,
      sortOrder,
      params: params as object,
    },
  });

  return NextResponse.json(toRecord(row), { status: 201 });
}
