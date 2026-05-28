import { prisma } from "./prisma";

export type DefaultLocation = {
  id: string;
  name: string;
  /** IANA override for this location, or null when it inherits the org timezone. */
  timeZone: string | null;
  holidayCountryCode: string | null;
  holidaySubdivisionCode: string | null;
};

export type OrgLocation = Pick<DefaultLocation, "id" | "name">;

const locationSelect = {
  id: true,
  name: true,
  timeZone: true,
  holidayCountryCode: true,
  holidaySubdivisionCode: true,
} as const;

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
    select: locationSelect,
  });
  if (!loc) {
    throw new Error(
      `Organization ${organizationId} has no default location. Run npm run db:seed to create one.`,
    );
  }
  return loc;
}

export async function getOrgLocations(organizationId: string): Promise<OrgLocation[]> {
  return prisma.location.findMany({
    where: { organizationId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true },
  });
}

/** Resolve a location by id within the org, or fall back to the default location. */
export async function resolveLocation(
  organizationId: string,
  locationId: string | null | undefined,
): Promise<DefaultLocation> {
  if (locationId) {
    const loc = await prisma.location.findFirst({
      where: { id: locationId, organizationId },
      select: locationSelect,
    });
    if (loc) return loc;
  }
  return getDefaultLocation(organizationId);
}
