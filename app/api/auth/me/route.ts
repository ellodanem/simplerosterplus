import { NextResponse } from "next/server";
import { getSession, isOnboardingSimulateSession, isReadOnlySession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({
    user: {
      id: session.sub,
      email: session.email,
      organizationId: session.orgId,
      readOnly: isReadOnlySession(session),
      onboardingSimulate: isOnboardingSimulateSession(session),
      orgName: session.orgName ?? null,
    },
  });
}
