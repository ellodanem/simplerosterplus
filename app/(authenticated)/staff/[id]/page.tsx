import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { ymdFromDate } from "@/lib/staff-input";
import { StaffEditForm, type StaffEditValues } from "@/app/components/staff-edit-form";

export const metadata = {
  title: "Edit staff | Simple Roster Plus",
};

type Params = Promise<{ id: string }>;

export default async function EditStaffPage({ params }: { params: Params }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { id } = await params;
  const staff = await prisma.staff.findFirst({
    where: { id, organizationId: session.orgId },
  });
  if (!staff) notFound();

  const initial: StaffEditValues = {
    id: staff.id,
    firstName: staff.firstName,
    lastName: staff.lastName,
    email: staff.email ?? "",
    role: staff.role ?? "",
    deviceUserId: staff.deviceUserId ?? "",
    contactNumber: staff.contactNumber ?? "",
    dateOfBirth: ymdFromDate(staff.dateOfBirth),
    startDate: ymdFromDate(staff.startDate),
    punchExempt: staff.punchExempt,
    sortOrder: staff.sortOrder,
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            <Link href="/staff" className="hover:underline">
              ← Staff
            </Link>
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {staff.firstName} {staff.lastName}
          </h1>
        </div>
      </div>

      <StaffEditForm initial={initial} />
    </div>
  );
}
