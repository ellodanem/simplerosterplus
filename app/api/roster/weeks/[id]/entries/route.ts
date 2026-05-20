import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isApprovedBlocked } from "@/lib/leave-blocks";
import { staffEligibleForRosterWeek, staffIdsWithRosterEntries } from "@/lib/roster-display-staff";
import { isRosterWeekLocked } from "@/lib/roster-week-lock";
import { formatYmdInZone, utcDateFromYmd } from "@/lib/datetime-policy";
import { daysOfWeek, weekEndYmd, ymdForDbDate } from "@/lib/roster-week";

type Ctx = { params: Promise<{ id: string }> };

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PUT /api/roster/weeks/[id]/entries
 * Body: { staffId, date: YYYY-MM-DD, shiftTemplateId: string | null }
 * - null/clears the cell (deletes any existing entry)
 * - non-null creates or updates the entry
 * Enforces: org scoping, date within week, public-holiday closed days, staff vacation,
 * roster membership, and read-only past weeks.
 */
export async function PUT(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: weekId } = await params;

  const week = await prisma.rosterWeek.findFirst({
    where: { id: weekId, organizationId: session.orgId },
    select: {
      id: true,
      weekStart: true,
      status: true,
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
  const date = typeof body.date === "string" ? body.date : "";
  const shiftTemplateIdRaw = body.shiftTemplateId;
  const shiftTemplateId =
    typeof shiftTemplateIdRaw === "string" && shiftTemplateIdRaw
      ? shiftTemplateIdRaw
      : shiftTemplateIdRaw === null
        ? null
        : undefined;

  if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  if (!YMD_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (shiftTemplateId === undefined) {
    return NextResponse.json(
      { error: "shiftTemplateId must be a string or null" },
      { status: 400 },
    );
  }

  const validDays = daysOfWeek(anchorYmd);
  if (!validDays.includes(date)) {
    return NextResponse.json(
      { error: "date is outside the roster week" },
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
      isActive: true,
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
  const staffIdsWithEntries = staffIdsWithRosterEntries(weekEntries);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  if (
    !staffEligibleForRosterWeek(staff, {
      weekEndYmd: weekEndYmd(anchorYmd),
      todayYmd,
      staffIdsWithEntries,
    })
  ) {
    return NextResponse.json(
      { error: "This staff member cannot be scheduled on this roster week." },
      { status: 409 },
    );
  }

  if (shiftTemplateId !== null) {
    const tpl = await prisma.shiftTemplate.findFirst({
      where: { id: shiftTemplateId, organizationId: session.orgId },
      select: { id: true },
    });
    if (!tpl) return NextResponse.json({ error: "Shift template not found" }, { status: 404 });

    const dateUtc = utcDateFromYmd(date);

    const holiday = await prisma.publicHoliday.findFirst({
      where: { organizationId: session.orgId, date: dateUtc, stationClosed: true },
      select: { name: true },
    });
    if (holiday) {
      return NextResponse.json(
        { error: `Cannot assign a shift on a closed holiday (${holiday.name}).` },
        { status: 409 },
      );
    }

    const block = await isApprovedBlocked(staff.id, dateUtc);
    if (block === "vacation") {
      return NextResponse.json(
        { error: `${staff.firstName} ${staff.lastName} is on vacation on this date.` },
        { status: 409 },
      );
    }
    if (block === "dayOff") {
      return NextResponse.json(
        { error: `${staff.firstName} ${staff.lastName} has an approved day off on this date.` },
        { status: 409 },
      );
    }
  }

  if (shiftTemplateId === null) {
    await prisma.rosterEntry.deleteMany({
      where: { rosterWeekId: week.id, staffId, date: utcDateFromYmd(date) },
    });
    return NextResponse.json({ entry: null });
  }

  const entry = await prisma.rosterEntry.upsert({
    where: {
      rosterWeekId_staffId_date: {
        rosterWeekId: week.id,
        staffId,
        date: utcDateFromYmd(date),
      },
    },
    create: {
      rosterWeekId: week.id,
      staffId,
      date: utcDateFromYmd(date),
      shiftTemplateId,
    },
    update: { shiftTemplateId },
    select: {
      id: true,
      staffId: true,
      date: true,
      shiftTemplateId: true,
    },
  });

  return NextResponse.json({
    entry: {
      id: entry.id,
      staffId: entry.staffId,
      date: ymdForDbDate(entry.date),
      shiftTemplateId: entry.shiftTemplateId,
    },
  });
}
