import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { resolveLocation } from "@/lib/location";
import { getLastFiledCutoffYmd, getLatestFiledPayPeriod } from "@/lib/pay-period-last-filed";
import { payPeriodToYmd } from "@/lib/pay-period-db";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const location = await resolveLocation(session.orgId, url.searchParams.get("location"));

  const [cutoffYmd, latest] = await Promise.all([
    getLastFiledCutoffYmd(location.id),
    getLatestFiledPayPeriod(location.id),
  ]);

  return NextResponse.json({
    cutoffYmd,
    latest: latest
      ? {
          id: latest.id,
          startDate: payPeriodToYmd(latest.startDate),
          endDate: payPeriodToYmd(latest.endDate),
          filedAt: latest.createdAt.toISOString(),
        }
      : null,
  });
}
