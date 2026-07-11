import { NextResponse } from "next/server";
import { uncaughtApiErrorResponse } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { SampleStaffSeedError, seedSampleStaff } from "@/lib/seed-sample-staff";

/**
 * POST /api/setup/sample-staff
 * Adds five disposable sample people when the org has no staff yet.
 */
export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await seedSampleStaff(session.orgId, prisma);
    if (result.skipped) {
      return NextResponse.json({
        created: 0,
        skipped: true,
        reason: result.reason,
        message: "Staff already exist — sample people were not added.",
      });
    }
    return NextResponse.json({ created: result.created, skipped: false }, { status: 201 });
  } catch (err) {
    if (err instanceof SampleStaffSeedError) {
      return NextResponse.json(
        {
          error: err.message,
          ...(err.planLimit
            ? { code: "plan_limit", kind: err.planLimit.kind }
            : {}),
        },
        { status: err.status },
      );
    }
    return uncaughtApiErrorResponse(err, "setup sample-staff POST");
  }
}
