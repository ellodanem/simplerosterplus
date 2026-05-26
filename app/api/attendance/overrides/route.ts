import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import { utcDateFromYmd } from "@/lib/datetime-policy";
import { isYmdAfterArchiveDay } from "@/lib/staff-archive";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * PUT /api/attendance/overrides
 * Body: { staffId, date: YYYY-MM-DD, status: "present" | "absent" | null, lateReason?, note? }
 *
 * Per-cell upsert by `(staffId, date)`. `status: null` clears the override (delete row).
 * Mirrors roster's `PUT /api/roster/.../entries` semantics — one cell per call, set-or-clear.
 *
 * Optional `lateReason` is free-text shown next to the cell; deliberately not parsed.
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

  const staffId = typeof body.staffId === "string" ? body.staffId : "";
  const date = typeof body.date === "string" ? body.date : "";
  const statusRaw = body.status;

  if (!staffId) return NextResponse.json({ error: "staffId is required" }, { status: 400 });
  if (!YMD_RE.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  if (statusRaw !== null && statusRaw !== "present" && statusRaw !== "absent") {
    return NextResponse.json(
      { error: "status must be 'present', 'absent', or null" },
      { status: 400 },
    );
  }

  const location = await getDefaultLocation(session.orgId);
  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { timeZone: true },
  });
  const timeZone = location.timeZone ?? org?.timeZone ?? "UTC";

  const staff = await prisma.staff.findFirst({
    where: {
      id: staffId,
      organizationId: session.orgId,
      locationId: location.id,
    },
    select: { id: true, archivedAt: true },
  });
  if (!staff) {
    return NextResponse.json({ error: "Staff not found at this location" }, { status: 404 });
  }

  const dateUtc = utcDateFromYmd(date);

  if (staff.archivedAt && isYmdAfterArchiveDay(date, staff.archivedAt, timeZone)) {
    return NextResponse.json(
      { error: "Cannot change attendance after this staff member was archived." },
      { status: 403 },
    );
  }

  if (statusRaw === null) {
    await prisma.attendanceDayOverride.deleteMany({
      where: { staffId: staff.id, date: dateUtc },
    });
    return NextResponse.json({ override: null });
  }

  const lateReason = (() => {
    if (body.lateReason === undefined) return undefined;
    if (body.lateReason === null) return null;
    if (typeof body.lateReason === "string") {
      const trimmed = body.lateReason.trim();
      return trimmed === "" ? null : trimmed;
    }
    return undefined;
  })();
  if (body.lateReason !== undefined && lateReason === undefined) {
    return NextResponse.json({ error: "lateReason must be a string or null" }, { status: 400 });
  }

  const note = (() => {
    if (body.note === undefined) return undefined;
    if (body.note === null) return null;
    if (typeof body.note === "string") {
      const trimmed = body.note.trim();
      return trimmed === "" ? null : trimmed;
    }
    return undefined;
  })();
  if (body.note !== undefined && note === undefined) {
    return NextResponse.json({ error: "note must be a string or null" }, { status: 400 });
  }

  const user = await prisma.appUser.findFirst({
    where: { id: session.sub, organizationId: session.orgId },
    select: { id: true },
  });
  const now = new Date();

  const row = await prisma.attendanceDayOverride.upsert({
    where: { staffId_date: { staffId: staff.id, date: dateUtc } },
    create: {
      staffId: staff.id,
      date: dateUtc,
      status: statusRaw,
      lateReason: lateReason ?? null,
      note: note ?? null,
      decidedByUserId: user?.id ?? null,
      decidedAt: now,
    },
    update: {
      status: statusRaw,
      ...(lateReason !== undefined ? { lateReason } : {}),
      ...(note !== undefined ? { note } : {}),
      decidedByUserId: user?.id ?? null,
      decidedAt: now,
    },
    select: {
      id: true,
      staffId: true,
      date: true,
      status: true,
      lateReason: true,
      note: true,
    },
  });

  return NextResponse.json({
    override: {
      id: row.id,
      staffId: row.staffId,
      date,
      status: row.status,
      lateReason: row.lateReason,
      note: row.note,
    },
  });
}
