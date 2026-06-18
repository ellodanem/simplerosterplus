import Link from "next/link";
import type { DeviceTrialStatus } from "@/lib/device-trial";

export function DeviceTrialBanner({ trial }: { trial: DeviceTrialStatus }) {
  if (!trial.started) {
    return (
      <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
        <p className="font-medium">30-day device sync trial</p>
        <p className="mt-1 text-sky-900/90">
          Connect your first terminal — the trial starts when it reaches the server. Roster and manual
          attendance stay free.
        </p>
      </div>
    );
  }

  if (trial.expired) {
    return (
      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-medium">Device sync trial ended</p>
        <p className="mt-1">
          Historical punches are read-only and live ingest is paused. Roster and manual attendance
          continue on the free plan.{" "}
          <Link href="/settings" className="font-semibold underline underline-offset-2">
            Upgrade to Plus
          </Link>{" "}
          to turn live sync back on.
        </p>
      </div>
    );
  }

  const days = trial.daysRemaining ?? 0;
  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
      <p className="font-medium">
        Device sync trial — {days} {days === 1 ? "day" : "days"} left
      </p>
      <p className="mt-1 text-emerald-900/90">
        Live attendance from your clock is active. After the trial, historical punches stay visible
        and ingest pauses unless you upgrade.
      </p>
    </div>
  );
}
