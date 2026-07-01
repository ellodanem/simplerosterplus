import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getApprovedBlockMap } from "@/lib/leave-blocks";
import { staffEligibleForRosterWeek } from "@/lib/roster-display-staff";
import {
  isRosterDayLocked,
  isRosterWeekLocked,
  rosterLockFromShareToken,
  rosterUnlockedDays,
} from "@/lib/roster-week-lock";
import { formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import { weekEndYmd, ymdForDbDate } from "@/lib/roster-week";

type Ctx = { params: Promise<{ id: string }> };

const ONE_DAY_MS = 86_400_000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * ONE_DAY_MS);
}

/**
 * POST /api/roster/weeks/[id]/copy-previous
 * Copies shifts from the prior week into unlocked days of the target week.
 * Preserves locked days, closed holidays, and approved leave blocks.
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const target = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: {
      id: true,
      weekStart: true,
      shareToken: true,
      organizationId: true,
      locationId: true,
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
    },
  });
  if (!target) return NextResponse.json({ error: "Roster week not found" }, { status: 404 });

  const anchorYmd = ymdForDbDate(target.weekStart);
  const timeZone = target.location.timeZone ?? target.organization.timeZone;
  const rosterLock = rosterLockFromShareToken(target.shareToken);
  if (isRosterWeekLocked(anchorYmd, timeZone, rosterLock)) {
    return NextResponse.json(
      { error: "This roster week is locked (read-only)." },
      { status: 403 },
    );
  }

  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const targetWeekEndYmd = weekEndYmd(anchorYmd);
  const unlockedYmds = rosterUnlockedDays(anchorYmd, todayYmd, rosterLock);
  const unlockedDateUtc = unlockedYmds.map((ymd) => utcDateFromYmd(ymd));
  const emptyEntries = new Set<string>();

  const prevWeekStart = new Date(target.weekStart.getTime() - SEVEN_DAYS_MS);

  const source = await prisma.rosterWeek.findUnique({
    where: {
      locationId_weekStart: {
        locationId: target.locationId,
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
      where: { rosterWeekId: target.id, shiftTemplateId: { not: null } },
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
        locationId: target.locationId,
        stationClosed: true,
        date: { gte: weekStartDate, lte: weekEndDate },
      },
      select: { date: true },
    }),
    prisma.staff.findMany({
      where: { organizationId: target.organizationId, locationId: target.locationId },
      select: {
        id: true,
        startDate: true,
        archivedAt: true,
        excludeFromRoster: true,
      },
    }),
  ]);

  const closedDateMs = new Set(holidays.map((h) => h.date.getTime()));
  const staffById = new Map(allStaff.map((s) => [s.id, s]));
  const membershipArgs = {
    weekEndYmd: targetWeekEndYmd,
    todayYmd,
    staffIdsWithEntries: emptyEntries,
  };

  const blockMap = await getApprovedBlockMap({
    staffIds: allStaff.map((s) => s.id),
    rangeStartDate: weekStartDate,
    rangeEndDate: weekEndDate,
  });

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
    const targetYmd = ymdForDbDate(targetDate);

    if (isRosterDayLocked(targetYmd, anchorYmd, todayYmd, rosterLock)) {
      skipped++;
      continue;
    }

    if (closedDateMs.has(targetDate.getTime())) {
      skipped++;
      continue;
    }

    const staff = staffById.get(e.staffId);
    if (!staff || !staffEligibleForRosterWeek(staff, membershipArgs)) {
      skipped++;
      continue;
    }

    if (blockMap[`${e.staffId}__${targetYmd}`]) {
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
    ...(unlockedDateUtc.length > 0
      ? [
          prisma.rosterEntry.deleteMany({
            where: {
              rosterWeekId: target.id,
              date: { in: unlockedDateUtc },
            },
          }),
        ]
      : []),
    ...(toInsert.length > 0
      ? [
          prisma.rosterEntry.createMany({
            data: toInsert.map((d) => ({ ...d, rosterWeekId: target.id })),
          }),
        ]
      : []),
  ]);

  const allEntries = await prisma.rosterEntry.findMany({
    where: { rosterWeekId: target.id, shiftTemplateId: { not: null } },
    select: { staffId: true, date: true, shiftTemplateId: true },
  });

  return NextResponse.json({
    copied: toInsert.length,
    skipped,
    entries: allEntries.map((e) => ({
      staffId: e.staffId,
      date: ymdForDbDate(e.date),
      shiftTemplateId: e.shiftTemplateId,
    })),
  });
}
