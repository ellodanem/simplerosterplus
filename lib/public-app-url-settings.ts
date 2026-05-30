import { prisma } from "@/lib/prisma";

/** Per-org override for ADMS pairing copy (`AppSetting`, same key as Shift Close). */
export const PUBLIC_APP_URL_KEY = "public_app_url";

function normalizeStoredPublicAppUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  let u = t.replace(/\/$/, "");
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  return u;
}

export type PublicAppUrlValidation =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

export function validatePublicAppUrlInput(raw: string): PublicAppUrlValidation {
  const t = raw.trim();
  if (!t) return { ok: true, normalized: "" };

  const normalized = normalizeStoredPublicAppUrl(t);
  try {
    const u = new URL(normalized);
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      return { ok: false, error: "URL must use http or https." };
    }
    if (u.pathname !== "/" && u.pathname !== "") {
      return {
        ok: false,
        error: "Use the site origin only — no path (e.g. https://app.example.com).",
      };
    }
    if (u.search || u.hash) {
      return { ok: false, error: "Remove query strings and fragments from the URL." };
    }
    return { ok: true, normalized };
  } catch {
    return { ok: false, error: "Enter a valid URL, e.g. https://app.example.com" };
  }
}

/** Shift Close note: hyphenated hostnames are awkward on some ZKTeco keypads. */
export function publicAppUrlHostnameHyphenWarning(url: string): string | null {
  if (!url.trim()) return null;
  try {
    const host = new URL(normalizeStoredPublicAppUrl(url)).hostname;
    if (host.includes("-")) {
      return "Hostnames with hyphens can be awkward on some ZKTeco keypads — a hyphen-free subdomain is safer if you can use one.";
    }
  } catch {
    return null;
  }
  return null;
}

export async function getOrgPublicAppUrlOverride(organizationId: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({
    where: {
      organizationId_key: { organizationId, key: PUBLIC_APP_URL_KEY },
    },
    select: { value: true },
  });
  if (!row?.value?.trim()) return "";
  return normalizeStoredPublicAppUrl(row.value);
}

export async function setOrgPublicAppUrlOverride(
  organizationId: string,
  normalized: string,
): Promise<void> {
  if (!normalized) {
    await prisma.appSetting.deleteMany({
      where: { organizationId, key: PUBLIC_APP_URL_KEY },
    });
    return;
  }

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId, key: PUBLIC_APP_URL_KEY },
    },
    create: {
      organizationId,
      key: PUBLIC_APP_URL_KEY,
      value: normalized,
    },
    update: { value: normalized },
  });
}
