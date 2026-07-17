import { recommendFollowUpTemplate } from "@/lib/onboarding-funnel/eligibility";

export const ONBOARDING_FOLLOW_UP_TEMPLATE_KEYS = [
  "account_workspace_incomplete",
  "workspace_no_employees",
  "employees_no_roster",
  "roster_not_published",
  "general_stalled",
] as const;

export type OnboardingFollowUpTemplateKey =
  (typeof ONBOARDING_FOLLOW_UP_TEMPLATE_KEYS)[number];

export type OnboardingFollowUpTemplateInput = {
  templateKey: OnboardingFollowUpTemplateKey;
  firstName?: string | null;
  businessName?: string | null;
  currentStage: string;
  continueSetupUrl: string;
  supportEmail?: string | null;
};

export type RenderedOnboardingFollowUp = {
  templateKey: OnboardingFollowUpTemplateKey;
  subject: string;
  text: string;
  html: string;
};

export function isOnboardingFollowUpTemplateKey(
  value: string,
): value is OnboardingFollowUpTemplateKey {
  return (ONBOARDING_FOLLOW_UP_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export function recommendedOnboardingFollowUpTemplate(
  highestStageReached: string,
): OnboardingFollowUpTemplateKey {
  const recommended = recommendFollowUpTemplate(highestStageReached);
  return isOnboardingFollowUpTemplateKey(recommended)
    ? recommended
    : "general_stalled";
}

function greeting(firstName?: string | null): string {
  const value = firstName?.trim();
  return value ? `Hi ${value},` : "Hi there,";
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function templateCopy(input: OnboardingFollowUpTemplateInput): {
  subject: string;
  paragraphs: string[];
  buttonLabel: string;
} {
  const business = input.businessName?.trim() || "your business";

  switch (input.templateKey) {
    case "account_workspace_incomplete":
      return {
        subject: "Finish setting up Simple Roster Plus",
        paragraphs: [
          `Your Simple Roster Plus account is ready, but the workspace for ${business} still needs a few details.`,
          "Continue setup when it suits you. If something got in the way, reply and we’ll help.",
        ],
        buttonLabel: "Continue setup",
      };
    case "workspace_no_employees":
      return {
        subject: "Add your team to Simple Roster Plus",
        paragraphs: [
          `Your workspace for ${business} is ready. The next step is adding employees so you can build a weekly roster.`,
          "Add your team now, or reply if you ran into a problem.",
        ],
        buttonLabel: "Add employees",
      };
    case "employees_no_roster":
      return {
        subject: "Create your first staff roster",
        paragraphs: [
          `Your team is set up for ${business}. You can now build the next weekly roster in minutes.`,
          "Start with the shifts you already know, then adjust the remaining gaps.",
        ],
        buttonLabel: "Create your roster",
      };
    case "roster_not_published":
      return {
        subject: "Your roster is almost ready",
        paragraphs: [
          `Your first roster for ${business} has been created but has not been published yet.`,
          "Review it and publish when it is ready for your team.",
        ],
        buttonLabel: "Review your roster",
      };
    case "general_stalled":
      return {
        subject: "Need help setting up Simple Roster Plus?",
        paragraphs: [
          `We wanted to check whether you need help finishing setup for ${business}.`,
          "If you encountered a problem, reply to this email and we’ll help you get moving.",
        ],
        buttonLabel: "Continue setup",
      };
  }
}

export function renderOnboardingFollowUp(
  input: OnboardingFollowUpTemplateInput,
): RenderedOnboardingFollowUp {
  const copy = templateCopy(input);
  const support =
    input.supportEmail?.trim() ||
    process.env.SUPPORT_EMAIL?.trim() ||
    "hello@simplerosterplus.com";
  const intro = greeting(input.firstName);

  const text = [
    intro,
    "",
    ...copy.paragraphs.flatMap((paragraph) => [paragraph, ""]),
    `${copy.buttonLabel}: ${input.continueSetupUrl}`,
    "",
    `Questions? Reply to this email or contact ${support}.`,
    "",
    "— The Simple Roster Plus team",
  ].join("\n");

  const safeUrl = escapeHtml(input.continueSetupUrl);
  const safeSupport = escapeHtml(support);
  const html = [
    '<div style="background:#fafafa;padding:32px 16px;font-family:Arial,sans-serif;color:#27272a">',
    '<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px">',
    '<div style="font-size:18px;font-weight:700;color:#047857;margin-bottom:24px">Simple Roster Plus</div>',
    `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`,
    ...copy.paragraphs.map(
      (paragraph) =>
        `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(paragraph)}</p>`,
    ),
    `<p style="margin:24px 0"><a href="${safeUrl}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;font-weight:600;padding:12px 18px;border-radius:8px">${escapeHtml(copy.buttonLabel)}</a></p>`,
    `<p style="margin:24px 0 0;color:#71717a;font-size:13px;line-height:1.5">Questions? Reply to this email or contact <a href="mailto:${safeSupport}" style="color:#047857">${safeSupport}</a>.</p>`,
    '<p style="margin:16px 0 0;color:#71717a;font-size:13px">— The Simple Roster Plus team</p>',
    "</div></div>",
  ].join("");

  return {
    templateKey: input.templateKey,
    subject: copy.subject,
    text,
    html,
  };
}
