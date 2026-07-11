import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { isValidTimeZone } from "@/lib/timezone";
import { ensureDefaultShiftTemplates } from "@/lib/seed-default-shifts";

const DEFAULT_LOCATION_NAME = "Main";
const MIN_PASSWORD_LENGTH = 8;

export type ProvisionOrganizationInput = {
  name: string;
  timeZone: string;
  adminEmail: string;
  adminPassword?: string;
};

export type ProvisionOrganizationResult = {
  organizationId: string;
  organizationName: string;
  locationId: string;
  locationName: string;
  adminUserId: string;
  adminEmail: string;
  adminPassword: string;
  passwordGenerated: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateTempPassword(length = 16): string {
  const alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function validateProvisionOrganizationInput(
  input: ProvisionOrganizationInput,
): { ok: true; data: ProvisionOrganizationInput } | { ok: false; error: string } {
  const name = input.name.trim();
  const timeZone = input.timeZone.trim();
  const adminEmail = normalizeEmail(input.adminEmail);
  const adminPassword =
    typeof input.adminPassword === "string" ? input.adminPassword : undefined;

  if (!name) return { ok: false, error: "Organization name is required" };
  if (!timeZone) return { ok: false, error: "Timezone is required" };
  if (!isValidTimeZone(timeZone)) {
    return { ok: false, error: `'${timeZone}' is not a recognized IANA time zone` };
  }
  if (!adminEmail || !adminEmail.includes("@")) {
    return { ok: false, error: "A valid admin email is required" };
  }
  if (adminPassword !== undefined && adminPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    };
  }

  return {
    ok: true,
    data: { name, timeZone, adminEmail, adminPassword },
  };
}

/** Creates Organization + default Location + admin AppUser in one transaction. */
export async function provisionOrganization(
  input: ProvisionOrganizationInput,
): Promise<ProvisionOrganizationResult> {
  const validated = validateProvisionOrganizationInput(input);
  if (!validated.ok) throw new Error(validated.error);

  const { name, timeZone, adminEmail, adminPassword } = validated.data;
  const passwordGenerated = !adminPassword;
  const plainPassword = adminPassword ?? generateTempPassword();
  const passwordHash = await hashPassword(plainPassword);

  const existingUser = await prisma.appUser.findFirst({
    where: { email: adminEmail },
    select: { id: true, organizationId: true },
  });
  if (existingUser) {
    throw new Error(
      `An app user with email ${adminEmail} already exists (org ${existingUser.organizationId}). Use a unique admin email.`,
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name, timeZone },
      select: { id: true, name: true },
    });

    const location = await tx.location.create({
      data: {
        organizationId: org.id,
        name: DEFAULT_LOCATION_NAME,
        isDefault: true,
        sortOrder: 0,
      },
      select: { id: true, name: true },
    });

    const admin = await tx.appUser.create({
      data: {
        organizationId: org.id,
        email: adminEmail,
        passwordHash,
      },
      select: { id: true, email: true },
    });

    await ensureDefaultShiftTemplates(org.id, tx);

    return { org, location, admin };
  });

  return {
    organizationId: result.org.id,
    organizationName: result.org.name,
    locationId: result.location.id,
    locationName: result.location.name,
    adminUserId: result.admin.id,
    adminEmail: result.admin.email,
    adminPassword: plainPassword,
    passwordGenerated,
  };
}
