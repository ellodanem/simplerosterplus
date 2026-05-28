import { prisma } from "@/lib/prisma";

export type TaxonomyKind = "role" | "department";

export async function findTaxonomyNameCollision(
  organizationId: string,
  name: string,
  kind: TaxonomyKind,
): Promise<{ kind: TaxonomyKind; name: string } | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;

  if (kind === "role") {
    const dept = await prisma.department.findFirst({
      where: { organizationId, name: { equals: trimmed, mode: "insensitive" } },
      select: { name: true },
    });
    if (dept) return { kind: "department", name: dept.name };
    return null;
  }

  const role = await prisma.staffRole.findFirst({
    where: { organizationId, name: { equals: trimmed, mode: "insensitive" } },
    select: { name: true },
  });
  if (role) return { kind: "role", name: role.name };
  return null;
}

export function taxonomyCollisionWarning(
  collision: { kind: TaxonomyKind; name: string },
  creating: TaxonomyKind,
): string {
  const other = creating === "role" ? "department" : "role";
  return `A ${other} named "${collision.name}" already exists. Roles and departments serve different purposes — consider a different name.`;
}
