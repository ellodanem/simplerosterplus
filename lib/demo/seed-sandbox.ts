import type { PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { utcDateFromYmd, formatYmdInZone } from "@/lib/datetime-policy";
import { currentWeekStartYmd } from "@/lib/roster-week";
import { ROSTER_WEEK_START_WEEKDAY_DEFAULT } from "@/lib/roster-week-settings";

type Db = Pick<PrismaClient, "$transaction"> | typeof prisma;

const DEMO_TIME_ZONE = "America/Toronto";

/** Seed a demo sandbox org with staff, shifts, roster, device, and sample punches. */
export async function seedDemoSandbox(organizationId: string, db: Db = prisma): Promise<void> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, timeZone: true },
  });
  if (!org) throw new Error(`Organization not found: ${organizationId}`);

  const timeZone = org.timeZone === "UTC" ? DEMO_TIME_ZONE : org.timeZone;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { timeZone },
  });

  const location = await prisma.location.findFirst({
    where: { organizationId, isDefault: true },
    select: { id: true },
  });
  if (!location) throw new Error("Demo org is missing a default location.");

  await prisma.location.update({
    where: { id: location.id },
    data: {
      holidayCountryCode: "CA",
      holidaySubdivisionCode: "ON",
    },
  });

  const supervisorRole = await prisma.staffRole.upsert({
    where: { organizationId_name: { organizationId, name: "Supervisor" } },
    create: { organizationId, name: "Supervisor", sortOrder: 0 },
    update: {},
    select: { id: true, name: true },
  });

  const staffRole = await prisma.staffRole.upsert({
    where: { organizationId_name: { organizationId, name: "Staff" } },
    create: { organizationId, name: "Staff", sortOrder: 1 },
    update: {},
    select: { id: true, name: true },
  });

  const existingDayShift = await prisma.shiftTemplate.findFirst({
    where: { organizationId, name: "Day shift" },
    select: { id: true },
  });
  const dayShift =
    existingDayShift ??
    (await prisma.shiftTemplate.create({
      data: {
        organizationId,
        name: "Day shift",
        startTime: "09:00",
        endTime: "17:00",
        color: "#2563eb",
      },
      select: { id: true },
    }));

  const existingEveningShift = await prisma.shiftTemplate.findFirst({
    where: { organizationId, name: "Evening shift" },
    select: { id: true },
  });
  const eveningShift =
    existingEveningShift ??
    (await prisma.shiftTemplate.create({
      data: {
        organizationId,
        name: "Evening shift",
        startTime: "14:00",
        endTime: "22:00",
        color: "#059669",
      },
      select: { id: true },
    }));

  const staffSeed = [
    { firstName: "Alex", lastName: "Rivera", roleId: supervisorRole.id, role: supervisorRole.name, deviceUserId: "7", sortOrder: 0 },
    { firstName: "Jordan", lastName: "Lee", roleId: staffRole.id, role: staffRole.name, deviceUserId: "12", sortOrder: 1 },
    { firstName: "Sam", lastName: "Chen", roleId: staffRole.id, role: staffRole.name, deviceUserId: "15", sortOrder: 2 },
    { firstName: "Taylor", lastName: "Brooks", roleId: staffRole.id, role: staffRole.name, deviceUserId: "22", sortOrder: 3 },
    { firstName: "Morgan", lastName: "Patel", roleId: staffRole.id, role: staffRole.name, deviceUserId: "31", sortOrder: 4 },
  ] as const;

  const staffRows: Array<{ id: string; sortOrder: number }> = [];
  for (const s of staffSeed) {
    const existing = await prisma.staff.findFirst({
      where: {
        organizationId,
        locationId: location.id,
        firstName: s.firstName,
        lastName: s.lastName,
      },
      select: { id: true, sortOrder: true },
    });
    if (existing) {
      staffRows.push(existing);
      continue;
    }
    const created = await prisma.staff.create({
      data: {
        organizationId,
        locationId: location.id,
        firstName: s.firstName,
        lastName: s.lastName,
        role: s.role,
        roleId: s.roleId,
        deviceUserId: s.deviceUserId,
        sortOrder: s.sortOrder,
        isActive: true,
      },
      select: { id: true, sortOrder: true },
    });
    staffRows.push(created);
  }

  const weekStartYmd = currentWeekStartYmd(timeZone, ROSTER_WEEK_START_WEEKDAY_DEFAULT);
  const weekStartDate = utcDateFromYmd(weekStartYmd);

  const week = await prisma.rosterWeek.upsert({
    where: {
      locationId_weekStart: { locationId: location.id, weekStart: weekStartDate },
    },
    create: {
      organizationId,
      locationId: location.id,
      weekStart: weekStartDate,
      status: "draft",
    },
    update: {},
    select: { id: true },
  });

  const entryDates = [0, 1, 2, 3, 4].map((offset) => {
    const d = utcDateFromYmd(weekStartYmd);
    d.setUTCDate(d.getUTCDate() + offset);
    return d;
  });

  for (let i = 0; i < staffRows.length; i++) {
    const staffId = staffRows[i]!.id;
    const templateId = i === 0 ? dayShift.id : i % 2 === 0 ? eveningShift.id : dayShift.id;
    for (const date of entryDates.slice(0, 5 - (i % 2))) {
      await prisma.rosterEntry.upsert({
        where: {
          rosterWeekId_staffId_date: {
            rosterWeekId: week.id,
            staffId,
            date,
          },
        },
        create: {
          rosterWeekId: week.id,
          staffId,
          date,
          shiftTemplateId: templateId,
        },
        update: { shiftTemplateId: templateId },
      });
    }
  }

  const now = Date.now();
  const minutesAgo = (m: number) => new Date(now - m * 60_000);

  await prisma.device.upsert({
    where: { locationId_name: { locationId: location.id, name: "Front entrance" } },
    create: {
      organizationId,
      locationId: location.id,
      name: "Front entrance",
      serialNumber: `DEMO-${organizationId.slice(-6).toUpperCase()}`,
      model: "K40",
      connectionMode: "adms_push",
      enabled: true,
      lastSeenAt: minutesAgo(5),
    },
    update: {
      lastSeenAt: minutesAgo(5),
      enabled: true,
    },
  });

  const frontDevice = await prisma.device.findFirst({
    where: { locationId: location.id, name: "Front entrance" },
    select: { id: true },
  });

  const existingPunches = await prisma.attendanceLog.count({
    where: { organizationId, source: { not: "manual" } },
  });

  if (existingPunches === 0 && frontDevice && staffRows.length >= 2) {
    const todayYmd = formatYmdInZone(new Date(), timeZone);
    const yesterday = utcDateFromYmd(todayYmd);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);

    const punchAt = (base: Date, h: number, m: number) => {
      const d = new Date(base);
      d.setUTCHours(h + 5, m, 0, 0);
      return d;
    };

    await prisma.attendanceLog.createMany({
      data: [
        {
          organizationId,
          locationId: location.id,
          staffId: staffRows[0]!.id,
          deviceId: frontDevice.id,
          punchAt: punchAt(yesterday, 8, 58),
          punchType: "in",
          source: "device_adms",
          verifyMethod: "fingerprint",
        },
        {
          organizationId,
          locationId: location.id,
          staffId: staffRows[0]!.id,
          deviceId: frontDevice.id,
          punchAt: punchAt(yesterday, 17, 5),
          punchType: "out",
          source: "device_adms",
          verifyMethod: "face",
        },
        {
          organizationId,
          locationId: location.id,
          staffId: staffRows[1]!.id,
          deviceId: frontDevice.id,
          punchAt: punchAt(yesterday, 9, 4),
          punchType: "in",
          source: "device_adms",
          verifyMethod: "card",
        },
      ],
    });
  }

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId, key: "attendance_grace_minutes" },
    },
    create: { organizationId, key: "attendance_grace_minutes", value: "10" },
    update: {},
  });
}
