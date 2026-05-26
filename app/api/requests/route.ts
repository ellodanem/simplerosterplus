import { NextResponse } from "next/server";
import type { LeaveRequestStatus } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  decidedBySelect,
  errorJson,
  getConflictSummaries,
  requestConflictKey,
  requestStaffSelect,
  serializeDayOff,
  serializeVacation,
} from "@/lib/requests";

const VALID_STATUS = new Set<LeaveRequestStatus>(["requested", "approved", "denied"]);

/**
 * GET /api/requests?status=requested|approved|denied|all
 *
 * Returns vacation + day-off rows for the current org's default location, plus a count of
 * rows that are still `requested` regardless of the filter (so the Requests button badge can
 * stay accurate even when the modal is filtering to "decided" rows).
 *
 * Responses include a `conflictCount` per row when status === 'requested' so the modal can
 * surface "approving will clear N shifts" inline without a second request.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") ?? "requested";
    let statusFilter: LeaveRequestStatus | null;
    if (statusParam === "all") {
      statusFilter = null;
    } else if (VALID_STATUS.has(statusParam as LeaveRequestStatus)) {
      statusFilter = statusParam as LeaveRequestStatus;
    } else {
      return NextResponse.json(
        { error: "status must be requested|approved|denied|all" },
        { status: 400 },
      );
    }

    const location = await getDefaultLocation(session.orgId);

    const staffWhere = {
      organizationId: session.orgId,
      locationId: location.id,
    };

    const [vacationRows, dayOffRows, pendingVacation, pendingDayOff] = await Promise.all([
      prisma.staffVacation.findMany({
        where: {
          staff: staffWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
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
      }),
      prisma.staffDayOff.findMany({
        where: {
          staff: staffWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          staffId: true,
          date: true,
          status: true,
          reason: true,
          decidedAt: true,
          createdAt: true,
          staff: { select: requestStaffSelect },
          decidedBy: { select: decidedBySelect },
        },
      }),
      prisma.staffVacation.count({
        where: { staff: staffWhere, status: "requested" },
      }),
      prisma.staffDayOff.count({
        where: { staff: staffWhere, status: "requested" },
      }),
    ]);

    const conflictSummaries = await getConflictSummaries([
      ...vacationRows
        .filter((row) => row.status === "requested")
        .map((row) => ({
          key: requestConflictKey("vacation", row.id),
          staffId: row.staffId,
          startDate: row.startDate,
          endDate: row.endDate,
        })),
      ...dayOffRows
        .filter((row) => row.status === "requested")
        .map((row) => ({
          key: requestConflictKey("dayOff", row.id),
          staffId: row.staffId,
          startDate: row.date,
          endDate: row.date,
        })),
    ]);

    const [vacation, dayOff] = await Promise.all([
      Promise.all(
        vacationRows.map((row) =>
          serializeVacation(row, conflictSummaries.get(requestConflictKey("vacation", row.id))),
        ),
      ),
      Promise.all(
        dayOffRows.map((row) =>
          serializeDayOff(row, conflictSummaries.get(requestConflictKey("dayOff", row.id))),
        ),
      ),
    ]);

    return NextResponse.json({
      vacation,
      dayOff,
      pendingCount: pendingVacation + pendingDayOff,
    });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
