import { prisma } from "@/lib/prisma";

export type FeedbackCategory = "bug" | "question" | "idea";

export type FeedbackPayload = {
  category: FeedbackCategory;
  message: string;
  pageUrl?: string | null;
};

const MESSAGE_MAX = 4000;

export class FeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackValidationError";
  }
}

export function parseFeedbackBody(body: unknown): FeedbackPayload {
  if (!body || typeof body !== "object") {
    throw new FeedbackValidationError("Invalid JSON body");
  }
  const o = body as Record<string, unknown>;

  const category = normalizeCategory(trimString(o.category));
  const message = trimString(o.message) ?? "";
  const pageUrl = optionalTrim(o.pageUrl);

  if (!message || message.length < 5) {
    throw new FeedbackValidationError("Please describe your feedback in a few words.");
  }
  if (message.length > MESSAGE_MAX) {
    throw new FeedbackValidationError("Message is too long.");
  }

  return { category, message, pageUrl };
}

export async function persistTesterFeedback(
  payload: FeedbackPayload,
  ctx: { organizationId: string; orgName: string; userEmail: string },
) {
  return prisma.testerFeedback.create({
    data: {
      organizationId: ctx.organizationId,
      orgName: ctx.orgName,
      userEmail: ctx.userEmail,
      category: payload.category,
      message: payload.message,
      pageUrl: payload.pageUrl ?? null,
    },
    select: { id: true, createdAt: true },
  });
}

/** Optional Resend notification when RESEND_API_KEY + FEEDBACK_CONTACT_TO (or MARKETING_CONTACT_TO) are set. */
export async function notifyTesterFeedback(
  payload: FeedbackPayload,
  ctx: { organizationId: string; orgName: string; userEmail: string },
  feedbackId: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const to =
    process.env.FEEDBACK_CONTACT_TO?.trim() || process.env.MARKETING_CONTACT_TO?.trim();
  if (!apiKey || !to) return;

  const from =
    process.env.FEEDBACK_CONTACT_FROM?.trim() ||
    process.env.MARKETING_CONTACT_FROM?.trim() ||
    "Simple Roster Plus <onboarding@resend.dev>";

  const categoryLabel =
    payload.category === "bug" ? "Bug report" : payload.category === "idea" ? "Idea" : "Question";

  const lines = [
    `New tester feedback (${categoryLabel})`,
    `ID: ${feedbackId}`,
    "",
    `Organization: ${ctx.orgName} (${ctx.organizationId})`,
    `From: ${ctx.userEmail}`,
    payload.pageUrl ? `Page: ${payload.pageUrl}` : null,
    "",
    payload.message,
    "",
    `Triage: operator console → Feedback (/ops/feedback)`,
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
      reply_to: ctx.userEmail,
      subject: `[SRP Feedback] ${categoryLabel} — ${ctx.orgName}`,
      text: lines.join("\n"),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[feedback:notify] Resend failed", res.status, detail);
  }
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

function normalizeCategory(v: string | undefined): FeedbackCategory {
  if (v === "bug" || v === "idea" || v === "question") return v;
  return "question";
}
