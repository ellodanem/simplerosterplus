import type { LeaveRequestStatus } from "@prisma/client";
import { prisma } from "./prisma";
import { utcDateFromYmd } from "./datetime-policy";
import { ymdForDbDate } from "./roster-week";

export type RequestType = "vacation" | "dayOff";
export type ConflictSummary = { count: number; dates: string[] };

type ConflictRange = {
  key: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
};

export function requestConflictKey(type: RequestType, id: string): string {
  return `${type}:${id}`;
}

export type SerializedRequest = {
  id: string;
  type: RequestType;
  status: LeaveRequestStatus;
  reason: string | null;
  decidedAt: string | null;
  decidedByEmail: string | null;
  createdAt: string;
  staff: {
    id: string;
    firstName: string;
    lastName: string;
    role: string | null;
  };
  /** Only set for `vacation` rows. */
  startDate?: string;
  /** Only set for `vacation` rows. */
  endDate?: string;
  /** Only set for `dayOff` rows. */
  date?: string;
  /**
   * Roster entries that would be cleared on approve. Only computed for `requested` rows; left
   * undefined for already-decided rows because the conflict question doesn't apply.
   */
  conflictCount?: number;
  /** Same as `conflictCount` — only set for `requested` rows. */
  conflictDates?: string[];
};

/**
 * Roster entries that overlap a leave row and would need to be cleared on approve. We only
 * count rows with an actual `shiftTemplateId` because empty (off) entries are functionally
 * the same as no entry — clearing them isn't user-visible.
 */
export async function getConflictSummaries(
  organizationId: string,
  ranges: ConflictRange[],
): Promise<Map<string, ConflictSummary>> {
  const summaries = new Map<string, ConflictSummary>();
  if (ranges.length === 0) return summaries;

  let minDate = ranges[0].startDate;
  let maxDate = ranges[0].endDate;
  for (const range of ranges) {
    if (range.startDate < minDate) minDate = range.startDate;
    if (range.endDate > maxDate) maxDate = range.endDate;
  }

  const rows = await prisma.rosterEntry.findMany({
    where: {
      staff: { organizationId },
      staffId: { in: Array.from(new Set(ranges.map((range) => range.staffId))) },
      shiftTemplateId: { not: null },
      date: { gte: minDate, lte: maxDate },
    },
    select: { staffId: true, date: true },
    orderBy: [{ staffId: "asc" }, { date: "asc" }],
  });

  const datesByStaffId = new Map<string, string[]>();
  for (const row of rows) {
    const dates = datesByStaffId.get(row.staffId);
    if (dates) dates.push(ymdForDbDate(row.date));
    else datesByStaffId.set(row.staffId, [ymdForDbDate(row.date)]);
  }

  for (const range of ranges) {
    const startYmd = ymdForDbDate(range.startDate);
    const endYmd = ymdForDbDate(range.endDate);
    const dates =
      datesByStaffId
        .get(range.staffId)
        ?.filter((ymd) => ymd >= startYmd && ymd <= endYmd) ?? [];
    summaries.set(range.key, { count: dates.length, dates });
  }

  return summaries;
}

export async function countConflicts(args: {
  organizationId: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
}): Promise<ConflictSummary> {
  return (
    (await getConflictSummaries(args.organizationId, [
      {
        key: "single",
        staffId: args.staffId,
        startDate: args.startDate,
        endDate: args.endDate,
      },
    ])).get("single") ?? { count: 0, dates: [] }
  );
}

type StaffMini = {
  id: string;
  firstName: string;
  lastName: string;
  role: string | null;
};

type DecidedByMini = { email: string } | null;

type VacationRow = {
  id: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
  status: LeaveRequestStatus;
  reason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  staff: StaffMini;
  decidedBy: DecidedByMini;
};

type DayOffRow = {
  id: string;
  staffId: string;
  date: Date;
  status: LeaveRequestStatus;
  reason: string | null;
  decidedAt: Date | null;
  createdAt: Date;
  staff: StaffMini;
  decidedBy: DecidedByMini;
};

export const requestStaffSelect = {
  id: true,
  firstName: true,
  lastName: true,
  role: true,
} as const;

export const decidedBySelect = { email: true } as const;

export async function serializeVacation(
  row: VacationRow,
  conflictSummary?: ConflictSummary,
  organizationId?: string,
): Promise<SerializedRequest> {
  const base = baseSerialized("vacation", row, {
    startDate: ymdForDbDate(row.startDate),
    endDate: ymdForDbDate(row.endDate),
  });
  if (row.status === "requested") {
    const conflicts =
      conflictSummary ??
      (organizationId
        ? await countConflicts({
            organizationId,
            staffId: row.staffId,
            startDate: row.startDate,
            endDate: row.endDate,
          })
        : { count: 0, dates: [] });
    base.conflictCount = conflicts.count;
    base.conflictDates = conflicts.dates;
  }
  return base;
}

export async function serializeDayOff(
  row: DayOffRow,
  conflictSummary?: ConflictSummary,
  organizationId?: string,
): Promise<SerializedRequest> {
  const base = baseSerialized("dayOff", row, {
    date: ymdForDbDate(row.date),
  });
  if (row.status === "requested") {
    const conflicts =
      conflictSummary ??
      (organizationId
        ? await countConflicts({
            organizationId,
            staffId: row.staffId,
            startDate: row.date,
            endDate: row.date,
          })
        : { count: 0, dates: [] });
    base.conflictCount = conflicts.count;
    base.conflictDates = conflicts.dates;
  }
  return base;
}

function baseSerialized(
  type: RequestType,
  row: {
    id: string;
    status: LeaveRequestStatus;
    reason: string | null;
    decidedAt: Date | null;
    createdAt: Date;
    staff: StaffMini;
    decidedBy: DecidedByMini;
  },
  extras: Partial<SerializedRequest>,
): SerializedRequest {
  return {
    id: row.id,
    type,
    status: row.status,
    reason: row.reason,
    decidedAt: row.decidedAt ? row.decidedAt.toISOString() : null,
    decidedByEmail: row.decidedBy?.email ?? null,
    createdAt: row.createdAt.toISOString(),
    staff: {
      id: row.staff.id,
      firstName: row.staff.firstName,
      lastName: row.staff.lastName,
      role: row.staff.role,
    },
    ...extras,
  };
}

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parseYmd(value: unknown, field: string): Date {
  if (typeof value !== "string" || !YMD_RE.test(value)) {
    throw new RequestError(`${field} must be YYYY-MM-DD`, 400);
  }
  return utcDateFromYmd(value);
}

export class RequestError extends Error {
  status: number;
  payload?: Record<string, unknown>;
  constructor(message: string, status: number, payload?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.payload = payload;
  }
}

export function errorJson(e: unknown): { status: number; body: Record<string, unknown> } {
  if (e instanceof RequestError) {
    return { status: e.status, body: { error: e.message, ...(e.payload ?? {}) } };
  }
  console.error("[api:requests]", e);
  return { status: 500, body: { error: "Something went wrong. Please try again." } };
}

/**
 * Load + scope-check a staff member to the org+location attached to the current default
 * location, in one round-trip. Throws `RequestError(404)` if missing or out of scope.
 */
export async function loadStaffForLocation(args: {
  staffId: string;
  organizationId: string;
  locationId: string;
}): Promise<{ id: string; firstName: string; lastName: string }> {
  const staff = await prisma.staff.findFirst({
    where: {
      id: args.staffId,
      organizationId: args.organizationId,
      locationId: args.locationId,
    },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!staff) throw new RequestError("Staff not found", 404);
  return staff;
}

/**
 * Clear roster shifts that overlap a `(staffId, [startDate, endDate])` range and flip a leave
 * row to `approved`. We delete (rather than null-out) conflicting RosterEntry rows so the
 * grid's empty-cell semantics stay consistent with the manual clear flow in
 * `app/api/roster/weeks/[id]/entries/route.ts` (PUT with `shiftTemplateId: null` deletes too).
 *
 * Use `kind: "vacation"` for ranges and `kind: "dayOff"` for single-date rows; the leave row's
 * status update happens inside the same transaction so the inbox can never show "approved" while
 * conflicting shifts still exist.
 */
export async function approveLeaveTx(args: {
  organizationId: string;
  kind: "vacation" | "dayOff";
  leaveId: string;
  staffId: string;
  startDate: Date;
  endDate: Date;
  decidedByUserId: string;
}): Promise<void> {
  const decidedAt = new Date();
  await prisma.$transaction([
    prisma.rosterEntry.deleteMany({
      where: {
        staff: { organizationId: args.organizationId, id: args.staffId },
        shiftTemplateId: { not: null },
        date: { gte: args.startDate, lte: args.endDate },
      },
    }),
    args.kind === "vacation"
      ? prisma.staffVacation.update({
          where: { id: args.leaveId },
          data: {
            status: "approved",
            decidedByUserId: args.decidedByUserId,
            decidedAt,
          },
        })
      : prisma.staffDayOff.update({
          where: { id: args.leaveId },
          data: {
            status: "approved",
            decidedByUserId: args.decidedByUserId,
            decidedAt,
          },
        }),
  ]);
}
