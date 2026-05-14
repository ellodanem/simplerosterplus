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
  serializeVacation,
} from "@/lib/requests";

type Ctx = { params: Promise<{ id: string }> };

const vacationSelect = {
  id: true,
  staffId: true,
  startDate: true,
  endDate: true,
  status: true,
  reason: true,
  decidedAt: true,
  createdAt: true,
  staff: { select: requestStaffSelect },
  decidedBy: { select: decidedBySelect },
} as const;

async function loadVacation(id: string, organizationId: string, locationId: string) {
  const row = await prisma.staffVacation.findFirst({
    where: {
      id,
      staff: { organizationId, locationId },
    },
    select: vacationSelect,
  });
  if (!row) throw new RequestError("Vacation request not found", 404);
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
 * PATCH /api/requests/vacation/[id]
 * Body: { action: "approve" | "deny", force?: boolean }
 *
 * Approve runs a conflict preview when `force` isn't passed: if any roster shifts overlap the
 * range, returns 409 with the count and dates so the UI can surface a confirm step. Resending
 * with `force: true` clears those shifts and flips the row to `approved`. Deny just updates
 * status; it never touches roster entries.
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
    const row = await loadVacation(id, session.orgId, location.id);

    if (row.status !== "requested") {
      throw new RequestError(
        `Cannot ${action} a request that is already ${row.status}.`,
        409,
      );
    }

    const userId = await findUserId(session);
    if (!userId) throw new RequestError("Session user not found", 401);

    if (action === "deny") {
      const updated = await prisma.staffVacation.update({
        where: { id: row.id },
        data: {
          status: "denied",
          decidedByUserId: userId,
          decidedAt: new Date(),
        },
        select: vacationSelect,
      });
      return NextResponse.json({ request: await serializeVacation(updated) });
    }

    const conflicts = await countConflicts({
      staffId: row.staffId,
      startDate: row.startDate,
      endDate: row.endDate,
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
      kind: "vacation",
      leaveId: row.id,
      staffId: row.staffId,
      startDate: row.startDate,
      endDate: row.endDate,
      decidedByUserId: userId,
    });

    const updated = await prisma.staffVacation.findUniqueOrThrow({
      where: { id: row.id },
      select: vacationSelect,
    });
    return NextResponse.json({
      request: await serializeVacation(updated),
      cleared: conflicts.count,
    });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/requests/vacation/[id]
 * Hard-deletes the request regardless of status. Approved rows therefore stop blocking the
 * roster the moment they're deleted (the grid will reflect that on next refresh).
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const location = await getDefaultLocation(session.orgId);
    await loadVacation(id, session.orgId, location.id);

    await prisma.staffVacation.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
