import { prisma } from "@/lib/prisma";

export type MarketingContactPayload = {
  intent?: string;
  name: string;
  email: string;
  business?: string | null;
  phone?: string | null;
  staffCount?: string | null;
  hasZkteco?: string | null;
  message?: string | null;
  source?: string | null;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseMarketingContactBody(body: unknown): MarketingContactPayload {
  if (!body || typeof body !== "object") {
    throw new ContactValidationError("Invalid JSON body");
  }
  const o = body as Record<string, unknown>;

  const name = trimString(o.name);
  const email = trimString(o.email)?.toLowerCase() ?? "";
  if (!name || name.length < 2) {
    throw new ContactValidationError("Please enter your name.");
  }
  if (!email || !EMAIL_RE.test(email)) {
    throw new ContactValidationError("Please enter a valid email address.");
  }

  const intent = normalizeIntent(trimString(o.intent));
  const business = optionalTrim(o.business);
  const phone = optionalTrim(o.phone);
  const staffCount = optionalTrim(o.staffCount);
  const hasZkteco = normalizeZkteco(optionalTrim(o.hasZkteco));
  const message = optionalTrim(o.message);
  const source = optionalTrim(o.source);

  if (message && message.length > 4000) {
    throw new ContactValidationError("Message is too long.");
  }

  return {
    intent,
    name,
    email,
    business,
    phone,
    staffCount,
    hasZkteco,
    message,
    source,
  };
}

export class ContactValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ContactValidationError";
  }
}

export async function persistMarketingInquiry(payload: MarketingContactPayload) {
  return prisma.marketingInquiry.create({
    data: {
      intent: payload.intent ?? "early_access",
      name: payload.name,
      email: payload.email,
      business: payload.business ?? null,
      phone: payload.phone ?? null,
      staffCount: payload.staffCount ?? null,
      hasZkteco: payload.hasZkteco ?? null,
      message: payload.message ?? null,
      source: payload.source ?? null,
    },
    select: { id: true, createdAt: true },
  });
}

/** Optional Resend notification when RESEND_API_KEY + MARKETING_CONTACT_TO are set. */
export async function notifyMarketingInquiry(
  payload: MarketingContactPayload,
  inquiryId: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to = process.env.MARKETING_CONTACT_TO?.trim();
  if (!apiKey || !to) return;

  const from =
    process.env.MARKETING_CONTACT_FROM?.trim() || "Simple Roster Plus <onboarding@resend.dev>";

  const lines = [
    `New marketing inquiry (${payload.intent ?? "early_access"})`,
    `ID: ${inquiryId}`,
    "",
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    payload.business ? `Business: ${payload.business}` : null,
    payload.phone ? `Phone: ${payload.phone}` : null,
    payload.staffCount ? `Staff count: ${payload.staffCount}` : null,
    payload.hasZkteco ? `ZKTeco: ${payload.hasZkteco}` : null,
    payload.source ? `Source: ${payload.source}` : null,
    "",
    payload.message ? `Message:\n${payload.message}` : "(no message)",
  ].filter(Boolean);

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: payload.email,
      subject: `[SRP] ${payload.intent === "contact" ? "Contact" : "Early access"} — ${payload.name}`,
      text: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[marketing:contact] Resend failed", res.status, detail);
  }
}

export function marketingAllowedOrigins(): string[] {
  const raw = process.env.MARKETING_ALLOWED_ORIGINS?.trim();
  if (raw) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const site = process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.APP_URL?.trim();
  const defaults = ["https://simplerosterplus.vercel.app", "http://127.0.0.1:5500", "http://localhost:5500"];
  if (site) defaults.unshift(site.replace(/\/$/, ""));
  return [...new Set(defaults)];
}

function trimString(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s || undefined;
}

function optionalTrim(v: unknown): string | null {
  const s = trimString(v);
  return s ?? null;
}

function normalizeIntent(v: string | undefined): string {
  if (!v) return "early_access";
  const lower = v.toLowerCase();
  if (lower === "contact" || lower === "question") return lower;
  return "early_access";
}

function normalizeZkteco(v: string | null): string | null {
  if (!v) return null;
  const lower = v.toLowerCase();
  if (lower === "yes" || lower === "no" || lower === "unknown") return lower;
  return null;
}
