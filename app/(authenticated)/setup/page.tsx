import { redirectToSignIn } from "@/lib/auth-redirect";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getSetupCompleteness, getSetupState } from "@/lib/onboarding";
import { SetupWizard } from "./setup-wizard";

export const metadata = {
  title: "Setup | Simple Roster Plus",
};

export default async function SetupPage() {
  const session = await getSession();
  if (!session) redirectToSignIn();

  const state = await getSetupState(session.orgId);
  const completeness = getSetupCompleteness(state);

  const [templates, staffCount, roles, locations] = await Promise.all([
    prisma.shiftTemplate.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        startTime: true,
        endTime: true,
        unpaidBreakMinutes: true,
        color: true,
      },
    }),
    prisma.staff.count({ where: { organizationId: session.orgId } }),
    prisma.staffRole.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, sortOrder: true },
    }),
    prisma.location.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Setup</h1>
        <p className="mt-1 text-sm text-zinc-600">
          A quick setup so roster and attendance behave correctly for your station.
        </p>
      </div>

      <SetupWizard
        initialState={state}
        initialCompleteness={completeness}
        initialTemplates={templates}
        initialRoles={roles.map((r) => ({ ...r, staffCount: 0 }))}
        initialLocations={locations}
        initialStaffCount={staffCount}
      />
    </div>
  );
}
