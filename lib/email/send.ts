export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Override RESEND / marketing from addresses. */
  from?: string;
};

export type ResendEmailResult =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; reason: "not_configured" | "provider_error"; detail?: string };

/** Send via Resend and return the provider id needed for durable delivery records. */
export async function sendResendEmailDetailed(
  input: ResendEmailInput,
): Promise<ResendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return { ok: false, reason: "not_configured" };

  const from =
    input.from?.trim() ||
    process.env.WELCOME_EMAIL_FROM?.trim() ||
    process.env.MARKETING_CONTACT_FROM?.trim() ||
    "Simple Roster Plus <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: Array.isArray(input.to) ? input.to : [input.to],
      reply_to: input.replyTo,
      subject: input.subject,
      text: input.text,
      html: input.html,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error("[email:resend] send failed", res.status, detail);
    return {
      ok: false,
      reason: "provider_error",
      detail: detail.slice(0, 500) || `Resend returned HTTP ${res.status}`,
    };
  }

  const body = (await res.json().catch(() => null)) as { id?: unknown } | null;
  return {
    ok: true,
    providerMessageId: typeof body?.id === "string" ? body.id : null,
  };
}

/** Backward-compatible boolean helper used by existing notification callers. */
export async function sendResendEmail(input: ResendEmailInput): Promise<boolean> {
  const result = await sendResendEmailDetailed(input);
  return result.ok;
}
