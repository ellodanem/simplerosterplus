import { PunchSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getLastAdmsRequest } from "@/lib/adms-last-request";

export const ATTLOG_UPLOAD_HINT =
  "Device connected, but no punches yet. On the terminal, turn on real-time attendance upload.";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;

export type AdmsHealthDevice = {
  id: string;
  name: string;
  serialNumber: string | null;
  enabled: boolean;
  connectionMode: string;
  lastSeenAt: string | null;
  punchCount24h: number;
  hint: string | null;
};

export type AdmsHealthLatest = {
  punchAt: string;
  createdAt: string;
  deviceUserId: string | null;
  punchType: string;
  staffName: string | null;
  staffId: string | null;
  deviceId: string | null;
  deviceName: string | null;
};

export type AdmsHealthResponse = {
  summary: {
    totalAdmsPunches: number;
    unmappedCount: number;
    last24hCount: number;
    last7dCount: number;
    manualTotal: number;
  };
  devices: AdmsHealthDevice[];
  latest: AdmsHealthLatest | null;
  lastRequest: ReturnType<typeof getLastAdmsRequest>;
  hints: string[];
};

export function admsDeviceHint(
  lastSeenAt: Date | null,
  punchCount24h: number,
  enabled: boolean,
  connectionMode: string,
  now = new Date(),
): string | null {
  if (connectionMode !== "adms_push" || !enabled || !lastSeenAt) return null;
  const ageMs = now.getTime() - lastSeenAt.getTime();
  if (ageMs >= 0 && ageMs <= MS_24H && punchCount24h === 0) {
    return ATTLOG_UPLOAD_HINT;
  }
  return null;
}

export async function getAdmsHealth(orgId: string): Promise<AdmsHealthResponse> {
  const now = new Date();
  const since24h = new Date(now.getTime() - MS_24H);
  const since7d = new Date(now.getTime() - MS_7D);

  const [
    devices,
    punchCounts24h,
    totalAdmsPunches,
    unmappedCount,
    last24hCount,
    last7dCount,
    manualTotal,
    latest,
  ] = await Promise.all([
    prisma.device.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        serialNumber: true,
        enabled: true,
        connectionMode: true,
        lastSeenAt: true,
      },
    }),
    prisma.attendanceLog.groupBy({
      by: ["deviceId"],
      where: {
        organizationId: orgId,
        source: PunchSource.device_adms,
        deviceId: { not: null },
        createdAt: { gte: since24h },
      },
      _count: { _all: true },
    }),
    prisma.attendanceLog.count({
      where: { organizationId: orgId, source: PunchSource.device_adms },
    }),
    prisma.attendanceLog.count({
      where: {
        organizationId: orgId,
        source: PunchSource.device_adms,
        staffId: null,
      },
    }),
    prisma.attendanceLog.count({
      where: {
        organizationId: orgId,
        source: PunchSource.device_adms,
        createdAt: { gte: since24h },
      },
    }),
    prisma.attendanceLog.count({
      where: {
        organizationId: orgId,
        source: PunchSource.device_adms,
        createdAt: { gte: since7d },
      },
    }),
    prisma.attendanceLog.count({
      where: { organizationId: orgId, source: PunchSource.manual },
    }),
    prisma.attendanceLog.findFirst({
      where: { organizationId: orgId, source: PunchSource.device_adms },
      orderBy: { createdAt: "desc" },
      include: {
        staff: { select: { firstName: true, lastName: true } },
        device: { select: { name: true } },
      },
    }),
  ]);

  const countByDeviceId = new Map(
    punchCounts24h
      .filter((row) => row.deviceId)
      .map((row) => [row.deviceId!, row._count._all]),
  );

  const deviceRows: AdmsHealthDevice[] = devices.map((d) => {
    const punchCount24h = countByDeviceId.get(d.id) ?? 0;
    return {
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      enabled: d.enabled,
      connectionMode: d.connectionMode,
      lastSeenAt: d.lastSeenAt?.toISOString() ?? null,
      punchCount24h,
      hint: admsDeviceHint(d.lastSeenAt, punchCount24h, d.enabled, d.connectionMode, now),
    };
  });

  const hints = [...new Set(deviceRows.map((d) => d.hint).filter(Boolean))] as string[];

  const latestOut: AdmsHealthLatest | null = latest
    ? {
        punchAt: latest.punchAt.toISOString(),
        createdAt: latest.createdAt.toISOString(),
        deviceUserId: latest.deviceUserId,
        punchType: latest.punchType,
        staffName: latest.staff
          ? `${latest.staff.firstName} ${latest.staff.lastName}`.trim()
          : null,
        staffId: latest.staffId,
        deviceId: latest.deviceId,
        deviceName: latest.device?.name ?? null,
      }
    : null;

  return {
    summary: {
      totalAdmsPunches,
      unmappedCount,
      last24hCount,
      last7dCount,
      manualTotal,
    },
    devices: deviceRows,
    latest: latestOut,
    lastRequest: getLastAdmsRequest(),
    hints,
  };
}
