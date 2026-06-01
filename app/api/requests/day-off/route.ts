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
  serializeDayOff,
} from "@/lib/requests";

const MAX_REASON = 2000;

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

/**
 * POST /api/requests/day-off
 * Body: { staffId, date: YYYY-MM-DD, reason? }
 *
 * `(staffId, date)` is unique, so we upsert: a fresh request for an already-decided date
 * resets the row to `requested` and clears the prior decision. That covers the realistic case
 * where a denied day-off needs to be re-requested.
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

    const row = await prisma.staffDayOff.upsert({
      where: { staffId_date: { staffId, date } },
      create: {
        staffId,
        date,
        reason,
        status: "requested",
      },
      update: {
        reason,
        status: "requested",
        decidedByUserId: null,
        decidedAt: null,
      },
      select: dayOffSelect,
    });

    return NextResponse.json({ request: await serializeDayOff(row, undefined, session.orgId) }, { status: 201 });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
