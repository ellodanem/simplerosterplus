import type { AppUserRole } from "@prisma/client";
import { getPublicAppUrlFromEnv } from "@/lib/public-url";
import { sendResendEmail } from "@/lib/email/send";

export type WelcomeEmailInput = {
  email: string;
  firstName?: string | null;
  orgName: string;
  role: AppUserRole;
  /** Canonical app base URL (no trailing slash). Falls back to env when omitted. */
  appUrl?: string;
};

function greetingName(firstName?: string | null): string {
  const name = firstName?.trim();
  return name || "there";
}

function supportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL?.trim() ||
    process.env.MARKETING_CONTACT_TO?.trim() ||
    "hello@simplerosterplus.com"
  );
}

function buildOwnerWelcomeText(input: WelcomeEmailInput, base: string): { subject: string; text: string } {
  const orgName = input.orgName.trim() || "your organization";
  const setupUrl = `${base}/setup`;
  const rosterUrl = `${base}/roster`;
  const devicesUrl = `${base}/devices`;
  const support = supportEmail();

  const subject = "Welcome to Simple Roster Plus";
  const text = [
    `Hi ${greetingName(input.firstName)},`,
    "",
    `Thanks for creating your Simple Roster Plus account for ${orgName}.`,
    "",
    "Simple Roster Plus helps you build weekly rosters, track attendance, and connect ZKTeco time clocks — all in one place.",
    "",
    "Here are a few good first steps:",
    "",
    `1. Finish setup (timezone, shifts, and staff): ${setupUrl}`,
    `2. Build your first roster: ${rosterUrl}`,
    `3. Connect a time clock when you're ready (optional): ${devicesUrl}`,
    "",
    `Questions? Reply to this email or write us at ${support}.`,
    "",
    "— The Simple Roster Plus team",
  ].join("\n");

  return { subject, text };
}

function buildMemberWelcomeText(input: WelcomeEmailInput, base: string): { subject: string; text: string } {
  const orgName = input.orgName.trim() || "your team";
  const signInUrl = `${base}/sign-in`;
  const support = supportEmail();

  const subject = `You've joined ${orgName} on Simple Roster Plus`;
  const text = [
    `Hi ${greetingName(input.firstName)},`,
    "",
    `You've been added to ${orgName} on Simple Roster Plus.`,
    "",
    "Sign in to view rosters, attendance, and schedule requests:",
    "",
    signInUrl,
    "",
    "If you weren't expecting this invitation, you can ignore this email.",
    "",
    `Need help? Contact us at ${support}.`,
    "",
    "— The Simple Roster Plus team",
  ].join("\n");

  return { subject, text };
}

/** Optional welcome email when RESEND_API_KEY is configured. No-op when unset. */
export async function sendWelcomeEmail(input: WelcomeEmailInput): Promise<void> {
  const base = (input.appUrl || getPublicAppUrlFromEnv() || "https://app.simplerosterplus.com").replace(
    /\/$/,
    "",
  );

  const { subject, text } =
    input.role === "owner" ? buildOwnerWelcomeText(input, base) : buildMemberWelcomeText(input, base);

  await sendResendEmail({
    to: input.email,
    subject,
    text,
    replyTo: supportEmail(),
  });
}
