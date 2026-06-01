import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getOrgLocations, resolveLocation } from "@/lib/location";
import { formatYmdInZone, shiftYmdLocal } from "@/lib/datetime-policy";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import { PayPeriodWorkspace } from "./pay-period-workspace";

export const metadata = {
  title: "Extract Pay Period | Simple Roster Plus",
};

type SearchParams = { location?: string };

export default async function PayPeriodPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  await redirectToSetupIfIncomplete({
    organizationId: session.orgId,
    nextPath: "/attendance/pay-period",
  });

  const org = await prisma.organization.findUnique({
    where: { id: session.orgId },
    select: { id: true, name: true, timeZone: true },
  });
  if (!org) redirect("/login");

  const params = await searchParams;
  const location = await resolveLocation(org.id, params.location);
  const timeZone = location.timeZone ?? org.timeZone;
  const locations = await getOrgLocations(org.id);
  const todayYmd = formatYmdInZone(new Date(), timeZone);
  const defaultEndYmd = todayYmd;
  const defaultStartYmd = shiftYmdLocal(todayYmd, -13);

  return (
    <div>
      <div className="mb-4">
        <Link
          href={`/attendance?location=${encodeURIComponent(location.id)}`}
          className="text-sm font-medium text-emerald-800 hover:text-emerald-950"
        >
          ← Attendance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">
          Extract Pay Period
        </h1>
        <p className="mt-0.5 text-sm text-zinc-600">
          {org.name} · {location.name} ·{" "}
          <span className="font-mono">{timeZone}</span>
        </p>
      </div>

      <PayPeriodWorkspace
        organizationName={org.name}
        locationId={location.id}
        locations={locations}
        defaultStartYmd={defaultStartYmd}
        defaultEndYmd={defaultEndYmd}
      />
    </div>
  );
}
