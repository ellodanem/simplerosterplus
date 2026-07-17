/**
 * Apply abandonment marks for progress rows that match the rules.
 * Does not send email. Safe to call from a future cron.
 */
import { prisma } from "@/lib/prisma";
import {
  evaluateAbandonment,
  getAbandonmentRulesFromEnv,
} from "@/lib/onboarding-funnel/abandonment";

export async function detectAndMarkAbandoned(opts?: {
  limit?: number;
  now?: Date;
}): Promise<{ scanned: number; marked: number }> {
  const now = opts?.now ?? new Date();
  const limit = opts?.limit ?? 200;
  const rules = getAbandonmentRulesFromEnv();

  const rows = await prisma.onboardingProgress.findMany({
    where: {
      activatedAt: null,
      abandonedAt: null,
      needsSupport: false,
      doNotContact: false,
    },
    take: limit,
    orderBy: { lastActivityAt: "asc" },
  });

  let marked = 0;
  for (const row of rows) {
    const verdict = evaluateAbandonment(
      {
        highestStageReached: row.highestStageReached,
        currentStage: row.currentStage,
        signupStartedAt: row.signupStartedAt,
        lastActivityAt: row.lastActivityAt,
        activatedAt: row.activatedAt,
        completedAt: row.completedAt,
        needsSupport: row.needsSupport,
        doNotContact: row.doNotContact,
      },
      now,
      rules,
    );
    if (!verdict.abandoned) continue;
    await prisma.onboardingProgress.update({
      where: { id: row.id },
      data: {
        abandonedAt: now,
        abandonmentReason: verdict.reason,
        followUpStatus:
          row.followUpStatus === "none" || row.followUpStatus === "recommended"
            ? "recommended"
            : row.followUpStatus,
      },
    });
    marked += 1;
  }

  return { scanned: rows.length, marked };
}
