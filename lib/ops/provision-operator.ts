import type { OperatorRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  assertOperatorProvisionAllowed,
  isDemoLocalEmail,
  isProductionDeploy,
} from "@/lib/production-hardening";

const MIN_PASSWORD_LENGTH = 8;
const VALID_ROLES: OperatorRole[] = ["readonly", "support", "billing", "superadmin"];

export type ProvisionOperatorInput = {
  email: string;
  password: string;
  role?: OperatorRole;
};

export type ProvisionOperatorResult = {
  operatorUserId: string;
  email: string;
  role: OperatorRole;
  created: boolean;
  passwordUpdated: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateOperatorCredentials(
  email: string,
  password: string,
): { ok: true } | { ok: false; error: string } {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes("@")) {
    return { ok: false, error: "A valid operator email is required" };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }
  if (isProductionDeploy() && isDemoLocalEmail(normalized)) {
    return { ok: false, error: "@demo.local addresses are not allowed in production" };
  }
  return { ok: true };
}

/** Create or update an operator allow-list user (re-run to reset password). */
export async function provisionOperator(
  input: ProvisionOperatorInput,
): Promise<ProvisionOperatorResult> {
  const email = normalizeEmail(input.email);
  const password = input.password;
  const role = input.role ?? "superadmin";

  assertOperatorProvisionAllowed({ operatorEmail: email, operatorPassword: password });

  const validated = validateOperatorCredentials(email, password);
  if (!validated.ok) {
    throw new Error(validated.error);
  }
  if (!VALID_ROLES.includes(role)) {
    throw new Error(`Invalid role. Use one of: ${VALID_ROLES.join(", ")}`);
  }

  const passwordHash = await hashPassword(password);
  const existing = await prisma.operatorUser.findUnique({
    where: { email },
    select: { id: true },
  });

  const operator = await prisma.operatorUser.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role,
    },
    update: {
      passwordHash,
      role,
      disabledAt: null,
    },
    select: { id: true, email: true, role: true },
  });

  return {
    operatorUserId: operator.id,
    email: operator.email,
    role: operator.role,
    created: !existing,
    passwordUpdated: Boolean(existing),
  };
}
