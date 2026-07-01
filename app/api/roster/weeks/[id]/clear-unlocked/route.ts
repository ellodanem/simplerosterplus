import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getApprovedBlockMap } from "@/lib/leave-blocks";
import { isRosterWeekLocked, rosterLockFromShareToken, rosterUnlockedDays } from "@/lib/roster-week-lock";
import { formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import { ymdForDbDate } from "@/lib/roster-week";

type Ctx = { params: Promise<{ id: string }> };

const ONE_DAY_MS = 86_400_000;

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * ONE_DAY_MS);
}

/**
 * POST /api/roster/weeks/[id]/clear-unlocked
 * Removes assigned shifts on unlocked days only. Locked days and approved leave are preserved.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: {
      id: true,
      weekStart: true,
      shareToken: true,
      locationId: true,
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
    },
  });
  if (!week) return NextResponse.json({ error: "Roster week not found" }, { status: 404 });

  const anchorYmd = ymdForDbDate(week.weekStart);
  const timeZone = week.location.timeZone ?? week.organization.timeZone;
  const rosterLock = rosterLockFromShareToken(week.shareToken);
  if (isRosterWeekLocked(anchorYmd, timeZone, rosterLock)) {
    return NextResponse.json(
      { error: "This roster week is locked (read-only)." },
      { status: 403 },
    );
  }

  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const unlockedYmds = rosterUnlockedDays(anchorYmd, todayYmd, rosterLock);
  if (unlockedYmds.length === 0) {
    return NextResponse.json({ error: "All days in this week are locked." }, { status: 403 });
  }

  const unlockedDates = unlockedYmds.map((ymd) => utcDateFromYmd(ymd));
  const weekEndDate = addDaysUtc(week.weekStart, 6);

  const [staff, candidates] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: session.orgId, locationId: week.locationId },
      select: { id: true },
    }),
    prisma.rosterEntry.findMany({
      where: {
        rosterWeekId: week.id,
        shiftTemplateId: { not: null },
        date: { in: unlockedDates },
      },
      select: { id: true, staffId: true, date: true },
    }),
  ]);

  const blockMap = await getApprovedBlockMap({
    staffIds: staff.map((s) => s.id),
    rangeStartDate: week.weekStart,
    rangeEndDate: weekEndDate,
  });

  const toDelete = candidates.filter(
    (entry) => !blockMap[`${entry.staffId}__${ymdForDbDate(entry.date)}`],
  );
  const skipped = candidates.length - toDelete.length;

  if (toDelete.length > 0) {
    await prisma.rosterEntry.deleteMany({
      where: {
        rosterWeekId: week.id,
        id: { in: toDelete.map((entry) => entry.id) },
      },
    });
  }

  const remaining = await prisma.rosterEntry.findMany({
    where: { rosterWeekId: week.id, shiftTemplateId: { not: null } },
    select: { staffId: true, date: true, shiftTemplateId: true },
  });

  return NextResponse.json({
    cleared: toDelete.length,
    skipped,
    entries: remaining.map((entry) => ({
      staffId: entry.staffId,
      date: ymdForDbDate(entry.date),
      shiftTemplateId: entry.shiftTemplateId,
    })),
  });
}
