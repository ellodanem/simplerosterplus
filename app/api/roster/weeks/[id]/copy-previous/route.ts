import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ymdForDbDate } from "@/lib/roster-week";

type Ctx = { params: Promise<{ id: string }> };

const ONE_DAY_MS = 86_400_000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * ONE_DAY_MS);
}

/**
 * POST /api/roster/weeks/[id]/copy-previous
 * Replaces the target week with shifts copied from the prior week (same org).
 * Skips target cells that fall on a closed holiday or inside the staff's vacation.
 * Returns the resulting entries so the client can refresh without a round-trip.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const target = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: { id: true, weekStart: true, organizationId: true },
  });
  if (!target) return NextResponse.json({ error: "Roster week not found" }, { status: 404 });

  const prevWeekStart = new Date(target.weekStart.getTime() - SEVEN_DAYS_MS);

  const source = await prisma.rosterWeek.findUnique({
    where: {
      organizationId_weekStart: {
        organizationId: target.organizationId,
        weekStart: prevWeekStart,
      },
    },
    select: { id: true },
  });

  const sourceEntries = source
    ? await prisma.rosterEntry.findMany({
        where: { rosterWeekId: source.id, shiftTemplateId: { not: null } },
        select: {
          staffId: true,
          date: true,
          shiftTemplateId: true,
          position: true,
          notes: true,
        },
      })
    : [];

  if (sourceEntries.length === 0) {
    const existing = await prisma.rosterEntry.findMany({
      where: { rosterWeekId: target.id },
      select: { staffId: true, date: true, shiftTemplateId: true },
    });
    return NextResponse.json({
      copied: 0,
      skipped: 0,
      entries: existing.map((e) => ({
        staffId: e.staffId,
        date: ymdForDbDate(e.date),
        shiftTemplateId: e.shiftTemplateId,
      })),
    });
  }

  const weekStartDate = target.weekStart;
  const weekEndDate = addDaysUtc(weekStartDate, 6);

  const [holidays, allStaff] = await Promise.all([
    prisma.publicHoliday.findMany({
      where: {
        organizationId: target.organizationId,
        stationClosed: true,
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: { date: true },
    }),
    prisma.staff.findMany({
      where: { organizationId: target.organizationId },
      select: { id: true, vacationStart: true, vacationEnd: true },
    }),
  ]);

  const closedDateMs = new Set(holidays.map((h) => h.date.getTime()));
  const staffById = new Map(allStaff.map((s) => [s.id, s]));

  const toInsert: {
    staffId: string;
    date: Date;
    shiftTemplateId: string;
    position: string | null;
    notes: string | null;
  }[] = [];
  let skipped = 0;

  for (const e of sourceEntries) {
    if (!e.shiftTemplateId) {
      skipped++;
      continue;
    }
    const targetDate = addDaysUtc(e.date, 7);

    if (closedDateMs.has(targetDate.getTime())) {
      skipped++;
      continue;
    }

    const staff = staffById.get(e.staffId);
    if (!staff) {
      skipped++;
      continue;
    }
    if (
      staff.vacationStart &&
      staff.vacationEnd &&
      targetDate.getTime() >= staff.vacationStart.getTime() &&
      targetDate.getTime() <= staff.vacationEnd.getTime()
    ) {
      skipped++;
      continue;
    }

    toInsert.push({
      staffId: e.staffId,
      date: targetDate,
      shiftTemplateId: e.shiftTemplateId,
      position: e.position,
      notes: e.notes,
    });
  }

  await prisma.$transaction([
    prisma.rosterEntry.deleteMany({ where: { rosterWeekId: target.id } }),
    ...(toInsert.length > 0
      ? [
          prisma.rosterEntry.createMany({
            data: toInsert.map((d) => ({ ...d, rosterWeekId: target.id })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({
    copied: toInsert.length,
    skipped,
    entries: toInsert.map((e) => ({
      staffId: e.staffId,
      date: ymdForDbDate(e.date),
      shiftTemplateId: e.shiftTemplateId,
    })),
  });
}
