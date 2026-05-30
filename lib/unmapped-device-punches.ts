import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  canonicalDeviceUserId,
  deviceUserIdForGrouping,
  expandDeviceUserIdsForDbMatch,
  parseDeviceUserIdSlot,
} from "@/lib/device-user-id";

const UNMAPPED_LOOKBACK_DAYS = 90;
const UNMAPPED_PUNCH_FETCH_LIMIT = 2000;

export type UnmappedDeviceUserRow = {
  /** Canonical grouping key (leading zeros stripped for numeric ids). */
  deviceUserId: string;
  locationId: string;
  locationName: string;
  punchCount: number;
  latestPunchAt: string;
};

export type UnmappedStaffOption = {
  id: string;
  firstName: string;
  lastName: string;
  deviceUserId: string | null;
};

export function canonicalizeDeviceUserIdForStaff(raw: string): string {
  const t = raw.trim();
  if (!t) {
    throw new Error("deviceUserId is required");
  }
  const slot = parseDeviceUserIdSlot(t);
  if (slot != null) return canonicalDeviceUserId(slot);
  return t;
}

/**
 * Recent device punches with no staff match, grouped by normalized device user id per location.
 */
export async function listUnmappedDeviceUsers(
  organizationId: string,
): Promise<UnmappedDeviceUserRow[]> {
  const since = new Date(Date.now() - UNMAPPED_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  const punches = await prisma.attendanceLog.findMany({
    where: {
      organizationId,
      staffId: null,
      deviceUserId: { not: null },
      punchAt: { gte: since },
    },
    orderBy: { punchAt: "desc" },
    take: UNMAPPED_PUNCH_FETCH_LIMIT,
    select: {
      deviceUserId: true,
      punchAt: true,
      locationId: true,
      location: { select: { name: true } },
    },
  });

  const byKey = new Map<
    string,
    { deviceUserId: string; locationId: string; locationName: string; count: number; latest: Date }
  >();

  for (const p of punches) {
    const raw = p.deviceUserId?.trim();
    if (!raw) continue;
    const canon = deviceUserIdForGrouping(raw);
    const key = `${p.locationId}__${canon}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, {
        deviceUserId: canon,
        locationId: p.locationId,
        locationName: p.location.name,
        count: 1,
        latest: p.punchAt,
      });
    } else {
      existing.count += 1;
      if (p.punchAt > existing.latest) existing.latest = p.punchAt;
    }
  }

  return [...byKey.values()]
    .map((r) => ({
      deviceUserId: r.deviceUserId,
      locationId: r.locationId,
      locationName: r.locationName,
      punchCount: r.count,
      latestPunchAt: r.latest.toISOString(),
    }))
    .sort((a, b) => b.latestPunchAt.localeCompare(a.latestPunchAt));
}

export async function getStaffOptionsForUnmappedMapping(
  organizationId: string,
  locationIds: string[],
): Promise<Record<string, UnmappedStaffOption[]>> {
  if (locationIds.length === 0) return {};

  const staff = await prisma.staff.findMany({
    where: {
      organizationId,
      locationId: { in: locationIds },
      isActive: true,
      archivedAt: null,
    },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      locationId: true,
      firstName: true,
      lastName: true,
      deviceUserId: true,
    },
  });

  const out: Record<string, UnmappedStaffOption[]> = {};
  for (const locId of locationIds) out[locId] = [];
  for (const s of staff) {
    out[s.locationId]?.push({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      deviceUserId: s.deviceUserId,
    });
  }
  return out;
}

export type MapDeviceUserResult = {
  staffId: string;
  deviceUserId: string;
  backfilledCount: number;
};

/**
 * Assign a terminal user id to a staff member and link past unmapped punches at that location.
 */
export async function mapDeviceUserIdToStaff(args: {
  organizationId: string;
  deviceUserId: string;
  staffId: string;
}): Promise<MapDeviceUserResult> {
  const canonicalId = canonicalizeDeviceUserIdForStaff(args.deviceUserId);
  const lookupIds = expandDeviceUserIdsForDbMatch([canonicalId, args.deviceUserId]);

  const staff = await prisma.staff.findFirst({
    where: { id: args.staffId, organizationId: args.organizationId },
    select: { id: true, locationId: true, firstName: true, lastName: true },
  });
  if (!staff) {
    throw new MapDeviceUserError("Staff not found", 404);
  }

  const conflict = await prisma.staff.findFirst({
    where: {
      locationId: staff.locationId,
      id: { not: staff.id },
      deviceUserId: { in: lookupIds },
    },
    select: { firstName: true, lastName: true, deviceUserId: true },
  });
  if (conflict) {
    throw new MapDeviceUserError(
      `Device user ID ${canonicalId} is already assigned to ${conflict.firstName} ${conflict.lastName}.`,
      409,
    );
  }

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.staff.update({
        where: { id: staff.id },
        data: { deviceUserId: canonicalId },
      });

      const backfill = await tx.attendanceLog.updateMany({
        where: {
          organizationId: args.organizationId,
          locationId: staff.locationId,
          staffId: null,
          deviceUserId: { in: lookupIds },
        },
        data: {
          staffId: staff.id,
          deviceUserId: canonicalId,
        },
      });

      return {
        staffId: staff.id,
        deviceUserId: canonicalId,
        backfilledCount: backfill.count,
      };
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new MapDeviceUserError(
        "Another staff member at this location already uses that device user ID.",
        409,
      );
    }
    throw err;
  }
}

export class MapDeviceUserError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MapDeviceUserError";
  }
}
