import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  approveLeaveTx,
  countConflicts,
  decidedBySelect,
  errorJson,
  RequestError,
  requestStaffSelect,
  serializeDayOff,
} from "@/lib/requests";

type Ctx = { params: Promise<{ id: string }> };

const dayOffSelect = {
  id: true,
  staffId: true,
  date: true,
  status: true,
  reason: true,
  decidedAt: true,
  createdAt: true,
  staff: { select: requestStaffSelect },
  decidedBy: { select: decidedBySelect },
} as const;

async function loadDayOff(id: string, organizationId: string, locationId: string) {
  const row = await prisma.staffDayOff.findFirst({
    where: {
      id,
      staff: { organizationId, locationId },
    },
    select: dayOffSelect,
  });
  if (!row) throw new RequestError("Day-off request not found", 404);
  return row;
}

async function findUserId(session: Awaited<ReturnType<typeof getSession>>): Promise<string | null> {
  if (!session) return null;
  const user = await prisma.appUser.findFirst({
    where: { id: session.sub, organizationId: session.orgId },
    select: { id: true },
  });
  return user?.id ?? null;
}

/**
 * PATCH /api/requests/day-off/[id]
 * Body: { action: "approve" | "deny", force?: boolean }
 *
 * Approve uses the same conflict-then-confirm flow as vacation. Deny is unconditional.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    const force = body.force === true;
    if (action !== "approve" && action !== "deny") {
      throw new RequestError("action must be 'approve' or 'deny'", 400);
    }

    const location = await getDefaultLocation(session.orgId);
    const row = await loadDayOff(id, session.orgId, location.id);

    if (row.status !== "requested") {
      throw new RequestError(
        `Cannot ${action} a request that is already ${row.status}.`,
        409,
      );
    }

    const userId = await findUserId(session);
    if (!userId) throw new RequestError("Session user not found", 401);

    if (action === "deny") {
      const updated = await prisma.staffDayOff.update({
        where: { id: row.id },
        data: {
          status: "denied",
          decidedByUserId: userId,
          decidedAt: new Date(),
        },
        select: dayOffSelect,
      });
      return NextResponse.json({ request: await serializeDayOff(updated) });
    }

    const conflicts = await countConflicts({
      staffId: row.staffId,
      startDate: row.date,
      endDate: row.date,
    });

    if (conflicts.count > 0 && !force) {
      return NextResponse.json(
        {
          error: `Approving will clear ${conflicts.count} ${conflicts.count === 1 ? "shift" : "shifts"} already on the roster.`,
          conflictCount: conflicts.count,
          conflictDates: conflicts.dates,
          requiresConfirm: true,
        },
        { status: 409 },
      );
    }

    await approveLeaveTx({
      kind: "dayOff",
      leaveId: row.id,
      staffId: row.staffId,
      startDate: row.date,
      endDate: row.date,
      decidedByUserId: userId,
    });

    const updated = await prisma.staffDayOff.findUniqueOrThrow({
      where: { id: row.id },
      select: dayOffSelect,
    });
    return NextResponse.json({
      request: await serializeDayOff(updated),
      cleared: conflicts.count,
      clearedDates: conflicts.dates,
    });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/requests/day-off/[id]
 * Hard-deletes regardless of status; approved rows therefore stop blocking immediately.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const location = await getDefaultLocation(session.orgId);
    const row = await loadDayOff(id, session.orgId, location.id);

    await prisma.staffDayOff.delete({ where: { id } });
    return NextResponse.json({ ok: true, request: await serializeDayOff(row) });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
