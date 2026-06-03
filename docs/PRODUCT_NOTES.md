# Simple Roster Plus — product notes

## Product positioning

Simple Roster Plus helps managers create weekly schedules and track attendance in minutes, with AI keeping the process fast and simple.

Use this as the product filter for new features and UX decisions:

- Favor work that helps a manager schedule faster, review attendance faster, or handle exceptions faster.
- Keep configuration lightweight and easy to understand.
- Prefer alerts, summaries, and AI guidance over heavy workflows.
- Avoid turning the app into payroll, compliance, or enterprise policy software unless that direction is explicitly chosen later.

**Home dashboard (planned):** See [DASHBOARD_RECOMMENDATIONS.md](./DASHBOARD_RECOMMENDATIONS.md) for the landing mock review, target “week at a glance” UX, visual alignment with the app, and implementation order.

## Holiday calendar (country import)

- Each default **location** can set a country in **Holiday calendar** (roster menu). SRP imports public/bank holidays from the `date-holidays` package for the sync window (current year −1 through +5).
- Imported rows default to **labeled only** (`stationClosed: false`). Mark a day **closed** on the roster when it should block shift assignment (typical full public holidays).
- **Half days** are not a separate database flag yet. Use the holiday name (e.g. `Carnival (half day)`) and leave the day schedulable unless you intentionally mark it closed.
- **Manual holidays** on the same date are never overwritten by sync.
- **St. Lucia (`LC`) — Carnival 2026:** The bundled library lists Carnival on **2026-07-10**, which is wrong for this year. SRP applies a patch in `lib/holiday-calendar.ts`: **20 July** = `Carnival` (full holiday — mark closed on the roster); **21 July** = `Carnival (half day)` (label only). Re-run **Save & sync** on the holiday calendar after upgrading to pick up corrected dates. Add future Carnival years to the same patch table when official dates are known.

## Timezone (not fixed to one region)

- Each **organization** has `Organization.timeZone` (IANA string, e.g. `America/Toronto`, `Europe/London`, `UTC`).
- Roster weeks, public holidays, and leave dates are stored as PostgreSQL `DATE` values; **“which calendar day”** and **week boundaries** must be computed using that organization’s zone and the org’s **week start weekday** (`AppSetting` key `roster_week_start_weekday`, 0 = Sunday … 6 = Saturday; default Monday).
- **Roster row membership** (`Staff.archivedAt`, `Staff.excludeFromRoster`, `Staff.startDate`): **Archive** sets `archivedAt` (timestamp) and removes someone from current/future roster and attendance; past roster weeks with saved shifts and punches at or before `archivedAt` remain visible. **Attendance Only** hides someone on the roster grid only. **Start date** hides weeks that end before they joined. Past roster weeks (`today >= weekEnd`) are read-only in the UI and on write APIs.
- **Staff delete** is allowed only for `isTestUser` rows with zero linked data, or in non-production / `ALLOW_STAFF_DELETE=1`. `isTestUser` is set at creation only.
- Shared helpers live in `lib/datetime-policy.ts`. They take `timeZone` as an argument — there is **no** app-wide hard-coded zone (contrast: Shift Close `BUSINESS_TIME_ZONE`).

## Multi-user (planned, not implemented yet)

- The schema already scopes data with **`Organization`** and **`AppUser`** (`organizationId` on users; tenant tables link to the org).
- Intended direction: multiple **AppUser** accounts per organization, roles/permissions, and optional multi-organization support for a single deployment (e.g. agency). Login/session, invites, and RBAC are **not** wired in this scaffold — add when you pick an auth approach.
- **Operator/admin plane (separate concern):** administering *all* customers/orgs (monitoring, Stripe billing, device fleet) is a distinct surface from tenant admin — planned at `admin.simplerosterplus.com` with its own auth. See [OPERATOR_CONSOLE.md](./OPERATOR_CONSOLE.md).

## App location

- Next.js app: **repository root** (`app/`, `package.json`, `prisma/`).

## Requests & leave management (v1 shipped)

Inbox-style "Requests" experience on the roster page (rose-tinted button, badge with pending count). Modal opens grouped sections per type, each row Approve / Deny / Delete.

- **In scope (v1, shipped):** vacation, day off.
- **Sick leave:** deferred. Sick leave is treated very differently in our primary market (Caribbean) — typically not multi-day or pre-requested, and often handled outside the roster. Will get its own dedicated workflow later instead of being lumped into the requests inbox. The existing `StaffSickLeave` table stays where it is, untouched, until then.
- **Shift swap:** deferred until v1 has been live for a bit.

Schema (now in `prisma/schema.prisma`, migration `20260513230000_requests_workflow`):

- New `LeaveRequestStatus` enum (`requested | approved | denied`) shared by vacation and day-off rows. `StaffSickLeave` keeps its existing `SickLeaveStatus` enum until the sick-leave workflow lands.
- New `StaffVacation` table replacing inline `Staff.vacationStart/End` (those columns were dropped). Each row has a `status`, `reason`, and `decidedBy/decidedAt` audit fields. The migration backfills any existing inline vacation range into a single `approved` row tagged `<staffId>_v0` so nothing currently blocking the roster silently disappears.
- `StaffDayOff` gained `status` (default `approved` so existing rows keep blocking), `reason`, `decidedBy/decidedAt`, plus `createdAt/updatedAt`. `(staffId, date)` is still unique, so creating a new request for a date that already has a row upserts in place.

Roster blocking switched from inline range checks to "is there an `approved` `StaffVacation` or `StaffDayOff` row covering this `(staffId, ymd)`?". Helper lives in `lib/leave-blocks.ts` (`getApprovedBlockMap` for the grid's per-week lookup, `isApprovedBlocked` for single-cell write APIs).

### Approval flow

API endpoints (all under `/api/requests`, scoped to the org's default location):

- `GET /api/requests?status=requested|approved|denied|all` — returns `{ vacation, dayOff, pendingCount }`. Each `requested` row includes `conflictCount` + `conflictDates` so the UI can surface "approving will clear N shifts" inline.
- `POST /api/requests/vacation` — `{ staffId, startDate, endDate, reason? }` → creates a `requested` vacation row.
- `POST /api/requests/day-off` — `{ staffId, date, reason? }` → upserts a `requested` day-off row (a fresh request for an already-decided date resets the row).
- `PATCH /api/requests/<type>/[id]` — `{ action: "approve" | "deny", force?: boolean }`.
  - Deny is unconditional and never touches the roster.
  - Approve runs a conflict preview when `force` isn't passed: if any roster shifts overlap the leave range, it returns 409 with `{ conflictCount, conflictDates, requiresConfirm: true }`. The UI surfaces a confirm modal; resending with `force: true` clears those shifts (matching the manual cell-clear semantics: rows are deleted, not nulled) and flips the row to `approved` in a single transaction.
- `DELETE /api/requests/<type>/[id]` — hard delete in any status. Approved rows therefore stop blocking immediately on delete.

UI state: the roster page passes the initial pending count + per-cell `blockMap` in. The Requests modal owns its own list state, calls the API on open / after each action, and drives the badge count via `onPendingCountChange`. On approve, the grid does `router.refresh()` so the new block (and any cleared shifts) appear without a manual reload.

### Outstanding follow-ups (out of v1)

- **Cell dot for pending requests.** Show a small indicator on roster cells when a staff member has a pending vacation/day-off touching that date, so supervisors notice the inbox without opening the modal.
- **Calendar/preview before submission.** Right now an admin creating a vacation can't see the staff member's existing roster from inside the modal — they only learn about conflicts at approve time. A small inline "what does their week look like" preview would tighten the loop.
- **Auto-approve on admin create.** Two-click (create → approve in inbox) is fine, but a "Submit and approve" toggle on the create form would shave a step for the common admin-self-serve case.
- **Per-location admin scoping.** Today a session that authenticates is allowed to act on every request in the org's default location. RBAC will need to slot in here once roles exist.

### Future: employee-facing self-service

This same model is the foundation for an employee-facing surface where staff submit their own requests instead of an admin entering them. Multi-user is already planned (see *Multi-user* section above), and we already separate `AppUser` (login identity) from `Staff` (roster row). When that lands:

- Staff sign in to a `/me` area to submit vacation / day-off requests.
- Each submission writes a `requested` row exactly the same shape as an admin-created one.
- The supervisor's Requests modal is the single approval queue regardless of who created the row.
- A `Staff.appUserId` link (nullable) joins the two — not in the schema today, easy to add when needed.

## Roster count row — scaling beyond ~5 templates per day (deferred)

The per-day count row above the staff grid (`app/(authenticated)/roster/roster-grid.tsx`, ~line 492) renders one colored badge per distinct shift template used that day, plus an `Off: N` text chip. It looks great up to ~5 badges per cell. With 6+ distinct templates in a single day it still works (the container is `flex flex-wrap`), but the row grows a second/third line and pushes every staff row down. Not broken, just visually heavy. Defer until a real station hits this in practice.

**Geometry recap (for whoever picks this up):**

- Day columns: `min-w-[7rem]` (112px).
- Badges: `size-5` (20px) with `gap-1` (4px) → ~5 badges fill the cell, 6+ wraps.
- `Off: N` lives in the same flex row, so once badges wrap it can end up dangling alone on its own line.
- Items are currently sorted **alphabetically by template name**, not by count.

**Options to consider (in rough order of preference):**

1. **Segmented bar instead of badges.** One horizontal stacked bar per cell, segments sized proportionally to count, color = template, number inside. Single fixed-height row, scales to 10+ templates, also conveys proportions (not just presence). Best long-term answer if 6+ templates/day is genuinely common.
2. **Overflow chip + sort by count desc.** Show first 4–5 badges sorted by count descending, then a `+N` chip with a tooltip/popover listing the rest. Keeps the current aesthetic for the common case, degrades cleanly. Best if 6+ is a rare edge case.
3. **Move `Off: N` out of the badge wrap.** Pin it to its own small second line under the badges so it never competes with badges for layout. Worth doing regardless of which scaling option is chosen — it's a small free win.
4. **Shrink at scale.** Drop badges to `size-4` and tighter gap once there are 5+. Cheap, but only buys ~2 more badges before wrapping resumes.
5. **Hide singletons / fold into "+N other".** Highlights the dominant templates ("mostly 6-1 + Day shift") at the cost of detail. Useful as a complement to options 1 or 2.
6. **Constrain row height with `max-h` + click-to-expand.** Protects layout but hides info, which fights the whole purpose of the count row. Last resort.

**Suggested combo when the time comes:** start with **3** (move `Off:` to its own line) since it's low-risk and independently useful, then pick between **1** (segmented bar) and **2** (overflow chip + sort) based on whether real-world data actually has many distinct templates per day or whether 6+ is rare.
