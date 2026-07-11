import type { AppUserRole } from "@prisma/client";
import { getSession, type SessionPayload } from "@/lib/session";
import { clerkConfigured } from "@/lib/clerk/config";
import { prisma } from "@/lib/prisma";

export type AuthContext = {
  appUserId: string;
  organizationId: string;
  email: string;
  clerkUserId: string | null;
  orgRole: AppUserRole | null;
  readOnly: boolean;
  onboardingSimulate: boolean;
  impersonatedBy: string | null;
  orgName: string | null;
};

function fromSession(session: SessionPayload): AuthContext {
  return {
    appUserId: session.sub,
    organizationId: session.orgId,
    email: session.email,
    clerkUserId: null,
    orgRole: null,
    readOnly: session.readOnly === true,
    onboardingSimulate: session.onboardingSimulate === true,
    impersonatedBy: session.impersonatedBy ?? null,
    orgName: session.orgName ?? null,
  };
}

/** Unified tenant auth: impersonation JWT, Clerk session, or legacy password JWT. */
export async function getAuthContext(): Promise<AuthContext | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.readOnly || session.onboardingSimulate || !clerkConfigured()) {
    return fromSession(session);
  }

  const appUser = await prisma.appUser.findUnique({
    where: { id: session.sub },
    select: { clerkUserId: true, role: true },
  });

  return {
    appUserId: session.sub,
    organizationId: session.orgId,
    email: session.email,
    clerkUserId: appUser?.clerkUserId ?? null,
    orgRole: appUser?.role ?? null,
    readOnly: false,
    onboardingSimulate: false,
    impersonatedBy: null,
    orgName: null,
  };
}
