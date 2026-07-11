import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  decidedBySelect,
  errorJson,
  getScheduledShiftNames,
  loadStaffForLocation,
  parseYmd,
  RequestError,
  requestStaffSelect,
  serializeShiftRequest,
  shiftTemplateSelect,
} from "@/lib/requests";

const MAX_REASON = 2000;

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

/**
 * POST /api/requests/shift
 * Body: { staffId, date: YYYY-MM-DD, shiftTemplateId, reason? }
 *
 * Soft preference: create does not touch the roster. Unique on
 * `(staffId, date, shiftTemplateId)` — re-request resets to `requested`.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const staffId = typeof body.staffId === "string" ? body.staffId : "";
    if (!staffId) throw new RequestError("staffId is required", 400);

    const shiftTemplateId =
      typeof body.shiftTemplateId === "string" ? body.shiftTemplateId : "";
    if (!shiftTemplateId) throw new RequestError("shiftTemplateId is required", 400);

    const date = parseYmd(body.date, "date");

    const reasonRaw = body.reason;
    if (reasonRaw !== undefined && reasonRaw !== null && typeof reasonRaw !== "string") {
      throw new RequestError("reason must be a string when provided", 400);
    }
    const reason =
      typeof reasonRaw === "string" && reasonRaw.trim()
        ? reasonRaw.trim().slice(0, MAX_REASON)
        : null;

    const location = await getDefaultLocation(session.orgId);
    await loadStaffForLocation({
      staffId,
      organizationId: session.orgId,
      locationId: location.id,
    });

    const template = await prisma.shiftTemplate.findFirst({
      where: { id: shiftTemplateId, organizationId: session.orgId },
      select: { id: true },
    });
    if (!template) throw new RequestError("Shift template not found", 404);

    const row = await prisma.staffShiftRequest.upsert({
      where: {
        staffId_date_shiftTemplateId: { staffId, date, shiftTemplateId },
      },
      create: {
        staffId,
        date,
        shiftTemplateId,
        reason,
        status: "requested",
      },
      update: {
        reason,
        status: "requested",
        decidedByUserId: null,
        decidedAt: null,
      },
      select: shiftRequestSelect,
    });

    const scheduled = await getScheduledShiftNames(session.orgId, [
      {
        key: row.id,
        staffId: row.staffId,
        date: row.date,
        shiftTemplateId: row.shiftTemplateId,
      },
    ]);

    return NextResponse.json(
      {
        request: await serializeShiftRequest(row, scheduled.get(row.id) ?? null),
      },
      { status: 201 },
    );
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
