import Link from "next/link";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirectToSignIn } from "@/lib/auth-redirect";
import {
  getHomeWeekSummary,
  HOME_PREVIEW_STAFF_LIMIT,
  homeGreetingName,
} from "@/lib/home-week-summary";
import { resolvePublicAppUrlForOrg } from "@/lib/public-url";
import { rosterShareUrl } from "@/lib/roster-share";
import { getSession } from "@/lib/session";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";
import { RosterShareTable } from "@/app/components/roster-share-table";
import type { RosterShareViewData } from "@/lib/roster-share-data";
import { HomeTodayShiftCard } from "./home-today-shift-card";

export const metadata = {
  title: "Home | Simple Roster Plus",
};

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export default async function HomePage() {
  const session = await getSession();
  if (!session) redirectToSignIn();

  await redirectToSetupIfIncomplete({ organizationId: session.orgId, nextPath: "/" });

  const summary = await getHomeWeekSummary(session.orgId);
  const name = homeGreetingName(session.email);
  const headersList = await headers();
  const { url: publicBase } = await resolvePublicAppUrlForOrg(session.orgId, {
    headers: headersList,
  });
  const rosterShareFullUrl =
    summary.rosterShareToken && publicBase
      ? rosterShareUrl(publicBase, summary.rosterShareToken)
      : null;
  const rosterHref = `/roster?week=${encodeURIComponent(summary.weekStartYmd)}`;
  const attendanceHref = `/attendance?view=week&week=${encodeURIComponent(summary.weekStartYmd)}`;
  const requestsHref =
    summary.pendingRequestsCount > 0
      ? `${rosterHref}&requests=open`
      : rosterHref;

  const hasLate = summary.lateCount > 0;
  const hasAbsences = summary.absentCount > 0;
  const hasOpenShifts = summary.openShiftCount > 0;
  const hasPendingRequests = summary.pendingRequestsCount > 0;
  const hasAttendanceIssues = hasLate || hasAbsences;
  const hasEmptyWeek =
    summary.rosterPreview != null &&
    Object.keys(summary.rosterPreview.entries).length === 0;
  const canAutoSchedule = hasOpenShifts || hasEmptyWeek || summary.rosterStatus === null;
  const autoSchedulerHref = hasEmptyWeek && !hasOpenShifts
    ? `${rosterHref}&autoScheduler=copy`
    : `${rosterHref}&autoScheduler=fill`;
  const hasExceptions = hasAttendanceIssues || hasOpenShifts;
  const exceptionsHref = hasAttendanceIssues ? attendanceHref : rosterHref;

  const rosterStatusBadge =
    summary.rosterStatus === "published"
      ? { label: "Live", className: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-500" }
      : summary.rosterStatus === "draft"
        ? { label: "Draft", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" }
        : { label: "Not started", className: "bg-zinc-100 text-zinc-600", dot: "bg-zinc-400" };

  const intro =
    summary.rosterStatus === null
      ? "Start your first week roster, then publish and share it with staff."
      : hasExceptions || summary.pendingRequestsCount > 0
        ? "Here’s what needs attention before the week runs."
        : "All clear so far. Publish when you’re ready to share the roster.";

  const previewTableData: RosterShareViewData | null = summary.rosterPreview
    ? {
        orgName: summary.orgName,
        locationName: summary.locationName,
        timeZone: summary.timeZone,
        weekStartYmd: summary.weekStartYmd,
        weekEndYmd: summary.weekEndYmd,
        days: summary.rosterPreview.days,
        staff: summary.rosterPreview.staff,
        templates: summary.rosterPreview.templates,
        entries: summary.rosterPreview.entries,
        holidays: summary.rosterPreview.holidays,
        blockMap: summary.rosterPreview.blockMap,
      }
    : null;

  const hiddenStaffCount =
    summary.rosterPreview && summary.rosterPreview.totalStaffCount > HOME_PREVIEW_STAFF_LIMIT
      ? summary.rosterPreview.totalStaffCount - HOME_PREVIEW_STAFF_LIMIT
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {timeGreeting()}, {name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Week of {summary.weekRangeLabel} ·{" "}
            <span className="font-mono text-zinc-700">{summary.timeZone}</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">{intro}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rosterShareFullUrl ? (
            <a
              href={rosterShareFullUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              Share link
            </a>
          ) : null}
          {summary.pendingRequestsCount > 0 ? (
            <Link
              href={requestsHref}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-800 hover:bg-rose-100"
            >
              Requests
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-rose-600 px-1.5 text-[10px] font-bold text-white">
                {summary.pendingRequestsCount}
              </span>
            </Link>
          ) : null}
          <Link
            href={rosterHref}
            className="inline-flex rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
          >
            {summary.rosterStatus === null ? "Start roster" : "Open roster"}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(17rem,20rem)_1fr]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <span
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"
                aria-hidden="true"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                  <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
                </svg>
              </span>
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-zinc-900">Auto scheduler</h2>
                <p className="mt-1 text-xs leading-snug text-zinc-500">
                  Start from last week or fill open slots using recent shift patterns.
                </p>
              </div>
            </div>
            {canAutoSchedule ? (
              <Link
                href={autoSchedulerHref}
                className="mt-4 block w-full rounded-lg bg-emerald-700 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-emerald-800"
              >
                Open auto scheduler
              </Link>
            ) : (
              <button
                type="button"
                disabled
                title="No open slots this week"
                className="mt-4 w-full rounded-lg bg-zinc-100 px-3 py-2 text-sm font-semibold text-zinc-400"
              >
                Week fully assigned
              </button>
            )}
          </section>

          <section
            className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            aria-labelledby="glance-heading"
          >
            <h2 id="glance-heading" className="text-sm font-semibold text-zinc-900">
              This week at a glance
            </h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Exceptions from roster and attendance—not payroll or policy.
            </p>

            {!hasExceptions && summary.coverageRangeLabel ? (
              <p className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                No exceptions so far. Coverage looks good ({summary.coverageRangeLabel}).
              </p>
            ) : null}

            <ul className="mt-3 divide-y divide-zinc-100">
              <ExceptionRow
                tone="rose"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                }
                title={
                  summary.lateCount === 1
                    ? "1 late arrival"
                    : `${summary.lateCount} late arrivals`
                }
                muted={!hasLate}
                href={hasLate ? attendanceHref : undefined}
              />
              <ExceptionRow
                tone="amber"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                }
                title={
                  summary.openShiftCount === 1
                    ? "1 open slot from today on"
                    : `${summary.openShiftCount} open slots from today on`
                }
                muted={!hasOpenShifts}
                href={hasOpenShifts ? rosterHref : undefined}
              />
              <ExceptionRow
                tone={hasAbsences ? "sky" : "emerald"}
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                }
                title={
                  hasAbsences
                    ? summary.absentCount === 1
                      ? "1 absence to review"
                      : `${summary.absentCount} absences to review`
                    : summary.coverageRangeLabel
                      ? `Coverage OK ${summary.coverageRangeLabel}`
                      : "Coverage"
                }
                muted={!hasAbsences && !summary.coverageRangeLabel}
                href={hasAbsences ? attendanceHref : hasOpenShifts ? rosterHref : undefined}
              />
              <ExceptionRow
                tone="rose"
                icon={
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                  </svg>
                }
                title={
                  hasPendingRequests
                    ? summary.pendingRequestsCount === 1
                      ? "1 request to review"
                      : `${summary.pendingRequestsCount} requests to review`
                    : "No pending requests"
                }
                muted={!hasPendingRequests}
                href={hasPendingRequests ? requestsHref : undefined}
              />
            </ul>

            {hasExceptions ? (
              <Link
                href={exceptionsHref}
                className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
              >
                View all exceptions
                <ChevronRightIcon />
              </Link>
            ) : null}
          </section>

          <HomeTodayShiftCard
            todayShift={summary.todayShift}
            attendanceHref={attendanceHref}
          />
        </aside>

        <section className="min-w-0 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-4 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-900">Roster preview</h2>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  Week starting {summary.weekStartBadgeLabel}
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-500">
                {summary.orgName} · {summary.locationName}
                <span className="ml-2 inline-flex items-center gap-1.5">
                  <span
                    className={`inline-block size-1.5 rounded-full ${rosterStatusBadge.dot}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rosterStatusBadge.className}`}
                  >
                    {rosterStatusBadge.label}
                  </span>
                </span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <Link
                href={`/roster?week=${encodeURIComponent(summary.prevWeekYmd)}`}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-50"
              >
                ← Prev
              </Link>
              <Link
                href={`/roster?week=${encodeURIComponent(summary.thisWeekYmd)}`}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 font-medium text-zinc-900 hover:bg-zinc-50"
              >
                This week
              </Link>
              <Link
                href={`/roster?week=${encodeURIComponent(summary.nextWeekYmd)}`}
                className="rounded-md border border-zinc-200 px-2.5 py-1.5 text-zinc-700 hover:bg-zinc-50"
              >
                Next →
              </Link>
            </div>
          </div>

          <div className="p-4">
            {previewTableData ? (
              <>
                <RosterShareTable
                  data={previewTableData}
                  todayYmd={summary.todayYmd}
                  showShiftCountBadges
                  maxStaffRows={HOME_PREVIEW_STAFF_LIMIT}
                />
                {hiddenStaffCount > 0 ? (
                  <p className="mt-3 text-center text-xs text-zinc-500">
                    Showing {HOME_PREVIEW_STAFF_LIMIT} of {summary.rosterPreview!.totalStaffCount}{" "}
                    staff.{" "}
                    <Link href={rosterHref} className="font-semibold text-emerald-800 hover:text-emerald-950">
                      View full roster
                    </Link>
                  </p>
                ) : null}
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-6 py-12 text-center">
                <p className="text-sm text-zinc-600">
                  {summary.rosterStatus === null
                    ? "No roster yet. Add staff and build your first week."
                    : "No staff on the roster for this week."}
                </p>
                <Link
                  href={rosterHref}
                  className="mt-4 inline-flex rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800"
                >
                  {summary.rosterStatus === null ? "Start roster" : "Open roster"}
                </Link>
              </div>
            )}
          </div>

          {previewTableData ? (
            <div className="border-t border-zinc-100 px-4 py-3 text-right">
              <Link
                href={rosterHref}
                className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
              >
                Go to full roster
                <ChevronRightIcon />
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function ExceptionRow({
  tone,
  icon,
  title,
  muted,
  href,
}: {
  tone: "rose" | "amber" | "sky" | "emerald";
  icon: ReactNode;
  title: string;
  muted?: boolean;
  href?: string;
}) {
  const toneClasses = {
    rose: "text-rose-600",
    amber: "text-amber-600",
    sky: "text-sky-600",
    emerald: "text-emerald-600",
  }[tone];

  const inner = (
    <>
      <span className={`shrink-0 ${muted ? "text-zinc-400" : toneClasses}`}>{icon}</span>
      <span
        className={`min-w-0 flex-1 text-sm font-medium ${
          muted ? "text-zinc-500" : tone === "rose" ? "text-rose-800" : "text-zinc-900"
        }`}
      >
        {title}
      </span>
      {href ? (
        <ChevronRightIcon
          className={`shrink-0 ${muted ? "text-zinc-300" : tone === "rose" ? "text-rose-500" : "text-zinc-400"}`}
        />
      ) : null}
    </>
  );

  const className = `flex items-center gap-3 py-3 ${href ? "hover:bg-zinc-50 -mx-2 px-2 rounded-lg transition-colors" : ""}`;

  if (href) {
    return (
      <li>
        <Link href={href} className={className} aria-label={title}>
          {inner}
        </Link>
      </li>
    );
  }

  return (
    <li className={className} aria-label={title}>
      {inner}
    </li>
  );
}
