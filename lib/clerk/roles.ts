import type { AppUserRole } from "@prisma/client";

/** Map Clerk org membership role slug to SR+ AppUserRole. */
export function mapClerkRoleToAppUserRole(clerkRole: string | undefined | null): AppUserRole {
  if (!clerkRole) return "member";
  const normalized = clerkRole.toLowerCase();
  if (normalized.includes("owner")) return "owner";
  if (normalized === "org:admin" || normalized.includes("admin")) return "admin";
  return "member";
}
