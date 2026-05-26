# Simple Roster Plus Optimization Baseline

This document captures the current optimization audit for Simple Roster Plus and gives a repeatable rollout checklist for future phases.

## Current high-cost paths

- Attendance log history:
  - `app/(authenticated)/attendance/page.tsx`
  - `lib/attendance-log-data.ts`
  - Risk: the log view can widen into a very large history window, and the log assembler fans that into roster, leave, holiday, override, and punch reads.

- Staff delete eligibility:
  - `app/(authenticated)/staff/page.tsx`
  - `lib/staff-archive.ts`
  - Risk: list rendering can trigger per-row linked-data checks across multiple tables.

- Request conflict previews:
  - `app/api/requests/route.ts`
  - `lib/requests.ts`
  - Risk: request-list loads can degrade into one roster overlap query per request row.

- Roster row template application:
  - `app/(authenticated)/roster/roster-grid.tsx`
  - `app/api/roster/weeks/[id]/entries/route.ts`
  - Risk: one user action can become many network calls plus repeated week/staff/template validation.

- Full route refreshes after narrow mutations:
  - `app/(authenticated)/attendance/attendance-log.tsx`
  - `app/(authenticated)/attendance/attendance-grid.tsx`
  - `app/(authenticated)/roster/roster-grid.tsx`
  - `app/components/staff-list.tsx`
  - Risk: small edits rerun broader server-component Prisma reads than necessary.

## Manual baseline to capture

These values cannot be inferred from the repo alone and should be recorded before large optimization changes ship:

1. Provider compute/usage:
   - daily compute time
   - overnight activity
   - quota or suspend events

2. Browser Network counts on the heaviest screens:
   - `/roster`
   - `/attendance?view=log`
   - `/attendance?view=week`
   - `/staff`
   - requests modal open + approve/deny flow

3. Non-human traffic inventory:
   - device sync or webhooks
   - polling tabs
   - cron jobs
   - health checks

## Environment and DB guardrails

- `.env.local` overrides `.env`. If a local secret or `DATABASE_URL` is blank in `.env.local`, that blank value still wins.
- Restart the dev server after env changes.
- Do not use the production database as the default local target when a local or branch database is available.
- After each optimization phase, compare provider compute against the previous baseline before starting the next phase.

## Rollout checklist

Use this for every optimization phase:

1. Deploy a small, isolated change set.
2. Smoke-test:
   - login/logout
   - roster load, cell edit, row apply, copy previous week
   - attendance log edit/add/delete/override
   - attendance week edit/add/delete/override
   - staff add/edit/archive/restore/delete test account
   - request approve/deny/delete
3. Review provider usage for at least a few days:
   - total compute
   - daytime spikes
   - overnight idle behavior
4. Record any regressions or missing metrics before starting the next phase.

## Future device-sync rules

When ADMS/device ingest lands, follow these constraints from day one:

- batch writes instead of per-punch loops
- add a slim sync-hint/fingerprint endpoint before full polling
- avoid polling when the client tab is hidden
- keep ingestion logic in one shared path so every entry point uses the same batching behavior
