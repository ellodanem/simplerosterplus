import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getApprovedBlockMap } from "@/lib/leave-blocks";
import { staffEligibleForRosterWeek, staffIdsWithRosterEntries } from "@/lib/roster-display-staff";
import { isRosterWeekLocked } from "@/lib/roster-week-lock";
import { formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import { daysOfWeek, weekEndYmd, ymdForDbDate } from "@/lib/roster-week";

type Ctx = { params: Promise<{ id: string }> };

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * POST /api/roster/weeks/[id]/entries/batch
 * Body: { staffId, dates: YYYY-MM-DD[], shiftTemplateId: string | null }
 *
 * Used by "apply to whole week" so one UI action becomes one request. Validation still
 * happens server-side for every date, but week lookup, staff lookup, and template lookup
 * happen once instead of once per day.
 */
export async function POST(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: {
      id: true,
      weekStart: true,
      locationId: true,
      location: { select: { timeZone: true } },
      organization: { select: { timeZone: true } },
    },
  });
  if (!week) return NextResponse.json({ error: "Roster week not found" }, { status: 404 });

  const anchorYmd = ymdForDbDate(week.weekStart);
  const timeZone = week.location.timeZone ?? week.organization.timeZone;
  if (isRosterWeekLocked(anchorYmd, timeZone)) {
    return NextResponse.json(
      { error: "This roster week is locked (read-only)." },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const staffId = typeof body.staffId === "string" ? body.staffId : "";
  const datesRaw = Array.isArray(body.dates) ? body.dates : [];
  const shiftTemplateIdRaw = body.shiftTemplateId;
  const shiftTemplateId =
    typeof shiftTemplateIdRaw === "string" && shiftTemplateIdRaw
      ? shiftTemplateIdRaw
      : shiftTemplateIdRaw === null
        ? null
        : undefined;

  if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  if (shiftTemplateId === undefined) {
    return NextResponse.json(
      { error: "shiftTemplateId must be a string or null" },
      { status: 400 },
    );
  }

  const uniqueDates = Array.from(
    new Set(datesRaw.filter((value): value is string => typeof value === "string")),
  ).sort();
  if (uniqueDates.length === 0) {
    return NextResponse.json({ error: "dates must contain at least one YYYY-MM-DD value" }, { status: 400 });
  }
  if (uniqueDates.some((date) => !YMD_RE.test(date))) {
    return NextResponse.json({ error: "dates must be YYYY-MM-DD" }, { status: 400 });
  }

  const validDays = new Set(daysOfWeek(anchorYmd));
  const outsideWeek = uniqueDates.find((date) => !validDays.has(date));
  if (outsideWeek) {
    return NextResponse.json(
      { error: `${outsideWeek} is outside the roster week` },
      { status: 400 },
    );
  }

  const staff = await prisma.staff.findFirst({
    where: { id: staffId, organizationId: session.orgId },
    select: {
      id: true,
      locationId: true,
      firstName: true,
      lastName: true,
      startDate: true,
      archivedAt: true,
      excludeFromRoster: true,
    },
  });
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  if (staff.locationId !== week.locationId) {
    return NextResponse.json(
      { error: "Staff is assigned to a different location than this roster." },
      { status: 409 },
    );
  }

  const weekEntries = await prisma.rosterEntry.findMany({
    where: { rosterWeekId: week.id },
    select: { staffId: true, shiftTemplateId: true },
  });
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  if (
    !staffEligibleForRosterWeek(staff, {
      weekEndYmd: weekEndYmd(anchorYmd),
      todayYmd,
      staffIdsWithEntries: staffIdsWithRosterEntries(weekEntries),
    })
  ) {
    return NextResponse.json(
      { error: "This staff member cannot be scheduled on this roster week." },
      { status: 409 },
    );
  }

  const dateByYmd = new Map(uniqueDates.map((date) => [date, utcDateFromYmd(date)]));

  if (shiftTemplateId !== null) {
    const [template, holidays, blockMap] = await Promise.all([
      prisma.shiftTemplate.findFirst({
        where: { id: shiftTemplateId, organizationId: session.orgId },
        select: { id: true },
      }),
      prisma.publicHoliday.findMany({
        where: {
          organizationId: session.orgId,
          locationId: week.locationId,
          stationClosed: true,
          date: { in: uniqueDates.map((date) => dateByYmd.get(date)!) },
        },
        select: { date: true, name: true },
      }),
      getApprovedBlockMap({
        staffIds: [staff.id],
        rangeStartDate: dateByYmd.get(uniqueDates[0])!,
        rangeEndDate: dateByYmd.get(uniqueDates[uniqueDates.length - 1])!,
      }),
    ]);
    if (!template) {
      return NextResponse.json({ error: "Shift template not found" }, { status: 404 });
    }

    const holidayByYmd = new Map(holidays.map((holiday) => [ymdForDbDate(holiday.date), holiday.name]));
    for (const date of uniqueDates) {
      const holidayName = holidayByYmd.get(date);
      if (holidayName) {
        return NextResponse.json(
          { error: `Cannot assign a shift on a closed holiday (${holidayName}).` },
          { status: 409 },
        );
      }
      const block = blockMap[`${staff.id}__${date}`];
      if (block === "vacation") {
        return NextResponse.json(
          { error: `${staff.firstName} ${staff.lastName} is on vacation on ${date}.` },
          { status: 409 },
        );
      }
      if (block === "dayOff") {
        return NextResponse.json(
          { error: `${staff.firstName} ${staff.lastName} has an approved day off on ${date}.` },
          { status: 409 },
        );
      }
    }

    await prisma.$transaction(
      uniqueDates.map((date) =>
        prisma.rosterEntry.upsert({
          where: {
            rosterWeekId_staffId_date: {
              rosterWeekId: week.id,
              staffId,
              date: dateByYmd.get(date)!,
            },
          },
          create: {
            rosterWeekId: week.id,
            staffId,
            date: dateByYmd.get(date)!,
            shiftTemplateId,
          },
          update: { shiftTemplateId },
        }),
      ),
    );
  } else {
    await prisma.rosterEntry.deleteMany({
      where: {
        rosterWeekId: week.id,
        staffId,
        date: { in: uniqueDates.map((date) => dateByYmd.get(date)!) },
      },
    });
  }

  return NextResponse.json({
    entries: uniqueDates.map((date) => ({
      staffId,
      date,
      shiftTemplateId,
    })),
  });
}
