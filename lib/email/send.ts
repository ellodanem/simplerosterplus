export type ResendEmailInput = {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  /** Override RESEND / marketing from addresses. */
  from?: string;
};

/** Send via Resend when RESEND_API_KEY is set. Returns false when skipped or failed. */
export async function sendResendEmail(input: ResendEmailInput): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return false;

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
    return false;
  }

  return true;
}
