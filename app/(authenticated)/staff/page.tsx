import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { StaffList, type StaffRow } from "@/app/components/staff-list";
import { getStaffDeleteEligibilityMap } from "@/lib/staff-archive";
import { ymdFromDate } from "@/lib/staff-input";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";

export const metadata = {
  title: "Staff | Simple Roster Plus",
};

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirectToSignIn();

  await redirectToSetupIfIncomplete({ organizationId: session.orgId, nextPath: "/staff" });

  const [staff, locations, roles, departments] = await Promise.all([
    prisma.staff.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
      include: {
        location: { select: { id: true, name: true } },
        staffRole: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    }),
    prisma.location.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ isDefault: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.staffRole.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.department.findMany({
      where: { organizationId: session.orgId },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
  ]);

  const deleteChecks = await getStaffDeleteEligibilityMap(
    staff.map((s) => ({ id: s.id, isTestUser: s.isTestUser })),
  );

  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email ?? "",
    role: s.staffRole?.name ?? s.role ?? "",
    roleId: s.roleId ?? null,
    departmentId: s.departmentId ?? null,
    departmentName: s.department?.name ?? null,
    locationId: s.locationId,
    locationName: s.location?.name ?? "",
    deviceUserId: s.deviceUserId ?? "",
    contactNumber: s.contactNumber ?? "",
    whatsappOptIn: s.whatsappOptIn,
    dateOfBirth: ymdFromDate(s.dateOfBirth),
    startDate: ymdFromDate(s.startDate),
    punchExempt: s.punchExempt,
    excludeFromRoster: s.excludeFromRoster,
    archivedAt: s.archivedAt ? s.archivedAt.toISOString() : null,
    isTestUser: s.isTestUser,
    sortOrder: s.sortOrder,
    canDelete: deleteChecks.get(s.id)?.allowed ?? false,
  }));

  return (
    <StaffList staff={rows} locations={locations} roles={roles} departments={departments} />
  );
}
