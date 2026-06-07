# MVP launch — step status

**Update this file when you start or finish a step.** New agents: first `pending` row wins (lowest number). `blocked` rows (Phase 2 + step 13) are deferred until the owner opens that gate — do not start them.

| Step | File | Phase | Status | Agent | Started | Completed | Notes |
|------|------|-------|--------|-------|---------|-----------|-------|
| 01 | [step-01-tenant-isolation-audit.md](./step-01-tenant-isolation-audit.md) | 0 | `completed` | cursor-2026-05-31 | 2026-05-31 | 2026-05-31 | Login email fix + compound org guards; see isolation-audit-findings.md |
| 02 | [step-02-tenant-provisioning.md](./step-02-tenant-provisioning.md) | 0 | `completed` | cursor-2026-05-31 | 2026-05-31 | 2026-05-31 | Operator UI at /ops/organizations + `npm run provision-org`; audited `org.create` |
| 03 | [step-03-production-hardening.md](./step-03-production-hardening.md) | 0 | `completed` | cursor-2026-06-01 | 2026-06-01 | 2026-06-01 | Seed/login guards + audit scripts; owner confirms Neon/Vercel/live logins in prod-hardening-checklist.md |
| 04 | [step-04-graceful-errors.md](./step-04-graceful-errors.md) | 0 | `completed` | cursor-2026-06-01 | 2026-06-01 | 2026-06-01 | error/not-found/global UI; lib/api-error; safe API + ADMS OK-on-error |
| 05 | [step-05-roster-publish-share.md](./step-05-roster-publish-share.md) | 1 | `completed` | cursor-2026-06-01 | 2026-06-01 | Publish API + share token link `/share/roster/[token]` + print; gap modal |
| 06 | [step-06-zkteco-live-test.md](./step-06-zkteco-live-test.md) | 1 | `completed` | cursor-2026-06-01 | 2026-06-01 | 2026-06-01 | ADMS curl sim on non-seed org; see field-test-log.md + scripts/zkteco-field-test.ts |
| 07 | [step-07-first-run-ux.md](./step-07-first-run-ux.md) | 1 | `completed` | cursor-2026-06-02 | 2026-06-02 | 2026-06-02 | Home: clearer “roster not started” + first-week CTA; Staff: removed seed copy; Roster: “Auto scheduler” (no AI promise) |
| 08 | [step-08-marketing-site-ready.md](./step-08-marketing-site-ready.md) | 1 | `completed` | cursor-2026-06-02 | 2026-06-02 | 2026-06-02 | Early-access form → `/api/marketing/contact`; truthful copy; SEO meta. Domain: stay on Vercel until owner buys simplerosterplus.com |
| 09 | [step-09-feedback-intake.md](./step-09-feedback-intake.md) | 1 | `completed` | cursor-2026-06-07 | 2026-06-07 | 2026-06-07 | In-app Send feedback + `/ops/feedback` triage; see feedback-loop.md |
| 10 | [step-10-clerk-auth.md](./step-10-clerk-auth.md) | 2 | `blocked` | | | | Gate 2 — awaiting owner go-ahead |
| 11 | [step-11-self-serve-demo-trial.md](./step-11-self-serve-demo-trial.md) | 2 | `blocked` | | | | Gate 2 — self-serve signup + free tier + demo (PRICING.md) |
| 12 | [step-12-stripe-pricing-live.md](./step-12-stripe-pricing-live.md) | 2 | `blocked` | | | | Gate 2 — plan-limit enforcement + Stripe (PRICING.md); may split 12a/12b |
| 13 | [step-13-roster-notifications.md](./step-13-roster-notifications.md) | Deferred | `blocked` | | | | Post-MVP: automated email/SMS/WhatsApp; see ROSTER_PUBLISH_SMS_NOTES.md |

### Status values

- `pending` — not started
- `in_progress` — agent actively working (only one agent per step)
- `completed` — done; next agent may take next `pending` step
- `blocked` — waiting on user/decision; do not start unless user says so

### Gate markers

- **Gate 1 (design-partner ready)** is met when **01–04** are `completed`.
- **Outreach ready** is met when **05–09** are `completed`.
- **Gate 2 (self-serve / SEO)** opens only when the owner says so; then flip 10–12 to `pending`.
- **Step 13** (automated notifications) is a separate post-MVP enhancement; un-gate independently when the owner picks a channel/market.

### Changelog

| Date | Step | Change |
|------|------|--------|
| 2026-06-07 | 09 | Tester feedback: footer form → `/api/feedback` → `TesterFeedback`; ops `/ops/feedback`; feedback-loop.md |
| 2026-06-02 | 08 | Marketing site: contact API + early-access form, freemium copy, SEO/favicon; migration `20260602120000_marketing_inquiry` |
| 2026-06-01 | 06 | ADMS field test on provisioned org; field-test-log.md + repeatable script |
| 2026-06-01 | 05 | Roster publish/unpublish API, public share link, print view, Home draft/published |
| 2026-06-01 | 04 | App error boundaries; generic API 500s; roster + iclock hardened |
| 2026-06-01 | 03 | Production seed guard, @demo.local login block, prod:env-audit / prod:secret-scan / prod:remove-demo-creds |
| 2026-05-31 | 02 | Operator create-org form + shared `lib/ops/provision-org` + CLI script |
| 2026-05-31 | 01 | Completed isolation audit; fixed login email ambiguity + hardened mutation guards |
| 2026-05-30 | — | Roadmap created from MVP_LAUNCH_READINESS.md |
| 2026-05-30 | 05, 13 | Added roster publish & share (core loop) + deferred notifications; renumbered Phase 1/2 (per ROSTER_PUBLISH_SMS_NOTES.md) |
| 2026-05-30 | 11, 12 | Reconciled with PRICING.md: freemium self-serve + 30-day device trial; folded free/paid limit enforcement into step 12; SMS/WhatsApp marked paid |
