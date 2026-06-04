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
    <div className="roster-share-page min-h-full bg-zinc-50 px-4 py-8">
      <style>{`
        @page {
          size: landscape;
          margin: 0.35in;
        }
        @media print {
          .no-print { display: none !important; }
          html, body {
            background: white !important;
            height: auto !important;
          }
          .roster-share-page {
            padding: 0 !important;
            min-height: 0 !important;
          }
          .roster-share-page-inner {
            max-width: none !important;
            margin: 0 !important;
          }
          .roster-share-table-wrap {
            overflow: visible !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }
          .roster-share-table {
            min-width: 0 !important;
            width: 100% !important;
            table-layout: fixed !important;
            font-size: 9px !important;
          }
          .roster-share-table th,
          .roster-share-table td {
            min-width: 0 !important;
          }
          .roster-share-cell {
            height: auto !important;
            min-height: 2.25rem !important;
            padding: 2px 1px !important;
            border-radius: 2px !important;
            box-shadow: none !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
      <div className="roster-share-page-inner mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Shared roster
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
