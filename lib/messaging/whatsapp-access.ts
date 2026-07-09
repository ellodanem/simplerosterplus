import { resolveBillingTier, type OrgBillingSnapshot } from "@/lib/billing-access";
import {
  PLUS_WHATSAPP_MONTHLY,
  PLUS_WHATSAPP_WARN,
  PRO_WHATSAPP_MONTHLY,
  PRO_WHATSAPP_WARN,
} from "@/lib/plans";
import { messagingMonthKey } from "@/lib/messaging/month-key";

export type OrgWhatsappSnapshot = OrgBillingSnapshot & {
  addonWhatsapp: boolean;
  messagingWhatsappEnabled: boolean;
  whatsappSentMonth: string | null;
  whatsappSentCount: number;
};

export type WhatsappAccess = {
  entitled: boolean;
  enabled: boolean;
  monthlyCap: number | null;
  warnAt: number | null;
  sentThisMonth: number;
  remaining: number | null;
  atCap: boolean;
  nearCap: boolean;
};

export function orgHasWhatsappEntitlement(org: OrgWhatsappSnapshot): boolean {
  const tier = resolveBillingTier(org);
  if (tier === "pro") return true;
  if (tier === "plus") return org.addonWhatsapp;
  return false;
}

export function whatsappMonthlyCap(org: OrgWhatsappSnapshot): number | null {
  const tier = resolveBillingTier(org);
  if (tier === "pro") return PRO_WHATSAPP_MONTHLY;
  if (tier === "plus" && org.addonWhatsapp) return PLUS_WHATSAPP_MONTHLY;
  return null;
}

export function whatsappWarnThreshold(org: OrgWhatsappSnapshot): number | null {
  const tier = resolveBillingTier(org);
  if (tier === "pro") return PRO_WHATSAPP_WARN;
  if (tier === "plus" && org.addonWhatsapp) return PLUS_WHATSAPP_WARN;
  return null;
}

export function effectiveWhatsappSentThisMonth(org: OrgWhatsappSnapshot): number {
  const month = messagingMonthKey();
  if (org.whatsappSentMonth !== month) return 0;
  return org.whatsappSentCount;
}

export function getWhatsappAccess(org: OrgWhatsappSnapshot): WhatsappAccess {
  const entitled = orgHasWhatsappEntitlement(org);
  const cap = whatsappMonthlyCap(org);
  const sentThisMonth = effectiveWhatsappSentThisMonth(org);
  const remaining = cap !== null ? Math.max(0, cap - sentThisMonth) : null;
  const warnAt = whatsappWarnThreshold(org);

  return {
    entitled,
    enabled: entitled && org.messagingWhatsappEnabled,
    monthlyCap: cap,
    warnAt,
    sentThisMonth,
    remaining,
    atCap: cap !== null && sentThisMonth >= cap,
    nearCap: warnAt !== null && sentThisMonth >= warnAt,
  };
}
