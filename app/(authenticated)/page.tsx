import Link from "next/link";
import { headers } from "next/headers";
import { redirectToSignIn } from "@/lib/auth-redirect";
import { getHomeWeekSummary, homeGreetingName } from "@/lib/home-week-summary";
import { resolvePublicAppUrlForOrg } from "@/lib/public-url";
import { rosterShareUrl } from "@/lib/roster-share";
import { getSession } from "@/lib/session";
import { redirectToSetupIfIncomplete } from "@/lib/setup-guard";

export const metadata = {
  title: "Home | Simple Roster Plus",
};

function timeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
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

  const hasAttendanceIssues = summary.lateCount > 0 || summary.absentCount > 0;
  const hasOpenShifts = summary.openShiftCount > 0;
  const hasExceptions = hasAttendanceIssues || hasOpenShifts;
  const rosterStatusBadge =
    summary.rosterStatus === "published"
      ? { label: "Roster live", className: "bg-emerald-100 text-emerald-800" }
      : summary.rosterStatus === "draft"
        ? { label: "Roster draft", className: "bg-zinc-100 text-zinc-600" }
        : { label: "Roster not started", className: "bg-zinc-100 text-zinc-600" };
  const intro =
    summary.rosterStatus === null
      ? "Start your first week roster, then publish and share it with staff."
      : hasExceptions || summary.pendingRequestsCount > 0
        ? "Here’s what needs attention before the week runs."
        : "All clear so far. Publish when you’re ready to share the roster.";

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            {timeGreeting()}, {name}
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Week of {summary.weekRangeLabel} ·{" "}
            <span className="font-mono text-zinc-700">{summary.timeZone}</span>
          </p>
          <p className="mt-2 text-sm text-zinc-500">
            {intro}
          </p>
          <p className="mt-0.5 text-xs text-zinc-400">
            {summary.orgName} · {summary.locationName}
            <span
              className={`ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rosterStatusBadge.className}`}
            >
              {rosterStatusBadge.label}
            </span>
          </p>
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

      <section
        className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm"
        aria-labelledby="glance-heading"
      >
        <div className="mb-4">
          <h2 id="glance-heading" className="text-lg font-semibold text-zinc-900">
            This week at a glance
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">
            Weekly summary of exceptions from roster and attendance—not payroll or policy.
          </p>
        </div>

        {!hasExceptions && summary.coverageRangeLabel ? (
          <p className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            No exceptions so far. Coverage looks good{" "}
            {summary.coverageRangeLabel ? `(${summary.coverageRangeLabel})` : ""}.
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <GlanceCard
            tone="rose"
            title={summary.lateCount === 1 ? "1 late arrival" : `${summary.lateCount} late arrivals`}
            stat={summary.lateCount}
            description={
              summary.lateCount === 0
                ? `No arrivals more than ${summary.graceMinutes} minutes late this week (through today).`
                : summary.absentCount > 0
                  ? `${summary.lateCount} late and ${summary.absentCount} absent through today (>${summary.graceMinutes} min grace).`
                  : `${summary.lateCount} arrival${summary.lateCount === 1 ? "" : "s"} more than ${summary.graceMinutes} minutes late through today.`
            }
            href={attendanceHref}
            actionLabel="View attendance"
            muted={summary.lateCount === 0 && summary.absentCount === 0}
          />
          <GlanceCard
            tone="amber"
            title={
              summary.openShiftCount === 1
                ? "1 open slot"
                : `${summary.openShiftCount} open slots`
            }
            stat={summary.openShiftCount}
            description={
              summary.rosterStatus === null
                ? "Build your first week on the roster to see open slots and coverage."
                : summary.openShiftCount === 0
                ? "Everyone schedulable has a shift assigned from today through week end."
                : summary.openShiftDayLabel
                  ? `${summary.openShiftCount} unassigned slot${summary.openShiftCount === 1 ? "" : "s"} from today on—most on ${summary.openShiftDayLabel}.`
                  : `${summary.openShiftCount} unassigned slot${summary.openShiftCount === 1 ? "" : "s"} from today through week end.`
            }
            href={rosterHref}
            actionLabel="Open roster"
            muted={!hasOpenShifts && summary.rosterStatus !== null}
          />
          <GlanceCard
            tone="emerald"
            title={
              summary.coverageRangeLabel
                ? `Coverage OK ${summary.coverageRangeLabel}`
                : "Coverage"
            }
            stat={null}
            description={
              summary.rosterStatus === null
                ? "Once you add shifts on the roster, you’ll see coverage for the week here."
                : summary.coverageRangeLabel
                ? "All schedulable slots are filled on those days."
                : hasOpenShifts
                  ? "Fill open slots on the roster to improve coverage."
                  : "No upcoming days with full coverage yet, or station is closed."
            }
            href={hasOpenShifts ? rosterHref : undefined}
            actionLabel={hasOpenShifts ? "Open roster" : undefined}
            muted={!summary.coverageRangeLabel && !hasOpenShifts}
            staticCard={!hasOpenShifts}
          />
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Quick links
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <Link href={rosterHref} className="font-medium text-emerald-800 hover:text-emerald-950">
                {summary.rosterStatus === "published"
                  ? "View roster (live) →"
                  : summary.rosterStatus === "draft"
                    ? "Continue weekly roster →"
                    : "Start your first roster →"}
              </Link>
            </li>
            {rosterShareFullUrl ? (
              <li>
                <a
                  href={rosterShareFullUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-emerald-800 hover:text-emerald-950"
                >
                  Open staff share page →
                </a>
              </li>
            ) : null}
            <li>
              <Link
                href={attendanceHref}
                className="font-medium text-emerald-800 hover:text-emerald-950"
              >
                Review attendance (this week) →
              </Link>
            </li>
            <li>
              <Link href="/staff" className="font-medium text-emerald-800 hover:text-emerald-950">
                Staff →
              </Link>
            </li>
            <li>
              <Link href="/devices" className="font-medium text-emerald-800 hover:text-emerald-950">
                Devices →
              </Link>
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Pending requests
          </h2>
          {summary.pendingRequestsCount > 0 ? (
            <>
              <p className="mt-3 text-2xl font-semibold text-zinc-900">
                {summary.pendingRequestsCount} requested
              </p>
              <p className="mt-1 text-sm text-zinc-600">
                Vacation and day-off requests waiting for a decision.
              </p>
              <Link
                href={requestsHref}
                className="mt-4 inline-flex text-sm font-semibold text-rose-800 hover:text-rose-950"
              >
                Review on roster →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-sm text-zinc-600">No pending requests right now.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function GlanceCard({
  tone,
  title,
  stat,
  description,
  href,
  actionLabel,
  muted,
  staticCard,
}: {
  tone: "rose" | "amber" | "emerald";
  title: string;
  stat: number | null;
  description: string;
  href?: string;
  actionLabel?: string;
  muted?: boolean;
  staticCard?: boolean;
}) {
  const toneClasses = {
    rose: "border-rose-100 bg-rose-50/80",
    amber: "border-amber-100 bg-amber-50/80",
    emerald: "border-emerald-100 bg-emerald-50/80",
  }[tone];

  const inner = (
    <>
      <p className={`text-sm font-semibold ${muted ? "text-zinc-700" : "text-zinc-900"}`}>
        {title}
      </p>
      {stat !== null && stat > 0 ? (
        <p className="mt-1 text-2xl font-bold tabular-nums text-zinc-950">{stat}</p>
      ) : null}
      <p className="mt-2 text-sm leading-snug text-zinc-600">{description}</p>
      {href && actionLabel ? (
        <span className="mt-3 inline-flex text-sm font-semibold text-emerald-800">{actionLabel} →</span>
      ) : null}
    </>
  );

  const className = `flex h-full flex-col rounded-lg border p-4 transition-colors ${toneClasses} ${
    href ? "hover:border-zinc-300 hover:shadow-sm" : ""
  }`;

  if (staticCard || !href) {
    return (
      <div className={className} aria-label={title}>
        {inner}
      </div>
    );
  }

  return (
    <Link href={href} className={className} aria-label={`${title}. ${actionLabel}`}>
      {inner}
    </Link>
  );
}
