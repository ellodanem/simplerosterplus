import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { trackOrgMilestone } from "@/lib/onboarding-funnel/track-org";

const ONBOARDING_COMPLETED_AT_KEY = "onboarding_completed_at";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.appSetting.upsert({
    where: {
      organizationId_key: { organizationId: session.orgId, key: ONBOARDING_COMPLETED_AT_KEY },
    },
    create: {
      organizationId: session.orgId,
      key: ONBOARDING_COMPLETED_AT_KEY,
      value: new Date().toISOString(),
    },
    update: { value: new Date().toISOString() },
  });

  trackOrgMilestone({
    stage: "onboarding_completed",
    organizationId: session.orgId,
    userId: session.sub,
    source: "setup_api",
  });

  return NextResponse.json({ ok: true });
}

