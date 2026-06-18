/**
 * Production safety helpers (seed guard, demo login block). See docs/mvp-launch/step-03-production-hardening.md.
 */

export const DEMO_TENANT_EMAIL = "admin@demo.local";
export const DEMO_TENANT_PASSWORD = "demo";
export const DEMO_OPERATOR_EMAIL = "ops@demo.local";
export const DEMO_OPERATOR_PASSWORD = "ops";

const DEV_AUTH_SECRET_PLACEHOLDER = "dev-only-change-me-to-at-least-sixteen-chars";
const DEV_OPERATOR_SECRET_PLACEHOLDER = "dev-only-operator-secret-at-least-sixteen-chars";

/** True on Vercel production or NODE_ENV=production (e.g. `next start`). */
export function isProductionDeploy(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}

export function isDemoLocalEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@demo.local");
}

/** Block well-known seed credentials even if rows still exist in the DB. */
export function isBlockedDemoCredentialPair(email: string, password: string): boolean {
  const normalized = email.trim().toLowerCase();
  const pw = password;
  return (
    (normalized === DEMO_TENANT_EMAIL && pw === DEMO_TENANT_PASSWORD) ||
    (normalized === DEMO_OPERATOR_EMAIL && pw === DEMO_OPERATOR_PASSWORD)
  );
}

export function shouldRejectDemoLoginInProduction(email: string, password: string): boolean {
  if (!isProductionDeploy()) return false;
  if (isDemoLocalEmail(email)) return true;
  return isBlockedDemoCredentialPair(email, password);
}

export function seedUsesDefaultCredentials(config: {
  adminEmail: string;
  adminPassword: string;
  operatorEmail: string;
  operatorPassword: string;
}): boolean {
  const adminEmail = config.adminEmail.trim().toLowerCase();
  const operatorEmail = config.operatorEmail.trim().toLowerCase();
  return (
    (adminEmail === DEMO_TENANT_EMAIL && config.adminPassword === DEMO_TENANT_PASSWORD) ||
    (operatorEmail === DEMO_OPERATOR_EMAIL && config.operatorPassword === DEMO_OPERATOR_PASSWORD)
  );
}

/**
 * Refuse operator provisioning in production with demo credentials or @demo.local emails.
 */
export function assertOperatorProvisionAllowed(config: {
  operatorEmail: string;
  operatorPassword: string;
}): void {
  if (!isProductionDeploy()) return;
  const operatorEmail = config.operatorEmail.trim().toLowerCase();
  if (
    operatorEmail === DEMO_OPERATOR_EMAIL &&
    config.operatorPassword === DEMO_OPERATOR_PASSWORD
  ) {
    throw new Error(
      "Refusing operator provision in production with default demo credentials (ops@demo.local/ops). " +
        "Set PROVISION_OPERATOR_* to a real email and strong password.",
    );
  }
  if (isDemoLocalEmail(operatorEmail)) {
    throw new Error(
      "Refusing operator provision in production with @demo.local email. Use a real address.",
    );
  }
}

/**
 * Refuse `npm run db:seed` in production when it would (re)create default demo logins.
 * Set non-default SEED_* values to seed a real production admin, or run only in dev/preview.
 */
export function assertSeedAllowedInProduction(config: {
  adminEmail: string;
  adminPassword: string;
  operatorEmail: string;
  operatorPassword: string;
}): void {
  if (!isProductionDeploy()) return;
  if (seedUsesDefaultCredentials(config)) {
    throw new Error(
      "Refusing seed in production with default demo credentials (admin@demo.local/demo or ops@demo.local/ops). " +
        "Set SEED_ADMIN_* and SEED_OPERATOR_* to non-default values, or do not run db:seed against production.",
    );
  }
  if (isDemoLocalEmail(config.adminEmail) || isDemoLocalEmail(config.operatorEmail)) {
    throw new Error(
      "Refusing seed in production with @demo.local operator/tenant emails. Use real addresses in SEED_* vars.",
    );
  }
}

export type EnvAuditIssue = { level: "error" | "warn"; code: string; message: string };

/** Validate required env for a deploy target (no secret values logged). */
export function auditRequiredEnv(target: "production" | "development" = "production"): EnvAuditIssue[] {
  const issues: EnvAuditIssue[] = [];
  const isProd = target === "production";

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    issues.push({ level: "error", code: "DATABASE_URL_MISSING", message: "DATABASE_URL is not set" });
  } else if (isProd && databaseUrl.includes("-pooler.") && !process.env.DIRECT_URL?.trim()) {
    issues.push({
      level: "warn",
      code: "DIRECT_URL_RECOMMENDED",
      message:
        "DATABASE_URL uses a Neon pooler; set DIRECT_URL to the direct host (or rely on migrate-deploy auto-derive at build time)",
    });
  }

  const authSecret = process.env.AUTH_SECRET?.trim() ?? "";
  if (authSecret.length < 16) {
    issues.push({
      level: "error",
      code: "AUTH_SECRET_WEAK",
      message: "AUTH_SECRET must be at least 16 characters",
    });
  } else if (isProd && authSecret === DEV_AUTH_SECRET_PLACEHOLDER) {
    issues.push({
      level: "error",
      code: "AUTH_SECRET_PLACEHOLDER",
      message: "AUTH_SECRET is still the .env.example dev placeholder",
    });
  }

  const operatorSecret = process.env.OPERATOR_AUTH_SECRET?.trim() ?? "";
  if (operatorSecret.length < 16) {
    issues.push({
      level: "error",
      code: "OPERATOR_AUTH_SECRET_WEAK",
      message: "OPERATOR_AUTH_SECRET must be at least 16 characters",
    });
  } else if (isProd && operatorSecret === DEV_OPERATOR_SECRET_PLACEHOLDER) {
    issues.push({
      level: "error",
      code: "OPERATOR_AUTH_SECRET_PLACEHOLDER",
      message: "OPERATOR_AUTH_SECRET is still the .env.example dev placeholder",
    });
  }

  if (isProd) {
    const optionalUnset = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SIGNING_SECRET",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "CLERK_SECRET_KEY",
    ].filter((key) => !process.env[key]?.trim());
    if (optionalUnset.length > 0) {
      issues.push({
        level: "warn",
        code: "OPTIONAL_UNSET",
        message: `Intentionally optional for Gate 1 (unset): ${optionalUnset.join(", ")}`,
      });
    }
  }

  return issues;
}
