import { notFound } from "next/navigation";
import { RosterShareTable } from "@/app/components/roster-share-table";
import { formatYmdInZone } from "@/lib/datetime-policy";
import { getRosterShareViewByToken } from "@/lib/roster-share-data";
import { dayHeaderLabel } from "@/lib/roster-week";
import { ShareToolbar } from "./share-toolbar";

export const metadata = {
  title: "Shared roster | Simple Roster Plus",
  robots: { index: false, follow: false },
};

type PageProps = { params: Promise<{ token: string }> };

export default async function SharedRosterPage({ params }: PageProps) {
  const { token } = await params;
  const data = await getRosterShareViewByToken(token);
  if (!data) notFound();

  const todayYmd = formatYmdInZone(new Date(), data.timeZone);
  const weekStartLabel = dayHeaderLabel(data.weekStartYmd, data.timeZone);
  const weekEndLabel = dayHeaderLabel(data.weekEndYmd, data.timeZone);

  return (
    <div className="min-h-full bg-zinc-50 px-4 py-8">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Published roster
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-900">
            {data.orgName}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            {data.locationName} · Week of {weekStartLabel.weekday} {weekStartLabel.date} –{" "}
            {weekEndLabel.weekday} {weekEndLabel.date} ·{" "}
            <span className="font-mono">{data.timeZone}</span>
          </p>
        </header>

        <ShareToolbar />
        <RosterShareTable data={data} todayYmd={todayYmd} />

        <p className="no-print mt-6 text-center text-xs text-zinc-400">
          Powered by Simple Roster Plus · read-only link
        </p>
      </div>
    </div>
  );
}
