import { prisma } from "@/lib/prisma";

/**
 * Resolve operator notification recipients.
 * Prefers explicit env list (comma-separated), then MARKETING_CONTACT_TO,
 * then active OperatorUser emails.
 */
export async function resolveOperatorNotifyRecipients(
  preferredEnvKeys: string[] = [],
): Promise<string[]> {
  for (const key of preferredEnvKeys) {
    const configured = process.env[key]?.trim();
    if (configured) {
      return configured
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const marketing = process.env.MARKETING_CONTACT_TO?.trim();
  if (marketing) {
    return marketing
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const operators = await prisma.operatorUser.findMany({
    where: { disabledAt: null },
    select: { email: true },
    take: 20,
  });
  return operators.map((o) => o.email).filter(Boolean);
}
