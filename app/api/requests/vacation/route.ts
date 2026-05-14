import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  decidedBySelect,
  errorJson,
  loadStaffForLocation,
  parseYmd,
  RequestError,
  requestStaffSelect,
  serializeVacation,
} from "@/lib/requests";

const MAX_REASON = 2000;

/**
 * POST /api/requests/vacation
 * Body: { staffId, startDate: YYYY-MM-DD, endDate: YYYY-MM-DD, reason? }
 *
 * Creates a `requested` vacation row. Approval (with conflict resolution) happens via PATCH.
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

    const startDate = parseYmd(body.startDate, "startDate");
    const endDate = parseYmd(body.endDate, "endDate");
    if (endDate.getTime() < startDate.getTime()) {
      throw new RequestError("endDate must be on or after startDate", 400);
    }

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

    const created = await prisma.staffVacation.create({
      data: {
        staffId,
        startDate,
        endDate,
        reason,
        status: "requested",
      },
      select: {
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
      },
    });

    return NextResponse.json({ request: await serializeVacation(created) }, { status: 201 });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
