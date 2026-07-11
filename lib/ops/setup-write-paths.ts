/**
 * Tenant API paths that an onboarding-simulation session may mutate.
 * Everything else stays blocked (same posture as read-only impersonation).
 */
const EXACT_SETUP_WRITE_PATHS = new Set([
  "/api/setup/business",
  "/api/setup/complete",
  "/api/roster/settings",
  "/api/roster/templates",
  "/api/roles",
  "/api/departments",
  "/api/staff",
  "/api/attendance/settings",
  "/api/overtime/settings",
]);

const SETUP_WRITE_PREFIXES = [
  "/api/roster/templates/",
  "/api/roles/",
  "/api/departments/",
];

export function isOnboardingSetupWritePath(pathname: string): boolean {
  if (EXACT_SETUP_WRITE_PATHS.has(pathname)) return true;
  return SETUP_WRITE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
