import { NextResponse } from "next/server";
import type { LeaveRequestStatus, SickLeaveStatus } from "@prisma/client";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getDefaultLocation } from "@/lib/location";
import {
  decidedBySelect,
  errorJson,
  getConflictSummaries,
  getScheduledShiftNames,
  requestConflictKey,
  requestStaffSelect,
  serializeDayOff,
  serializeShiftRequest,
  serializeSickLeave,
  serializeVacation,
  shiftTemplateSelect,
} from "@/lib/requests";

const VALID_STATUS = new Set<string>(["requested", "approved", "denied"]);

/**
 * GET /api/requests?status=requested|approved|denied|all
 *
 * Returns vacation + day-off + sick-leave + shift-request rows for the current org's default
 * location, plus a count of rows that are still `requested` regardless of the filter (so the
 * Requests button badge stays accurate even when the modal is filtering to "decided" rows).
 *
 * Leave `requested` rows include `conflictCount` so the modal can surface "approving will
 * clear N shifts". Shift requests are soft preferences — no clear-on-approve conflicts.
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const statusParam = url.searchParams.get("status") ?? "requested";
    let statusFilter: LeaveRequestStatus | SickLeaveStatus | null;
    if (statusParam === "all") {
      statusFilter = null;
    } else if (VALID_STATUS.has(statusParam)) {
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

    const [
      vacationRows,
      dayOffRows,
      sickLeaveRows,
      shiftRows,
      pendingVacation,
      pendingDayOff,
      pendingSickLeave,
      pendingShift,
    ] = await Promise.all([
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
      prisma.staffSickLeave.findMany({
        where: {
          staff: staffWhere,
          ...(statusFilter ? { status: statusFilter as SickLeaveStatus } : {}),
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
      prisma.staffShiftRequest.findMany({
        where: {
          staff: staffWhere,
          ...(statusFilter ? { status: statusFilter } : {}),
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
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
        },
      }),
      prisma.staffVacation.count({
        where: { staff: staffWhere, status: "requested" },
      }),
      prisma.staffDayOff.count({
        where: { staff: staffWhere, status: "requested" },
      }),
      prisma.staffSickLeave.count({
        where: { staff: staffWhere, status: "requested" },
      }),
      prisma.staffShiftRequest.count({
        where: { staff: staffWhere, status: "requested" },
      }),
    ]);

    const pendingShiftRows = shiftRows.filter((row) => row.status === "requested");

    const [conflictSummaries, scheduledShifts] = await Promise.all([
      getConflictSummaries(session.orgId, [
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
        ...sickLeaveRows
          .filter((row) => row.status === "requested")
          .map((row) => ({
            key: requestConflictKey("sickLeave", row.id),
            staffId: row.staffId,
            startDate: row.startDate,
            endDate: row.endDate,
          })),
      ]),
      getScheduledShiftNames(
        session.orgId,
        pendingShiftRows.map((row) => ({
          key: row.id,
          staffId: row.staffId,
          date: row.date,
          shiftTemplateId: row.shiftTemplateId,
        })),
      ),
    ]);

    const [vacation, dayOff, sickLeave, shiftRequest] = await Promise.all([
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
      Promise.all(
        sickLeaveRows.map((row) =>
          serializeSickLeave(row, conflictSummaries.get(requestConflictKey("sickLeave", row.id))),
        ),
      ),
      Promise.all(
        shiftRows.map((row) =>
          serializeShiftRequest(
            row,
            row.status === "requested" ? (scheduledShifts.get(row.id) ?? null) : undefined,
          ),
        ),
      ),
    ]);

    return NextResponse.json({
      vacation,
      dayOff,
      sickLeave,
      shiftRequest,
      pendingCount: pendingVacation + pendingDayOff + pendingSickLeave + pendingShift,
    });
  } catch (e) {
    const { status, body } = errorJson(e);
    return NextResponse.json(body, { status });
  }
}
