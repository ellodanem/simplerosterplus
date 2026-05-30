import { prisma } from "@/lib/prisma";

// Append-only operator action trail. Every privileged operator action (and login) should
// call this. Never updated or deleted by the console. See docs/OPERATOR_CONSOLE.md.

export type OperatorAuditInput = {
  operatorUserId: string;
  action: string; // dotted key, e.g. "org.suspend", "auth.login", "impersonate.start"
  targetType: string; // "organization" | "appUser" | "device" | "session" | ...
  targetId?: string | null;
  organizationId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export async function recordOperatorAudit(input: OperatorAuditInput): Promise<void> {
  try {
    await prisma.operatorAuditLog.create({
      data: {
        operatorUserId: input.operatorUserId,
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId ?? null,
        organizationId: input.organizationId ?? null,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      },
    });
  } catch (err) {
    // Audit must never block the action it records; surface for ops monitoring instead.
    console.error("operator audit write failed", { action: input.action, err });
  }
}
