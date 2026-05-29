import type { Prisma, PunchSource, PunchType } from "@prisma/client";
import { deviceUserIdLookupKeys, expandDeviceUserIdsForDbMatch } from "@/lib/device-user-id";
import { prisma } from "@/lib/prisma";

const DEDUPE_WINDOW_MS = 1000;
const CREATE_MANY_CHUNK = 250;

export type AttendancePunchInsert = {
  organizationId: string;
  locationId: string;
  staffId: string | null;
  deviceId: string;
  deviceUserId: string;
  punchAt: Date;
  punchType: PunchType;
  source: PunchSource;
  deviceRawTimestamp?: string | null;
  ingestReceivedAt?: Date | null;
  clockOffsetMsApplied?: number | null;
  clockNormalizeReason?: string | null;
};

function deviceIdsOverlap(a: string, b: string): boolean {
  const keysA = new Set(deviceUserIdLookupKeys(a));
  for (const k of deviceUserIdLookupKeys(b)) {
    if (keysA.has(k)) return true;
  }
  return false;
}

function punchTimesOverlap(a: Date, b: Date): boolean {
  return Math.abs(a.getTime() - b.getTime()) <= DEDUPE_WINDOW_MS;
}

function isDuplicatePunch(
  candidate: { deviceUserId: string; punchAt: Date },
  other: { deviceUserId: string; punchAt: Date },
): boolean {
  return (
    deviceIdsOverlap(candidate.deviceUserId, other.deviceUserId) &&
    punchTimesOverlap(candidate.punchAt, other.punchAt)
  );
}

function collectLookupDeviceUserIds(rows: AttendancePunchInsert[]): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    ids.push(row.deviceUserId);
  }
  return expandDeviceUserIdsForDbMatch(ids);
}

/**
 * Insert punches in bulk, skipping rows that match an existing punch (±1s, device id variants)
 * or an earlier row in the same batch. Scoped to organization + location.
 */
export async function insertAttendancePunchesSkippingDuplicates(
  rows: AttendancePunchInsert[],
): Promise<{ created: number; skipped: number }> {
  if (rows.length === 0) return { created: 0, skipped: 0 };

  const organizationId = rows[0]!.organizationId;
  const locationId = rows[0]!.locationId;

  let minMs = Infinity;
  let maxMs = -Infinity;
  for (const row of rows) {
    const t = row.punchAt.getTime();
    if (t < minMs) minMs = t;
    if (t > maxMs) maxMs = t;
  }

  const lookupIds = collectLookupDeviceUserIds(rows);
  const existing = await prisma.attendanceLog.findMany({
    where: {
      organizationId,
      locationId,
      deviceUserId: { in: lookupIds },
      punchAt: {
        gte: new Date(minMs - DEDUPE_WINDOW_MS),
        lte: new Date(maxMs + DEDUPE_WINDOW_MS),
      },
    },
    select: { deviceUserId: true, punchAt: true },
  });

  const seen: Array<{ deviceUserId: string; punchAt: Date }> = [];
  for (const e of existing) {
    if (e.deviceUserId) {
      seen.push({ deviceUserId: e.deviceUserId, punchAt: e.punchAt });
    }
  }

  const toCreate: Prisma.AttendanceLogCreateManyInput[] = [];
  let skipped = 0;

  for (const row of rows) {
    const candidate = { deviceUserId: row.deviceUserId, punchAt: row.punchAt };
    if (seen.some((p) => isDuplicatePunch(candidate, p))) {
      skipped++;
      continue;
    }
    toCreate.push({
      organizationId: row.organizationId,
      locationId: row.locationId,
      staffId: row.staffId,
      deviceId: row.deviceId,
      deviceUserId: row.deviceUserId,
      punchAt: row.punchAt,
      punchType: row.punchType,
      source: row.source,
      deviceRawTimestamp: row.deviceRawTimestamp ?? null,
      ingestReceivedAt: row.ingestReceivedAt ?? null,
      clockOffsetMsApplied: row.clockOffsetMsApplied ?? null,
      clockNormalizeReason: row.clockNormalizeReason ?? null,
    });
    seen.push(candidate);
  }

  if (toCreate.length === 0) return { created: 0, skipped };

  let created = 0;
  for (let i = 0; i < toCreate.length; i += CREATE_MANY_CHUNK) {
    const chunk = toCreate.slice(i, i + CREATE_MANY_CHUNK);
    const result = await prisma.attendanceLog.createMany({ data: chunk });
    created += result.count;
  }

  return { created, skipped };
}
