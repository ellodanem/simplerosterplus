import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isStaffArchived } from "@/lib/staff-archive";

type Ctx = { params: Promise<{ id: string }> };

const STAFF_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  archivedAt: true,
  isActive: true,
} as const;

/**
 * POST /api/staff/[id]/archive
 * Marks staff as no longer with the company (timestamped).
 */
export async function POST(_request: Request, { params }: Ctx) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const existing = await prisma.staff.findFirst({
    where: { id, organizationId: session.orgId },
    select: STAFF_SELECT,
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (isStaffArchived(existing)) {
    return NextResponse.json({ error: "Staff is already archived" }, { status: 409 });
  }

  const archivedAt = new Date();
  const staff = await prisma.staff.update({
    where: { id },
    data: { archivedAt, isActive: false },
    select: STAFF_SELECT,
  });

  return NextResponse.json({
    staff: {
      ...staff,
      archivedAt: staff.archivedAt?.toISOString() ?? null,
    },
  });
}
