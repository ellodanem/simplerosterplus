import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getDefaultLocation } from "@/lib/location";
import {
  getHolidaySyncYears,
  listHolidayCountries,
  listHolidaySubdivisions,
  resolveHolidayCountryCode,
  resolveHolidaySubdivisionCode,
  syncHolidayCalendarForLocation,
} from "@/lib/holiday-calendar";

function parseNullableString(value: unknown): string | null | undefined {
  if (value === null) return null;
  if (typeof value === "string") return value;
  return undefined;
}

/**
 * GET /api/roster/holiday-calendar
 * Returns the default location's holiday calendar settings and the available country/subdivision
 * options for the selected country.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const location = await getDefaultLocation(session.orgId);
  const url = new URL(request.url);
  const requestedCountry = resolveHolidayCountryCode(url.searchParams.get("countryCode"));
  const activeCountry = requestedCountry ?? location.holidayCountryCode;

  return NextResponse.json({
    holidayCountryCode: location.holidayCountryCode,
    holidaySubdivisionCode: location.holidaySubdivisionCode,
    syncYears: getHolidaySyncYears(),
    countries: listHolidayCountries(),
    subdivisions: activeCountry ? listHolidaySubdivisions(activeCountry) : [],
  });
}

/**
 * PUT /api/roster/holiday-calendar
 * Body: { holidayCountryCode: string | null, holidaySubdivisionCode?: string | null }
 */
export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const rawCountry = parseNullableString(body.holidayCountryCode);
  const rawSubdivision = parseNullableString(body.holidaySubdivisionCode);
  if (rawCountry === undefined) {
    return NextResponse.json(
      { error: "holidayCountryCode must be a string or null" },
      { status: 400 },
    );
  }
  if (rawSubdivision === undefined && !("holidaySubdivisionCode" in body)) {
    // treat omitted as null so callers don't need to send it when the country has no subdivisions
  } else if (rawSubdivision === undefined) {
    return NextResponse.json(
      { error: "holidaySubdivisionCode must be a string or null" },
      { status: 400 },
    );
  }

  const countryCode = resolveHolidayCountryCode(rawCountry);
  if (rawCountry && !countryCode) {
    return NextResponse.json({ error: "Choose a supported country." }, { status: 400 });
  }

  if (!countryCode && rawSubdivision && rawSubdivision.trim()) {
    return NextResponse.json(
      { error: "Choose a country before selecting a subdivision." },
      { status: 400 },
    );
  }

  const subdivisionCode = countryCode
    ? resolveHolidaySubdivisionCode(countryCode, rawSubdivision ?? null)
    : null;
  if (countryCode && rawSubdivision && rawSubdivision.trim() && !subdivisionCode) {
    return NextResponse.json(
      { error: "Choose a supported state, province, or region." },
      { status: 400 },
    );
  }

  const location = await getDefaultLocation(session.orgId);
  const sync = await prisma.$transaction(async (tx) => {
    await tx.location.update({
      where: { id: location.id },
      data: {
        holidayCountryCode: countryCode,
        holidaySubdivisionCode: subdivisionCode,
      },
    });
    return syncHolidayCalendarForLocation(tx, {
      organizationId: session.orgId,
      locationId: location.id,
      countryCode,
      subdivisionCode,
    });
  });

  return NextResponse.json({
    holidayCountryCode: countryCode,
    holidaySubdivisionCode: subdivisionCode,
    syncYears: sync.years,
    importedCount: sync.importedCount,
    removedCount: sync.removedCount,
    manualOverrideCount: sync.manualOverrideCount,
    countries: listHolidayCountries(),
    subdivisions: countryCode ? listHolidaySubdivisions(countryCode) : [],
  });
}
