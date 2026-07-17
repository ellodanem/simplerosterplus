import { getPublicAppUrlFromEnv } from "@/lib/public-url";
import { resolveOperatorNotifyRecipients } from "@/lib/email/notify-recipients";
import { sendResendEmail } from "@/lib/email/send";

export type SignupNotifyInput = {
  organizationId: string;
  orgName: string;
  email: string;
  firstName?: string | null;
  plan?: string | null;
};

/**
 * Notify operators when a new org owner signs up.
 * Requires RESEND_API_KEY. Recipients: SIGNUP_NOTIFY_TO → MARKETING_CONTACT_TO →
 * active OperatorUser emails.
 */
export async function notifyOperatorOfSignup(input: SignupNotifyInput): Promise<void> {
  const to = await resolveOperatorNotifyRecipients(["SIGNUP_NOTIFY_TO"]);
  if (to.length === 0) return;

  const from =
    process.env.SIGNUP_NOTIFY_FROM?.trim() ||
    process.env.MARKETING_CONTACT_FROM?.trim() ||
    undefined;

  const base = (getPublicAppUrlFromEnv() || "https://app.simplerosterplus.com").replace(/\/$/, "");
  const opsUrl = `${base}/ops`;
  const orgName = input.orgName.trim() || "Untitled organization";
  const name = input.firstName?.trim();
  const plan = input.plan?.trim() || "free";

  const lines = [
    "New organization signup",
    "",
    `Organization: ${orgName}`,
    `Org ID: ${input.organizationId}`,
    `Owner: ${name ? `${name} <${input.email}>` : input.email}`,
    `Plan: ${plan}`,
    "",
    `Overview: ${opsUrl}`,
  ];

  const ok = await sendResendEmail({
    from,
    to,
    replyTo: input.email,
    subject: `[SRP Signup] ${orgName}`,
    text: lines.join("\n"),
  });

  if (!ok) {
    console.error("[signup:notify] email skipped or failed (check RESEND_API_KEY and recipients)");
  }
}
