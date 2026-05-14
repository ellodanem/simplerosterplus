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

## Requests & leave management (planned, not implemented yet)

Inbox-style "Requests" experience on the roster page (rose-tinted button, badge with pending count). Modal opens grouped sections per type, each row Approve / Deny.

- **In scope (v1):** vacation, day off.
- **Sick leave:** deferred. Sick leave is treated very differently in our primary market (Caribbean) — typically not multi-day or pre-requested, and often handled outside the roster. Will get its own dedicated workflow later instead of being lumped into the requests inbox. The existing `StaffSickLeave` table can stay where it is until then.
- **Shift swap:** deferred until the basic request flow ships.

Schema gaps to resolve before building:

- Promote vacation off the `Staff` row into its own `StaffVacation` table with `status` (`requested | approved | denied`), so an organization can have multiple ranges per staff member and a real approval audit trail. Migration should backfill any existing `Staff.vacationStart/End` into a single `approved` row, then drop those columns.
- Add `status` to `StaffDayOff` so day-off requests can sit in `requested` without already blocking the roster grid.
- Roster blocking switches to "is there an `approved` row covering this YMD" instead of inline range checks.

Approval flow: server returns a conflict preview before the final approve (e.g. *"Approving will clear 4 shifts already assigned to Alex Rivera between Aug 4–8."*), then a confirm step actually applies it. Same skip semantics we already use for Copy previous week.

### Future: employee-facing self-service

This same model is the foundation for an employee-facing surface where staff submit their own requests instead of an admin entering them. Multi-user is already planned (see *Multi-user* section above), and we already separate `AppUser` (login identity) from `Staff` (roster row). When that lands:

- Staff sign in to a `/me` area to submit vacation / day-off requests.
- Each submission writes a `requested` row exactly the same shape as an admin-created one.
- The supervisor's Requests modal is the single approval queue regardless of who created the row.
- A `Staff.appUserId` link (nullable) joins the two — not in the schema today, easy to add when needed.
