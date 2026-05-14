import { prisma } from "./prisma";

export type DefaultLocation = {
  id: string;
  name: string;
  /** IANA override for this location, or null when it inherits the org timezone. */
  timeZone: string | null;
};

/**
 * Single-location experience: every API call resolves the org's default Location and scopes
 * its work to it. Multi-location switching is a future UI feature; the data model is already
 * keyed by `locationId`, so callers should always go through this helper instead of assuming
 * an org has exactly one location.
 */
export async function getDefaultLocation(organizationId: string): Promise<DefaultLocation> {
  const loc = await prisma.location.findFirst({
    where: { organizationId, isDefault: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, timeZone: true },
  });
  if (!loc) {
    throw new Error(
      `Organization ${organizationId} has no default location. Run npm run db:seed to create one.`,
    );
  }
  return loc;
}
