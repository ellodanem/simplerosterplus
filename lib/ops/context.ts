import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getOperatorSession } from "@/lib/ops/session";
import type { OperatorRole } from "@prisma/client";

// The operator gate, layer 2. Layer 1 is "valid operator JWT" (lib/ops/session).
// Layer 2 is "there is a live OperatorUser row" — auth proves WHO you are; the allow-list
// proves you MAY operate the control plane (defense in depth). A disabled or deleted
// operator is rejected even with a still-valid cookie. See docs/OPERATOR_CONSOLE.md.

export type OperatorContext = {
  operatorUserId: string;
  email: string;
  role: OperatorRole;
};

// Capability tiers, least → most privileged. Used by `operatorCan`.
const ROLE_RANK: Record<OperatorRole, number> = {
  readonly: 0,
  support: 1,
  billing: 2,
  superadmin: 3,
};

export async function getOperatorContext(): Promise<OperatorContext | null> {
  const session = await getOperatorSession();
  if (!session) return null;

  const operator = await prisma.operatorUser.findUnique({
    where: { id: session.sub },
    select: { id: true, email: true, role: true, disabledAt: true },
  });
  if (!operator || operator.disabledAt) return null;

  return {
    operatorUserId: operator.id,
    email: operator.email,
    role: operator.role,
  };
}

// Server-component guard: returns the context or redirects to the operator login.
export async function requireOperator(nextPath?: string): Promise<OperatorContext> {
  const ctx = await getOperatorContext();
  if (!ctx) {
    const target = nextPath
      ? `/ops/login?next=${encodeURIComponent(nextPath)}`
      : "/ops/login";
    redirect(target);
  }
  return ctx;
}

// True when `role` meets or exceeds the capability tier `min` requires.
export function operatorCan(role: OperatorRole, min: OperatorRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}
