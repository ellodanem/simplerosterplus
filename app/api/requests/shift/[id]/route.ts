import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  decidedBySelect,
  errorJson,
  RequestError,
  requestStaffSelect,
  serializeShiftRequest,
  shiftTemplateSelect,
} from "@/lib/requests";

type Ctx = { params: Promise<{ id: string }> };

const shiftRequestSelect = {
  id: true,
  staffId: true,
  date: true,
  shiftTemplateId: true,
  status: true,
  reason: true,
  decidedAt: true,
  createdAt: true,
  staff: { select: requestStaffSelect },
  decidedBy: { select: decidedBySelect },
  shiftTemplate: { select: shiftTemplateSelect },
} as const;

async function loadShiftRequest(id: string, organizationId: string, locationId: string) {
  const row = await prisma.staffShiftRequest.findFirst({
    where: {
      id,
      staff: { organizationId, locationId },
    },
    select: shiftRequestSelect,
  });
  if (!row) throw new RequestError("Shift request not found", 404);
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
 * PATCH /api/requests/shift/[id]
 * Body: { action: "approve" | "deny" }
 *
 * Soft approve: flips status only — never assigns or clears roster cells.
 */
export async function PATCH(request: Request, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = body.action;
    if (action !== "approve" && action !== "deny") {
      throw new RequestError("action must be 'approve' or 'deny'", 400);
    }

    const location = await getDefaultLocation(session.orgId);
    const row = await loadShiftRequest(id, session.orgId, location.id);

    if (row.status !== "requested") {
      throw new RequestError(
        `Cannot ${action} a request that is already ${row.status}.`,
        409,
      );
    }

    const userId = await findUserId(session);
    if (!userId) throw new RequestError("Session user not found", 401);

    const updated = await prisma.staffShiftRequest.update({
      where: { id: row.id, staff: { organizationId: session.orgId } },
      data: {
        status: action === "approve" ? "approved" : "denied",
        decidedByUserId: userId,
        decidedAt: new Date(),
      },
      select: shiftRequestSelect,
    });

    return NextResponse.json({ request: await serializeShiftRequest(updated) });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}

/**
 * DELETE /api/requests/shift/[id]
 * Hard-deletes regardless of status. Soft preferences never block the roster, so delete
 * only removes the inbox/audit row.
 */
export async function DELETE(_request: Request, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const location = await getDefaultLocation(session.orgId);
    const row = await loadShiftRequest(id, session.orgId, location.id);

    await prisma.staffShiftRequest.delete({
      where: { id: row.id, staff: { organizationId: session.orgId } },
    });
    return NextResponse.json({ ok: true, request: await serializeShiftRequest(row) });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
