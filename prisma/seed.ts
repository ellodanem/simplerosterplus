import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../lib/password";

config({ path: ".env" });
config({ path: ".env.local", override: true });

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "admin@demo.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "demo";
  const orgName = process.env.SEED_ORG_NAME ?? "Demo Organization";
  const timeZone = process.env.SEED_ORG_TIMEZONE ?? "America/Toronto";

  let org = await prisma.organization.findFirst({ where: { name: orgName } });
  if (!org) {
    org = await prisma.organization.create({
      data: { name: orgName, timeZone },
    });
  } else if (org.timeZone !== timeZone) {
    org = await prisma.organization.update({
      where: { id: org.id },
      data: { timeZone },
    });
  }

  const passwordHash = await hashPassword(adminPassword);
  await prisma.appUser.upsert({
    where: {
      organizationId_email: { organizationId: org.id, email: adminEmail },
    },
    create: {
      organizationId: org.id,
      email: adminEmail,
      passwordHash,
    },
    update: { passwordHash },
  });

  const defaultLocation = await prisma.location.upsert({
    where: { organizationId_name: { organizationId: org.id, name: "Main" } },
    create: {
      organizationId: org.id,
      name: "Main",
      holidayCountryCode: "CA",
      holidaySubdivisionCode: "ON",
      isDefault: true,
      sortOrder: 0,
    },
    update: { isDefault: true },
  });

  // Demo device user id for ADMS smoke tests (matches docs/DEVICE_INGEST_SMOKE.md sample lines).
  await prisma.staff.updateMany({
    where: {
      organizationId: org.id,
      locationId: defaultLocation.id,
      firstName: "Alex",
      lastName: "Rivera",
      deviceUserId: null,
    },
    data: { deviceUserId: "7" },
  });

  const staffCount = await prisma.staff.count({ where: { organizationId: org.id } });
  if (staffCount === 0) {
    await prisma.staff.createMany({
      data: [
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          firstName: "Alex",
          lastName: "Rivera",
          email: "alex@demo.local",
          role: "Supervisor",
          deviceUserId: "7",
          sortOrder: 0,
        },
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          firstName: "Jordan",
          lastName: "Lee",
          email: "jordan@demo.local",
          role: "Staff",
          sortOrder: 1,
        },
      ],
    });
  }

  const tplCount = await prisma.shiftTemplate.count({ where: { organizationId: org.id } });
  if (tplCount === 0) {
    await prisma.shiftTemplate.create({
      data: {
        organizationId: org.id,
        name: "Day shift",
        startTime: "09:00",
        endTime: "17:00",
        color: "#2563eb",
      },
    });
  }

  const holCount = await prisma.publicHoliday.count({ where: { locationId: defaultLocation.id } });
  if (holCount === 0) {
    await prisma.publicHoliday.create({
      data: {
        organizationId: org.id,
        locationId: defaultLocation.id,
        date: new Date(Date.UTC(2026, 11, 25)),
        name: "Christmas",
        source: "manual",
        stationClosed: true,
      },
    });
  }

  // Demo ZKTeco devices covering each status pill (online, idle, offline, never connected)
  // and both connection modes. Idempotent via the (locationId, name) unique key.
  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);
  const hoursAgo = (h: number) => new Date(now - h * 60 * 60_000);
  const daysAgo = (d: number) => new Date(now - d * 24 * 60 * 60_000);

  const demoDevices = [
    {
      name: "Front entrance",
      serialNumber: "ZK-K40-0001",
      model: "K40",
      firmwareVersion: "Ver 6.60 Apr 25 2024",
      connectionMode: "adms_push" as const,
      enabled: true,
      lastSeenAt: minutesAgo(2),
      lastUserCount: 18,
      lastFingerprintCount: 36,
      lastPunchCount: 412,
    },
    {
      name: "Back office",
      serialNumber: "ZK-MB360-0042",
      model: "MB360",
      firmwareVersion: "Ver 6.21 Jan 12 2025",
      connectionMode: "pull_tcp" as const,
      ipAddress: "192.168.1.201",
      port: 4370,
      enabled: true,
      lastSeenAt: hoursAgo(3),
      lastUserCount: 7,
      lastFingerprintCount: 14,
      lastPunchCount: 88,
    },
    {
      name: "Warehouse",
      serialNumber: "ZK-SF-V5L-0117",
      model: "SpeedFace-V5L",
      firmwareVersion: "Ver 3.4.5 Sep 02 2025",
      connectionMode: "adms_push" as const,
      enabled: true,
      lastSeenAt: daysAgo(3),
      lastUserCount: 24,
      lastFingerprintCount: 0,
      lastPunchCount: 1_204,
    },
    {
      name: "Spare unit",
      serialNumber: null,
      model: "K40",
      firmwareVersion: null,
      connectionMode: "adms_push" as const,
      enabled: false,
      lastSeenAt: null,
      lastUserCount: null,
      lastFingerprintCount: null,
      lastPunchCount: null,
    },
  ];

  for (const d of demoDevices) {
    await prisma.device.upsert({
      where: { locationId_name: { locationId: defaultLocation.id, name: d.name } },
      create: {
        organizationId: org.id,
        locationId: defaultLocation.id,
        ...d,
      },
      update: {
        // Refresh the moving fields on every seed run so the page keeps showing fresh
        // relative timestamps. Stable fields (model, serial, etc.) are also rewritten so
        // editing the seed in place propagates without manual cleanup.
        ...d,
      },
    });
  }

  // Attendance: grace window between scheduled shift start and "late" classification. Lives
  // in AppSetting so the value is editable in Studio without a code change.
  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId: org.id, key: "attendance_grace_minutes" },
    },
    create: {
      organizationId: org.id,
      key: "attendance_grace_minutes",
      value: "10",
    },
    update: {},
  });

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId: org.id, key: "overtime_alerts_enabled" },
    },
    create: {
      organizationId: org.id,
      key: "overtime_alerts_enabled",
      value: "true",
    },
    update: {},
  });

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId: org.id, key: "overtime_weekly_threshold_hours" },
    },
    create: {
      organizationId: org.id,
      key: "overtime_weekly_threshold_hours",
      value: "40",
    },
    update: {},
  });

  // A handful of demo device punches so the attendance log visibly demonstrates every
  // verify-method icon (fingerprint, face, card, password/PIN, palm) alongside the manual
  // ones. Only seeded once — guard on "no device punches exist yet" so re-running doesn't
  // pile them up.
  const staffForDemo = await prisma.staff.findMany({
    where: { organizationId: org.id, locationId: defaultLocation.id },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }],
    select: { id: true },
  });
  const frontDevice = await prisma.device.findFirst({
    where: { locationId: defaultLocation.id, name: "Front entrance" },
    select: { id: true },
  });
  const existingDevicePunches = await prisma.attendanceLog.count({
    where: { organizationId: org.id, source: { not: "manual" } },
  });
  if (existingDevicePunches === 0 && staffForDemo.length >= 2 && frontDevice) {
    const [s1, s2] = staffForDemo;
    const today = new Date();
    today.setUTCHours(13, 0, 0, 0);
    const atTime = (hOffsetDays: number, h: number, m: number) => {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - hOffsetDays);
      d.setUTCHours(h, m, 0, 0);
      return d;
    };
    await prisma.attendanceLog.createMany({
      data: [
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          staffId: s1.id,
          deviceId: frontDevice.id,
          punchAt: atTime(1, 12, 58),
          punchType: "in",
          source: "device_adms",
          verifyMethod: "fingerprint",
        },
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          staffId: s1.id,
          deviceId: frontDevice.id,
          punchAt: atTime(1, 21, 5),
          punchType: "out",
          source: "device_adms",
          verifyMethod: "face",
        },
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          staffId: s2.id,
          deviceId: frontDevice.id,
          punchAt: atTime(1, 13, 2),
          punchType: "in",
          source: "device_adms",
          verifyMethod: "card",
        },
        {
          organizationId: org.id,
          locationId: defaultLocation.id,
          staffId: s2.id,
          deviceId: frontDevice.id,
          punchAt: atTime(1, 21, 12),
          punchType: "out",
          source: "device_adms",
          verifyMethod: "password",
        },
      ],
    });
  }

  console.log("Seed OK:", { orgId: org.id, orgName, timeZone, adminEmail, adminPasswordHint: "(see SEED_ADMIN_PASSWORD or default 'demo')" });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
