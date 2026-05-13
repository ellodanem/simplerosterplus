import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { parseOptionalString, parseOptionalYmd } from "@/lib/staff-input";

const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  role: true,
  deviceUserId: true,
  punchExempt: true,
  dateOfBirth: true,
  startDate: true,
  contactNumber: true,
  sortOrder: true,
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

  return NextResponse.json({ staff });
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
  const role = typeof body.role === "string" ? body.role.trim() : "";
  if (!firstName || !lastName || !role) {
    return NextResponse.json(
      { error: "firstName, lastName, and role are required" },
      { status: 400 },
    );
  }

  const dateOfBirth = parseOptionalYmd(body.dateOfBirth);
  const startDate = parseOptionalYmd(body.startDate);
  if (dateOfBirth === undefined && body.dateOfBirth !== undefined) {
    return NextResponse.json({ error: "dateOfBirth must be YYYY-MM-DD" }, { status: 400 });
  }
  if (startDate === undefined && body.startDate !== undefined) {
    return NextResponse.json({ error: "startDate must be YYYY-MM-DD" }, { status: 400 });
  }

  const maxSort = await prisma.staff.aggregate({
    where: { organizationId: session.orgId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxSort._max.sortOrder ?? -1) + 1;

  try {
    const staff = await prisma.staff.create({
      data: {
        organizationId: session.orgId,
        firstName,
        lastName,
        email: parseOptionalString(body.email) ?? null,
        role,
        deviceUserId: parseOptionalString(body.deviceUserId) ?? null,
        contactNumber: parseOptionalString(body.contactNumber) ?? null,
        dateOfBirth: dateOfBirth ?? null,
        startDate: startDate ?? null,
        sortOrder,
      },
      select: STAFF_SELECT,
    });

    return NextResponse.json({ staff }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Another staff member already uses that device user ID." },
        { status: 409 },
      );
    }
    throw err;
  }
}
