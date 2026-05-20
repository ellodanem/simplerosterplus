import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  ROSTER_WEEK_START_WEEKDAY_KEY,
  getRosterWeekStartWeekday,
  weekStartWeekdayLabel,
} from "@/lib/roster-week-settings";

/**
 * GET /api/roster/settings
 * Returns org roster calendar settings (week start weekday).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const weekStartWeekday = await getRosterWeekStartWeekday(session.orgId);
  return NextResponse.json({
    weekStartWeekday,
    weekStartWeekdayLabel: weekStartWeekdayLabel(weekStartWeekday),
  });
}

/**
 * PUT /api/roster/settings
 * Body: { weekStartWeekday: number } — 0 (Sunday) through 6 (Saturday).
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const raw = body.weekStartWeekday;
  const parsed = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw) : NaN;
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 6) {
    return NextResponse.json(
      { error: "weekStartWeekday must be an integer from 0 (Sunday) to 6 (Saturday)" },
      { status: 400 },
    );
  }

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: {
        organizationId: session.orgId,
        key: ROSTER_WEEK_START_WEEKDAY_KEY,
      },
    },
    create: {
      organizationId: session.orgId,
      key: ROSTER_WEEK_START_WEEKDAY_KEY,
      value: String(parsed),
    },
    update: { value: String(parsed) },
  });

  return NextResponse.json({
    weekStartWeekday: parsed,
    weekStartWeekdayLabel: weekStartWeekdayLabel(parsed),
  });
}
