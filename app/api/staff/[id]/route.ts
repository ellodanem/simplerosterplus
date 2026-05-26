import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canDeleteStaff } from "@/lib/staff-archive";
import { parseOptionalString, parseOptionalYmd } from "@/lib/staff-input";

const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  deviceUserId: true,
  punchExempt: true,
  isActive: true,
  archivedAt: true,
  isTestUser: true,
  excludeFromRoster: true,
  dateOfBirth: true,
  startDate: true,
  contactNumber: true,
  sortOrder: true,
} as const;

type Ctx = { params: Promise<{ id: string }> };

function serializeStaff(staff: {
  archivedAt: Date | null;
  [key: string]: unknown;
}) {
  return {
    ...staff,
    archivedAt: staff.archivedAt ? staff.archivedAt.toISOString() : null,
  };
}

async function loadStaff(orgId: string, id: string) {
  return prisma.staff.findFirst({
    where: { id, organizationId: orgId },
    select: STAFF_SELECT,
  });
}

export async function GET(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const staff = await loadStaff(session.orgId, id);
  if (!staff) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const deleteCheck = await canDeleteStaff({
    staffId: staff.id,
    isTestUser: staff.isTestUser,
  });
  return NextResponse.json({
    staff: serializeStaff(staff),
    canDelete: deleteCheck.allowed,
    deleteBlockReason: deleteCheck.reason ?? null,
  });
}

export async function PATCH(request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadStaff(session.orgId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if ("isActive" in body || "archivedAt" in body || "isTestUser" in body) {
    return NextResponse.json(
      { error: "Use Archive or Restore for employment status; isTestUser cannot be changed." },
      { status: 400 },
    );
  }

  const data: Prisma.StaffUpdateInput = {};

  if (typeof body.firstName === "string") {
    const v = body.firstName.trim();
    if (!v) {
      return NextResponse.json({ error: "firstName cannot be empty" }, { status: 400 });
    }
    data.firstName = v;
  }
  if (typeof body.lastName === "string") {
    const v = body.lastName.trim();
    if (!v) {
      return NextResponse.json({ error: "lastName cannot be empty" }, { status: 400 });
    }
    data.lastName = v;
  }

  if ("email" in body) {
    const v = parseOptionalString(body.email);
    if (v !== undefined) data.email = v;
  }
  if ("role" in body) {
    if (typeof body.role !== "string" || !body.role.trim()) {
      return NextResponse.json({ error: "role is required" }, { status: 400 });
    }
    data.role = body.role.trim();
  }
  if ("deviceUserId" in body) {
    const v = parseOptionalString(body.deviceUserId);
    if (v !== undefined) data.deviceUserId = v;
  }
  if ("contactNumber" in body) {
    const v = parseOptionalString(body.contactNumber);
    if (v !== undefined) data.contactNumber = v;
  }

  if ("dateOfBirth" in body) {
    const v = parseOptionalYmd(body.dateOfBirth);
    if (v === undefined && body.dateOfBirth !== undefined && body.dateOfBirth !== null) {
      return NextResponse.json({ error: "dateOfBirth must be YYYY-MM-DD" }, { status: 400 });
    }
    if (v !== undefined) data.dateOfBirth = v;
  }
  if ("startDate" in body) {
    const v = parseOptionalYmd(body.startDate);
    if (v === undefined && body.startDate !== undefined && body.startDate !== null) {
      return NextResponse.json({ error: "startDate must be YYYY-MM-DD" }, { status: 400 });
    }
    if (v !== undefined) data.startDate = v;
  }

  if (typeof body.punchExempt === "boolean") {
    data.punchExempt = body.punchExempt;
  }
  if (typeof body.excludeFromRoster === "boolean") {
    data.excludeFromRoster = body.excludeFromRoster;
  }

  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.trunc(body.sortOrder);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ staff: serializeStaff(existing) });
  }

  try {
    const staff = await prisma.staff.update({
      where: { id },
      data,
      select: STAFF_SELECT,
    });
    const deleteCheck = await canDeleteStaff({
      staffId: staff.id,
      isTestUser: staff.isTestUser,
    });
    return NextResponse.json({
      staff: {
        ...serializeStaff(staff),
        canDelete: deleteCheck.allowed,
      },
      deleteBlockReason: deleteCheck.reason ?? null,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Another staff member at this location already uses that device user ID." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const existing = await loadStaff(session.orgId, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const deleteCheck = await canDeleteStaff({
    staffId: existing.id,
    isTestUser: existing.isTestUser,
  });
  if (!deleteCheck.allowed) {
    return NextResponse.json({ error: deleteCheck.reason ?? "Delete not allowed" }, { status: 403 });
  }

  await prisma.staff.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
