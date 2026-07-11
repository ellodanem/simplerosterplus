import { sendResendEmail } from "@/lib/email/send";
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

/**
 * Notify operators when new feedback arrives.
 * Requires RESEND_API_KEY. Recipients: FEEDBACK_CONTACT_TO → MARKETING_CONTACT_TO →
 * active OperatorUser emails (so the console operators get mail without extra env).
 */
export async function notifyTesterFeedback(
  payload: FeedbackPayload,
  ctx: { organizationId: string; orgName: string; userEmail: string },
  feedbackId: string,
): Promise<void> {
  const to = await resolveFeedbackNotifyRecipients();
  if (to.length === 0) return;

  const from =
    process.env.FEEDBACK_CONTACT_FROM?.trim() ||
    process.env.MARKETING_CONTACT_FROM?.trim() ||
    undefined;

  const categoryLabel =
    payload.category === "bug" ? "Bug report" : payload.category === "idea" ? "Idea" : "Question";

  const base =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "").replace(/\/$/, "")}`
      : "");
  const triageUrl = base ? `${base.replace(/\/$/, "")}/ops/feedback` : "/ops/feedback";

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
    `Triage: ${triageUrl}`,
  ].filter(Boolean);

  const ok = await sendResendEmail({
    from,
    to,
    replyTo: ctx.userEmail,
    subject: `[SRP Feedback] ${categoryLabel} — ${ctx.orgName}`,
    text: lines.join("\n"),
  });

  if (!ok) {
    console.error("[feedback:notify] email skipped or failed (check RESEND_API_KEY and recipients)");
  }
}

async function resolveFeedbackNotifyRecipients(): Promise<string[]> {
  const configured =
    process.env.FEEDBACK_CONTACT_TO?.trim() || process.env.MARKETING_CONTACT_TO?.trim();
  if (configured) {
    return configured
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
