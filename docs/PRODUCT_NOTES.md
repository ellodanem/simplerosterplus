# Simple Roster Plus — product notes

## Timezone (not fixed to one region)

- Each **organization** has `Organization.timeZone` (IANA string, e.g. `America/Toronto`, `Europe/London`, `UTC`).
- Roster weeks, public holidays, and leave dates are stored as PostgreSQL `DATE` values; **“which calendar day”** and **week boundaries (Monday start)** must be computed using that organization’s zone.
- Shared helpers live in `lib/datetime-policy.ts`. They take `timeZone` as an argument — there is **no** app-wide hard-coded zone (contrast: Shift Close `BUSINESS_TIME_ZONE`).

## Multi-user (planned, not implemented yet)

- The schema already scopes data with **`Organization`** and **`AppUser`** (`organizationId` on users; tenant tables link to the org).
- Intended direction: multiple **AppUser** accounts per organization, roles/permissions, and optional multi-organization support for a single deployment (e.g. agency). Login/session, invites, and RBAC are **not** wired in this scaffold — add when you pick an auth approach.

## App location

- Next.js app: **repository root** (`app/`, `package.json`, `prisma/`).
