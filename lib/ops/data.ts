import { prisma } from "@/lib/prisma";
import { orgMonthlyUsd } from "@/lib/ops/billing";
import { deriveDeviceStatus, relativeTime, type DeviceStatus } from "@/lib/ops/device-status";

// ============================================================================
// Cross-tenant data layer for the operator console.
//
// THIS IS THE ONLY MODULE THAT INTENTIONALLY QUERIES ACROSS ALL TENANTS.
// Tenant-facing code always scopes with `where: { organizationId }`; everything
// here deliberately does not. It must be unreachable without first passing the
// operator gate (lib/ops/context). Keep cross-tenant access confined to this
// file so the bypass is auditable in one place. See docs/OPERATOR_CONSOLE.md.
// ============================================================================

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

// --- Daily series helpers (Postgres date_trunc) --------------------------------

export type DayPoint = { day: string; count: number };

async function dailySeries(
  table: "Organization" | "AttendanceLog",
  column: "createdAt" | "punchAt",
  days: number,
  organizationId?: string,
): Promise<DayPoint[]> {
  const since = new Date(Date.now() - days * DAY_MS);
  // Build the query explicitly per table/column to keep identifiers static (no interpolation).
  let rows: Array<{ day: Date; count: bigint }>;
  if (table === "Organization") {
    rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "createdAt") AS day, COUNT(*)::bigint AS count
      FROM "Organization"
      WHERE "createdAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;
  } else if (organizationId) {
    rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "punchAt") AS day, COUNT(*)::bigint AS count
      FROM "AttendanceLog"
      WHERE "punchAt" >= ${since} AND "organizationId" = ${organizationId}
      GROUP BY 1 ORDER BY 1`;
  } else {
    rows = await prisma.$queryRaw<Array<{ day: Date; count: bigint }>>`
      SELECT date_trunc('day', "punchAt") AS day, COUNT(*)::bigint AS count
      FROM "AttendanceLog"
      WHERE "punchAt" >= ${since}
      GROUP BY 1 ORDER BY 1`;
  }
  return rows.map((r) => ({ day: new Date(r.day).toISOString().slice(0, 10), count: Number(r.count) }));
}

// --- Platform overview ---------------------------------------------------------

export type AttentionItem = {
  organizationId: string;
  name: string;
  kind: "payment_failed" | "trial_ending" | "suspended" | "ingest_stalled";
  detail: string;
  tone: "danger" | "warn";
};

export type PlatformOverview = {
  activeOrgs: number;
  totalOrgs: number;
  suspendedOrgs: number;
  mrrUsd: number;
  trialsEndingSoon: number;
  devicesOnline: number;
  devicesTotal: number;
  punchesToday: number;
  planMix: { plan: string; count: number }[];
  signupSeries: DayPoint[];
  attention: AttentionItem[];
};

export async function getPlatformOverview(): Promise<PlatformOverview> {
  const now = Date.now();
  const onlineSince = new Date(now - ONLINE_THRESHOLD_MS);
  const in7Days = new Date(now + 7 * DAY_MS);
  const todayStart = startOfUtcDay();

  const [
    totalOrgs,
    suspendedOrgs,
    trialsEndingSoon,
    devicesTotal,
    devicesOnline,
    punchesToday,
    planGroups,
    activeSubs,
    signupSeries,
    attentionOrgs,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { suspendedAt: { not: null } } }),
    prisma.organization.count({
      where: { trialEndsAt: { gte: new Date(now), lte: in7Days }, suspendedAt: null },
    }),
    prisma.device.count({ where: { deletedAt: null } }),
    prisma.device.count({
      where: { deletedAt: null, enabled: true, lastSeenAt: { gte: onlineSince } },
    }),
    prisma.attendanceLog.count({ where: { punchAt: { gte: todayStart } } }),
    prisma.organization.groupBy({ by: ["plan"], _count: { _all: true } }),
    prisma.organization.findMany({
      where: { subscriptionStatus: "active" },
      select: { plan: true, mrrCents: true },
    }),
    dailySeries("Organization", "createdAt", 90),
    prisma.organization.findMany({
      where: {
        OR: [
          { subscriptionStatus: { in: ["past_due", "unpaid"] } },
          { trialEndsAt: { gte: new Date(now), lte: in7Days } },
          { suspendedAt: { not: null } },
        ],
      },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        suspendedAt: true,
      },
      take: 12,
    }),
  ]);

  const mrrUsd = activeSubs.reduce((sum, o) => sum + orgMonthlyUsd(o), 0);
  const activeOrgs = totalOrgs - suspendedOrgs;

  const planMix = planGroups
    .map((g) => ({ plan: g.plan ?? "none", count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  const attention: AttentionItem[] = [];
  for (const o of attentionOrgs) {
    if (o.suspendedAt) {
      attention.push({
        organizationId: o.id,
        name: o.name,
        kind: "suspended",
        detail: "Suspended",
        tone: "danger",
      });
    } else if (o.subscriptionStatus === "past_due" || o.subscriptionStatus === "unpaid") {
      attention.push({
        organizationId: o.id,
        name: o.name,
        kind: "payment_failed",
        detail: "Payment failed",
        tone: "danger",
      });
    } else if (o.trialEndsAt) {
      const days = Math.max(0, Math.ceil((o.trialEndsAt.getTime() - now) / DAY_MS));
      attention.push({
        organizationId: o.id,
        name: o.name,
        kind: "trial_ending",
        detail: days <= 1 ? "Trial ends today/tomorrow" : `Trial ends in ${days} days`,
        tone: "warn",
      });
    }
  }

  return {
    activeOrgs,
    totalOrgs,
    suspendedOrgs,
    mrrUsd,
    trialsEndingSoon,
    devicesOnline,
    devicesTotal,
    punchesToday,
    planMix,
    signupSeries,
    attention,
  };
}

// --- Organizations list --------------------------------------------------------

export type OrgListRow = {
  id: string;
  name: string;
  plan: string | null;
  subscriptionStatus: string | null;
  isDemo: boolean;
  suspendedAt: Date | null;
  trialEndsAt: Date | null;
  createdAt: Date;
  locations: number;
  staff: number;
  devices: number;
  admins: number;
  mrrUsd: number;
};

export async function listOrganizationsForOps(search?: string): Promise<OrgListRow[]> {
  const where = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : undefined;

  const orgs = await prisma.organization.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      name: true,
      plan: true,
      mrrCents: true,
      subscriptionStatus: true,
      isDemo: true,
      suspendedAt: true,
      trialEndsAt: true,
      createdAt: true,
    },
  });
  const ids = orgs.map((o) => o.id);
  if (ids.length === 0) return [];

  const [locGroups, staffGroups, deviceGroups, adminGroups] = await Promise.all([
    prisma.location.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids } },
      _count: { _all: true },
    }),
    prisma.staff.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, archivedAt: null },
      _count: { _all: true },
    }),
    prisma.device.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids }, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.appUser.groupBy({
      by: ["organizationId"],
      where: { organizationId: { in: ids } },
      _count: { _all: true },
    }),
  ]);

  const toMap = (groups: { organizationId: string; _count: { _all: number } }[]) =>
    new Map(groups.map((g) => [g.organizationId, g._count._all]));
  const locMap = toMap(locGroups);
  const staffMap = toMap(staffGroups);
  const deviceMap = toMap(deviceGroups);
  const adminMap = toMap(adminGroups);

  return orgs.map((o) => ({
    ...o,
    locations: locMap.get(o.id) ?? 0,
    staff: staffMap.get(o.id) ?? 0,
    devices: deviceMap.get(o.id) ?? 0,
    admins: adminMap.get(o.id) ?? 0,
    mrrUsd: o.subscriptionStatus === "active" ? orgMonthlyUsd(o) : 0,
  }));
}

// --- Organization detail (360) -------------------------------------------------

export type OrgDetail = NonNullable<Awaited<ReturnType<typeof getOrganizationDetail>>>;

export async function getOrganizationDetail(id: string) {
  const org = await prisma.organization.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      timeZone: true,
      plan: true,
      mrrCents: true,
      subscriptionStatus: true,
      currentPeriodEnd: true,
      trialEndsAt: true,
      isDemo: true,
      demoExpiresAt: true,
      deviceTrialStartedAt: true,
      deviceTrialExpiresAt: true,
      deviceTrialExtensionUsed: true,
      addonDeviceQty: true,
      addonAdminQty: true,
      addonWhatsapp: true,
      suspendedAt: true,
      stripeCustomerId: true,
      createdAt: true,
    },
  });
  if (!org) return null;

  const [locations, staff, devices, admins, owner, recentAudit, punchSeries] =
    await Promise.all([
      prisma.location.count({ where: { organizationId: id } }),
      prisma.staff.count({ where: { organizationId: id, archivedAt: null } }),
      prisma.device.count({ where: { organizationId: id, deletedAt: null } }),
      prisma.appUser.count({ where: { organizationId: id } }),
      prisma.appUser.findFirst({
        where: { organizationId: id },
        orderBy: { createdAt: "asc" },
        select: { email: true },
      }),
      prisma.operatorAuditLog.findMany({
        where: { organizationId: id },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { operator: { select: { email: true } } },
      }),
      dailySeries("AttendanceLog", "punchAt", 30, id),
    ]);

  return {
    org,
    counts: { locations, staff, devices, admins },
    ownerEmail: owner?.email ?? null,
    recentAudit,
    punchSeries,
    mrrUsd: org.subscriptionStatus === "active" ? orgMonthlyUsd(org) : 0,
  };
}

// --- Device fleet --------------------------------------------------------------

export type FleetDevice = {
  id: string;
  name: string;
  serialNumber: string | null;
  model: string | null;
  connectionMode: string;
  ipAddress: string | null;
  enabled: boolean;
  lastSeenAt: Date | null;
  lastSeenLabel: string;
  status: DeviceStatus;
  organizationName: string;
  locationName: string;
};

export type FleetResult = {
  devices: FleetDevice[];
  counts: Record<DeviceStatus, number>;
};

export async function listDevicesForOps(): Promise<FleetResult> {
  const now = Date.now();
  const devices = await prisma.device.findMany({
    where: { deletedAt: null },
    orderBy: [{ lastSeenAt: { sort: "desc", nulls: "last" } }],
    take: 500,
    select: {
      id: true,
      name: true,
      serialNumber: true,
      model: true,
      connectionMode: true,
      ipAddress: true,
      enabled: true,
      lastSeenAt: true,
      organization: { select: { name: true } },
      location: { select: { name: true } },
    },
  });

  const counts: Record<DeviceStatus, number> = { online: 0, idle: 0, offline: 0, never: 0 };
  const mapped = devices.map((d) => {
    const status = deriveDeviceStatus(d.lastSeenAt, d.enabled, now);
    counts[status] += 1;
    return {
      id: d.id,
      name: d.name,
      serialNumber: d.serialNumber,
      model: d.model,
      connectionMode: d.connectionMode,
      ipAddress: d.ipAddress,
      enabled: d.enabled,
      lastSeenAt: d.lastSeenAt,
      lastSeenLabel: relativeTime(d.lastSeenAt, now),
      status,
      organizationName: d.organization.name,
      locationName: d.location.name,
    };
  });

  return { devices: mapped, counts };
}

// --- Ingest health -------------------------------------------------------------

const HOUR_MS = 60 * 60 * 1000;

export type IngestErrorRow = {
  organizationId: string;
  organizationName: string;
  deviceUserId: string | null;
  count: number;
  lastPunchAt: Date | null;
};

export type IngestHealth = {
  punchesToday: number; // device-sourced only
  punchSeries24h: { label: string; count: number }[];
  avgClockDriftMs: number | null;
  calibratedDevices: number;
  trackedSerials: number;
  stalledDevices: number; // enabled ADMS push, last seen > 1h ago
  unmapped: IngestErrorRow[];
};

export async function getIngestHealth(): Promise<IngestHealth> {
  const since24h = new Date(Date.now() - 24 * HOUR_MS);
  const oneHourAgo = new Date(Date.now() - HOUR_MS);
  const todayStart = startOfUtcDay();

  const [seriesRows, punchesToday, clocks, stalledDevices, unmappedGroups] = await Promise.all([
    prisma.$queryRaw<Array<{ hour: Date; count: bigint }>>`
      SELECT date_trunc('hour', "punchAt") AS hour, COUNT(*)::bigint AS count
      FROM "AttendanceLog"
      WHERE "punchAt" >= ${since24h} AND "source" <> 'manual'
      GROUP BY 1 ORDER BY 1`,
    prisma.attendanceLog.count({
      where: { punchAt: { gte: todayStart }, source: { not: "manual" } },
    }),
    prisma.attendanceDeviceClock.findMany({ select: { offsetMs: true, isCalibrated: true } }),
    prisma.device.count({
      where: {
        deletedAt: null,
        enabled: true,
        connectionMode: "adms_push",
        lastSeenAt: { not: null, lt: oneHourAgo },
      },
    }),
    prisma.attendanceLog.groupBy({
      by: ["organizationId", "deviceUserId"],
      where: { staffId: null, source: { not: "manual" } },
      _count: { _all: true },
      _max: { punchAt: true },
    }),
  ]);

  const punchSeries24h = seriesRows.map((r) => ({
    label: new Date(r.hour).toISOString().slice(11, 16),
    count: Number(r.count),
  }));

  const calibratedDevices = clocks.filter((c) => c.isCalibrated).length;
  const avgClockDriftMs =
    clocks.length > 0
      ? Math.round(clocks.reduce((s, c) => s + Math.abs(c.offsetMs), 0) / clocks.length)
      : null;

  const topUnmapped = unmappedGroups
    .map((g) => ({
      organizationId: g.organizationId,
      deviceUserId: g.deviceUserId,
      count: g._count._all,
      lastPunchAt: g._max.punchAt,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const orgIds = [...new Set(topUnmapped.map((u) => u.organizationId))];
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      })
    : [];
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  const unmapped: IngestErrorRow[] = topUnmapped.map((u) => ({
    organizationId: u.organizationId,
    organizationName: orgName.get(u.organizationId) ?? u.organizationId,
    deviceUserId: u.deviceUserId,
    count: u.count,
    lastPunchAt: u.lastPunchAt,
  }));

  return {
    punchesToday,
    punchSeries24h,
    avgClockDriftMs,
    calibratedDevices,
    trackedSerials: clocks.length,
    stalledDevices,
    unmapped,
  };
}

// --- Audit log -----------------------------------------------------------------

export type AuditRow = {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  organizationId: string | null;
  metadata: string | null;
  createdAt: Date;
  operatorEmail: string;
  organizationName: string | null;
};

export async function listAuditLog(opts?: { action?: string; limit?: number }): Promise<AuditRow[]> {
  const rows = await prisma.operatorAuditLog.findMany({
    where: opts?.action ? { action: opts.action } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(opts?.limit ?? 100, 300),
    include: { operator: { select: { email: true } } },
  });

  const orgIds = [...new Set(rows.map((r) => r.organizationId).filter((x): x is string => !!x))];
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true },
      })
    : [];
  const orgName = new Map(orgs.map((o) => [o.id, o.name]));

  return rows.map((r) => ({
    id: r.id,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    organizationId: r.organizationId,
    metadata: r.metadata,
    createdAt: r.createdAt,
    operatorEmail: r.operator.email,
    organizationName: r.organizationId ? orgName.get(r.organizationId) ?? null : null,
  }));
}

// --- Billing overview ----------------------------------------------------------

export type BillingOverview = {
  mrrUsd: number;
  arrUsd: number;
  activeSubscriptions: number;
  trialing: number;
  pastDue: number;
  planBreakdown: { plan: string; count: number; mrrUsd: number }[];
  dunning: {
    id: string;
    name: string;
    subscriptionStatus: string | null;
    trialEndsAt: Date | null;
    stripeCustomerId: string | null;
  }[];
};

export async function getBillingOverview(): Promise<BillingOverview> {
  const now = Date.now();
  const in7Days = new Date(now + 7 * DAY_MS);

  const [activeSubs, trialing, pastDue, dunning] = await Promise.all([
    prisma.organization.findMany({
      where: { subscriptionStatus: "active" },
      select: { plan: true, mrrCents: true },
    }),
    prisma.organization.count({ where: { subscriptionStatus: "trialing" } }),
    prisma.organization.count({ where: { subscriptionStatus: { in: ["past_due", "unpaid"] } } }),
    prisma.organization.findMany({
      where: {
        OR: [
          { subscriptionStatus: { in: ["past_due", "unpaid"] } },
          { trialEndsAt: { gte: new Date(now), lte: in7Days } },
        ],
      },
      orderBy: { trialEndsAt: "asc" },
      take: 20,
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        stripeCustomerId: true,
      },
    }),
  ]);

  const planMap = new Map<string, { count: number; mrrUsd: number }>();
  let mrrUsd = 0;
  for (const o of activeSubs) {
    const plan = o.plan ?? "none";
    const price = orgMonthlyUsd(o);
    mrrUsd += price;
    const cur = planMap.get(plan) ?? { count: 0, mrrUsd: 0 };
    cur.count += 1;
    cur.mrrUsd += price;
    planMap.set(plan, cur);
  }

  const planBreakdown = [...planMap.entries()]
    .map(([plan, v]) => ({ plan, count: v.count, mrrUsd: v.mrrUsd }))
    .sort((a, b) => b.mrrUsd - a.mrrUsd);

  return {
    mrrUsd,
    arrUsd: mrrUsd * 12,
    activeSubscriptions: activeSubs.length,
    trialing,
    pastDue,
    planBreakdown,
    dunning,
  };
}

// --- Tester feedback (design-partner intake) -----------------------------------

export type TesterFeedbackRow = {
  id: string;
  organizationId: string;
  orgName: string;
  userEmail: string;
  category: string;
  message: string;
  pageUrl: string | null;
  status: string;
  createdAt: Date;
};

export async function listTesterFeedback(opts?: {
  limit?: number;
  status?: string;
}): Promise<TesterFeedbackRow[]> {
  const limit = opts?.limit ?? 100;
  return prisma.testerFeedback.findMany({
    where: opts?.status ? { status: opts.status } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      organizationId: true,
      orgName: true,
      userEmail: true,
      category: true,
      message: true,
      pageUrl: true,
      status: true,
      createdAt: true,
    },
  });
}
