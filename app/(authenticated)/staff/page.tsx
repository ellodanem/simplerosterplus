import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import { AddStaffForm } from "@/app/components/add-staff-form";
import { StaffList, type StaffRow } from "@/app/components/staff-list";
import { ymdFromDate } from "@/lib/staff-input";

export const metadata = {
  title: "Staff | Simple Roster Plus",
};

export default async function StaffPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const staff = await prisma.staff.findMany({
    where: { organizationId: session.orgId },
    orderBy: [{ sortOrder: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
  });

  const rows: StaffRow[] = staff.map((s) => ({
    id: s.id,
    firstName: s.firstName,
    lastName: s.lastName,
    email: s.email ?? "",
    role: s.role ?? "",
    deviceUserId: s.deviceUserId ?? "",
    contactNumber: s.contactNumber ?? "",
    dateOfBirth: ymdFromDate(s.dateOfBirth),
    startDate: ymdFromDate(s.startDate),
    punchExempt: s.punchExempt,
    sortOrder: s.sortOrder,
  }));

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Staff</h1>
      <p className="mt-1 text-sm text-zinc-600">
        People in your organization. Roster and attendance will reference this list.
      </p>

      <StaffList staff={rows} />

      <AddStaffForm />
    </div>
  );
}
