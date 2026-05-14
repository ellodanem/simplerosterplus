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
      isDefault: true,
      sortOrder: 0,
    },
    update: { isDefault: true },
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

  const holCount = await prisma.publicHoliday.count({ where: { organizationId: org.id } });
  if (holCount === 0) {
    await prisma.publicHoliday.create({
      data: {
        organizationId: org.id,
        date: new Date(Date.UTC(2026, 11, 25)),
        name: "Christmas",
        stationClosed: true,
      },
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
