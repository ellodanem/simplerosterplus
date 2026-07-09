import { prisma } from "@/lib/prisma";
import { PLAN_FREE, PLAN_PLUS, PLAN_PRO } from "@/lib/plans";

export type CompPlanSlug = typeof PLAN_FREE | typeof PLAN_PLUS | typeof PLAN_PRO;

export type SetCompPlanInput = {
  organizationId: string;
  plan: CompPlanSlug;
  addonWhatsapp?: boolean;
  addonDeviceQty?: number;
  addonAdminQty?: number;
};

export type SetCompPlanResult = {
  before: {
    plan: string | null;
    subscriptionStatus: string | null;
    stripeSubscriptionId: string | null;
    addonWhatsapp: boolean;
    addonDeviceQty: number;
    addonAdminQty: number;
  };
  after: {
    plan: string;
    subscriptionStatus: string | null;
    addonWhatsapp: boolean;
    addonDeviceQty: number;
    addonAdminQty: number;
  };
  stripeLinked: boolean;
};

function parsePlan(raw: unknown): CompPlanSlug | null {
  if (raw === PLAN_FREE || raw === PLAN_PLUS || raw === PLAN_PRO) return raw;
  return null;
}

function parseNonNegativeInt(raw: unknown, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  const n = Math.round(raw as number);
  return n < 0 ? 0 : n;
}

export function parseSetCompPlanBody(body: unknown): SetCompPlanInput | { error: string } {
  if (!body || typeof body !== "object") return { error: "Invalid JSON body" };
  const b = body as Record<string, unknown>;
  const plan = parsePlan(b.plan);
  if (!plan) return { error: "plan must be free, plus, or pro" };

  return {
    organizationId: "",
    plan,
    addonWhatsapp: typeof b.addonWhatsapp === "boolean" ? b.addonWhatsapp : undefined,
    addonDeviceQty:
      b.addonDeviceQty !== undefined ? parseNonNegativeInt(b.addonDeviceQty, 0) : undefined,
    addonAdminQty:
      b.addonAdminQty !== undefined ? parseNonNegativeInt(b.addonAdminQty, 0) : undefined,
  };
}

/** Operator comp: set plan and add-ons without Stripe payment. */
export async function setCompPlanForOrganization(
  input: SetCompPlanInput,
): Promise<SetCompPlanResult | null> {
  const org = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      plan: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      addonWhatsapp: true,
      addonDeviceQty: true,
      addonAdminQty: true,
    },
  });
  if (!org) return null;

  const addonWhatsapp =
    input.addonWhatsapp !== undefined
      ? input.addonWhatsapp
      : input.plan === PLAN_PRO
        ? true
        : org.addonWhatsapp;
  const addonDeviceQty =
    input.addonDeviceQty !== undefined ? input.addonDeviceQty : org.addonDeviceQty;
  const addonAdminQty =
    input.addonAdminQty !== undefined ? input.addonAdminQty : org.addonAdminQty;

  const subscriptionStatus =
    input.plan === PLAN_FREE
      ? org.stripeSubscriptionId
        ? org.subscriptionStatus
        : null
      : org.stripeSubscriptionId
        ? org.subscriptionStatus
        : "active";

  const nextAddonWhatsapp = input.plan === PLAN_PRO ? true : addonWhatsapp;

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: {
      plan: input.plan,
      subscriptionStatus,
      addonWhatsapp: nextAddonWhatsapp,
      addonDeviceQty,
      addonAdminQty,
    },
  });

  return {
    before: {
      plan: org.plan,
      subscriptionStatus: org.subscriptionStatus,
      stripeSubscriptionId: org.stripeSubscriptionId,
      addonWhatsapp: org.addonWhatsapp,
      addonDeviceQty: org.addonDeviceQty,
      addonAdminQty: org.addonAdminQty,
    },
    after: {
      plan: input.plan,
      subscriptionStatus,
      addonWhatsapp: nextAddonWhatsapp,
      addonDeviceQty,
      addonAdminQty,
    },
    stripeLinked: org.stripeSubscriptionId !== null,
  };
}
