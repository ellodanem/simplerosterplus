import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import { allowStaffDeleteInDev } from "@/lib/staff-archive";
import { parseOptionalString, parseOptionalYmd } from "@/lib/staff-input";
import { checkStaffLimit } from "@/lib/plan-limits";
import { ymdForDbDate } from "@/lib/roster-week";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  roleId: true,
  departmentId: true,
  deviceUserId: true,
  punchExempt: true,
  isActive: true,
  archivedAt: true,
  isTestUser: true,
  excludeFromRoster: true,
  dateOfBirth: true,
  startDate: true,
  contactNumber: true,
  whatsappOptIn: true,
  sortOrder: true,
  location: { select: { id: true, name: true } },
  staffRole: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
} as const;

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await prisma.staff.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: STAFF_SELECT,
  });

  return NextResponse.json({
    staff: staff.map((s) => ({
      ...s,
      archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
    })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const roleId = typeof body.roleId === "string" ? body.roleId.trim() : "";
  const departmentId =
    typeof body.departmentId === "string" && body.departmentId.trim()
      ? body.departmentId.trim()
      : null;

  if (!firstName || !lastName) {
    return NextResponse.json(
      { error: "firstName and lastName are required" },
      { status: 400 },
    );
  }
  if (!roleId) {
    return NextResponse.json({ error: "role is required" }, { status: 400 });
  }

  const dateOfBirth = parseOptionalYmd(body.dateOfBirth);
  const startDate = parseOptionalYmd(body.startDate);
  if (dateOfBirth === undefined && body.dateOfBirth !== undefined) {
    return NextResponse.json({ error: "dateOfBirth must be YYYY-MM-DD" }, { status: 400 });
  }
  if (startDate === undefined && body.startDate !== undefined) {
    return NextResponse.json({ error: "startDate must be YYYY-MM-DD" }, { status: 400 });
  }

  const rosterWeekStartYmd =
    typeof body.rosterWeekStartYmd === "string" && YMD_RE.test(body.rosterWeekStartYmd.trim())
      ? body.rosterWeekStartYmd.trim()
      : null;

  let effectiveStartDate = startDate ?? null;
  if (rosterWeekStartYmd) {
    if (!effectiveStartDate) {
      effectiveStartDate = parseOptionalYmd(rosterWeekStartYmd) ?? null;
    } else if (ymdForDbDate(effectiveStartDate) < rosterWeekStartYmd) {
      return NextResponse.json(
        { error: "Start date cannot be before the roster week they are added on." },
        { status: 400 },
      );
    }
  }

  const isTestUser = body.isTestUser === true;
  const excludeFromRoster =
    typeof body.excludeFromRoster === "boolean" ? body.excludeFromRoster : false;
  const whatsappOptIn = body.whatsappOptIn === true;
  const contact = parseOptionalString(body.contactNumber) ?? null;
  if (whatsappOptIn && !contact?.trim()) {
    return NextResponse.json(
      { error: "Add a contact number before enabling WhatsApp schedule alerts." },
      { status: 400 },
    );
  }

  const requestedLocationId =
    typeof body.locationId === "string" && body.locationId.trim() ? body.locationId.trim() : null;
  if (!requestedLocationId) {
    return NextResponse.json({ error: "location is required" }, { status: 400 });
  }

  const location = await prisma.location.findFirst({
    where: { id: requestedLocationId, organizationId: session.orgId },
    select: { id: true },
  });
  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const staffRole = await prisma.staffRole.findFirst({
    where: { id: roleId, organizationId: session.orgId },
    select: { id: true, name: true },
  });
  if (!staffRole) {
    return NextResponse.json({ error: "Role not found" }, { status: 404 });
  }

  let department: { id: string; name: string } | null = null;
  if (departmentId) {
    department = await prisma.department.findFirst({
      where: { id: departmentId, organizationId: session.orgId },
      select: { id: true, name: true },
    });
    if (!department) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
  }

  const maxSort = await prisma.staff.aggregate({
    where: { organizationId: session.orgId, locationId: location.id },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  const staffLimit = await checkStaffLimit(session.orgId);
  if (staffLimit) {
    return NextResponse.json(
      { error: staffLimit.message, code: "plan_limit", kind: staffLimit.kind },
      { status: 403 },
    );
  }

  try {
    const staff = await prisma.staff.create({
      data: {
        organizationId: session.orgId,
        locationId: location.id,
        firstName,
        lastName,
        email: parseOptionalString(body.email) ?? null,
        role: staffRole.name,
        roleId: staffRole.id,
        departmentId: department?.id ?? null,
        deviceUserId: parseOptionalString(body.deviceUserId) ?? null,
        contactNumber: contact,
        whatsappOptIn,
        whatsappOptInAt: whatsappOptIn ? new Date() : null,
        dateOfBirth: dateOfBirth ?? null,
        startDate: effectiveStartDate,
        isActive: true,
        isTestUser,
        excludeFromRoster,
        sortOrder,
      },
      select: STAFF_SELECT,
    });

    return NextResponse.json(
      {
        staff: {
          ...staff,
          archivedAt: null,
          canDelete: allowStaffDeleteInDev() || staff.isTestUser,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Another staff member at this location already uses that device user ID." },
        { status: 409 },
      );
    }
    return uncaughtApiErrorResponse(err, "staff POST");
  }
}
