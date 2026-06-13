# MVP & launch readiness — the "ready for first testers" guide

**Status:** Living doc. Created 2026-05-30.
**Owner question this answers:** *"Are we at the point where we can start outreach / SEO because the app is ready to take on its first set of users/testers?"*

**Execution tracker:** [`mvp-launch/STATUS.md`](./mvp-launch/STATUS.md) — the step-by-step claim board (one agent per step), same workflow as `device-ingest/`. This doc is the *why*; that folder is the *how*.

**Related:** [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`PRICING.md`](./PRICING.md) · [`AGENT_CONTEXT_GTM_AUTH_PRICING.md`](./AGENT_CONTEXT_GTM_AUTH_PRICING.md) · [`OPERATOR_CONSOLE.md`](./OPERATOR_CONSOLE.md) · [`DASHBOARD_RECOMMENDATIONS.md`](./DASHBOARD_RECOMMENDATIONS.md) · [`../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md`](../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md) · [`device-ingest/STATUS.md`](./device-ingest/STATUS.md)

---

## 0. How to use this doc

This is the single checklist that says whether we can put the app in front of a real person. Two audiences:

- **You (owner):** scan §1 and §3 to see if the gate is met, then §7 for what to decide.
- **Future agents:** §4 is the scope fence (don't build outside it), §6 is the work list, §8 is the order.

When you change anything material (auth, onboarding, a blocker closes), update the status table in §6 and the date at the top. Treat `prisma/schema.prisma` and `app/**/route.ts` as truth if this doc drifts.

---

## 1. The gate, in one sentence

> **We are "ready for first testers" when one hand-picked manager can sign in to their own clean org, build a real week's roster, see real punches from their ZKTeco device flow into attendance, and we can support them without touching the database by hand — and nothing they do can ever see another org's data.**

That's it. Everything below is in service of that sentence.

We are **close but not there.** The product surface is strong; the gaps are in **getting a tester in safely** and **a few trust/operability basics**, not in core features.

---

## 2. Who the "first testers" actually are (this changes the bar)

**The long-term model is freemium self-serve**, now owner-approved in [`PRICING.md`](./PRICING.md): **Free** up to 10 staff, a **30-day device sync trial**, then **Plus $19.99/mo** / **Pro $49.99/mo**. The landing one-liner is "Free for up to 10 staff. Try your clock free for 30 days. Then $19.99/month." That is product-led / self-serve, not the old consultative "request a setup quote" framing (the older `landing-page/MAPPING.md` copy predates this decision and should be aligned to it).

**But freemium self-serve needs Clerk signup + plan-limit enforcement (Gate 2).** So there are two distinct motions:

1. **First design partners (now):** we can still **hand-onboard 1–5 sites** by creating their org for them (step 02) onto what will become the Free/Plus tier — no Clerk/billing needed to start. The ZKTeco field-test path is the "wow" ([`DEVICE_INGEST_FIELD_TEST.md`](./DEVICE_INGEST_FIELD_TEST.md)).
2. **Real outreach + SEO (later):** because the GTM is freemium, cold visitors clicking **"Start Free"** must be able to sign themselves up and be held to free-tier limits. That is **Gate 2** (Clerk + free-tier enforcement + Stripe). The freemium decision therefore makes Gate 2 *more* central to the GTM than a pure consultative model would — plan accordingly.

### Two gates, not one

| Gate | Audience | What it unlocks | Need Clerk/billing? |
|------|----------|-----------------|---------------------|
| **Gate 1 — Design-partner ready** | 1–5 hand-onboarded sites | Direct outreach, partner demos, ZKTeco field tests | **No** |
| **Gate 2 — Self-serve / SEO ready** | Cold inbound traffic | SEO, ads, "start free trial" that actually works without us | **Yes** |

**The "true MVP" the owner is asking about is Gate 1.** SEO with cold traffic that signs itself up is Gate 2 and needs more. Don't conflate them — chasing Gate 2 work now would delay real user feedback.

---

## 3. Where we are right now (honest snapshot)

| Area | State | Note |
|------|-------|------|
| Roster (weekly grid, templates, lock, copy previous, min-off-days) | **Done** | Strongest part of the app |
| **Roster publish & share** | **Gap** | Schema has `draft`/`published` + a badge, but **no Publish button/API and no way to get the week to staff** — core-loop gap (see step 05) |
| Staff (CRUD, archive/restore, roles, departments, device user ID) | **Done** | |
| Attendance (week view, punch log, manual edit, grace, overrides, staff report) | **Done** | |
| Device / ADMS ingest (`/iclock/*`, unmapped mapping, health, public URL) | **Done** | All 7 ingest steps complete |
| Home dashboard ("week at a glance") | **Done** | Rule-based, not AI yet |
| Setup wizard (`/setup`) + guard | **Done** | Gates: location, roles, staff, templates |
| Requests / leave inbox (vacation + day off) | **Done (v1)** | Sick leave + swap deferred on purpose |
| Multi-tenant data model (Organization / Location) | **Done (schema)** | **Isolation needs verification — see §5** |
| Operator console (`/ops`) | **Done (v1)** | Org 360, Stripe mirror, audit, impersonation |
| **Getting a tester their own org** | **Gap** | Only the seed script creates orgs today |
| **Transactional email / password reset** | **Missing** | Acceptable for Gate 1 if we hand over credentials |
| **Marketing site contact form** | **Gap** | Uses a demo `alert()`, not wired to anything |
| **Clerk auth / self-serve signup / billing** | **Not wired** | Gate 2 only |

**Rough completion against Gate 1: ~80%.** The remaining 20% is small but blocking (onboarding a tenant, isolation proof, contact wiring, support basics).

### One honesty flag before any outreach

Marketing copy leans on **"AI keeps it fast and simple."** Today the "AI" is **rule-based summaries** (`lib/home-week-summary.ts`), not a model. That's fine — but keep public copy to **"summary"** / **"keeps it simple"** language and don't promise generative AI features we don't have. See `DASHBOARD_RECOMMENDATIONS.md` (it already calls this out).

---

## 4. MVP scope fence (what's IN, what's OUT)

**Agents: do not build anything in the OUT column for Gate 1 without explicit owner approval.** The point of an MVP is to get real feedback, not to be complete.

### IN (must work for Gate 1)
- Sign in → land on Home → `/setup` if incomplete.
- Setup wizard: timezone, week start, grace, shift templates, roles, staff.
- Build a roster week; copy previous week.
- **Publish a week and share it with staff** — a Publish action plus a read-only shareable link / printable view the manager can drop into their existing WhatsApp/SMS group. *(Automated SMS/WhatsApp/email notifications are OUT — see step 13.)*
- Vacation / day-off requests block the roster correctly.
- ZKTeco device registered; punches arrive via ADMS; unmapped punches can be mapped to staff.
- Attendance week view + manual punch correction + staff date-range report.
- A working, truthful landing page with privacy/terms and a real way to contact us.
- A way for **us** to create a clean org + admin for a new tester (see §6 Onboarding).
- Hard multi-tenant isolation (no cross-org data, ever).

### OUT (deliberately deferred — don't build now)
- Clerk auth, self-serve signup, password reset, email verification *(Gate 2)*.
- Stripe checkout + **free/paid plan-limit enforcement** (staff/location/admin caps, 30-day device sync trial) *(Gate 2 per `PRICING.md`; billing mirror columns already exist, device-trial fields don't yet)*.
- Sick-leave workflow and shift swap *(see `PRODUCT_NOTES.md` — Caribbean market reasons)*.
- Pay-period pipeline, present/absence late-notify *(Shift Close parity, optional)*.
- **Automated roster notifications** (email/SMS/WhatsApp on publish) *(real later work — provider, opt-in, TCPA; step 13 + `ROSTER_PUBLISH_SMS_NOTES.md`. Manual share via link/print is the MVP — see IN list)*.
- `pull_tcp` / Windows agent / LAN sync *(ADMS-only decision, `DEVICE_INGEST_PULL_TCP_DECISION.md`)*.
- Employee self-service `/me` portal *(future)*.
- Per-location / per-role RBAC beyond single admin per org *(future)*.
- Generative-AI features in the product *(rule-based is the MVP)*.

---

## 5. Blockers — must fix before ANY external user touches it

These are non-negotiable. They're about trust and not embarrassing ourselves, not features.

1. **Multi-tenant isolation proof.** Every tenant query must be scoped by `organizationId` (and location where relevant). Before a second org exists on the same DB, do a deliberate audit: log in as Org A, try to read/write Org B's staff, roster, attendance, devices, requests by guessing IDs in URLs and API calls. **Zero leakage allowed.** This is the single highest-risk item.
2. **A real way to onboard a tester.** Right now only `prisma/seed.ts` makes an org. We need either (a) a small operator-console "Create organization + admin" action, or (b) a documented, repeatable provisioning script. Without this we cannot add tester #2 without hand-editing the DB.
3. **Production database has backups.** Confirm the Neon (or chosen) production DB has point-in-time recovery / backups on. A tester's lost data kills trust instantly.
4. **No dev/seed credentials in production.** `admin@demo.local / demo` and `ops@demo.local / ops` must not exist (or must be disabled) on the production instance. Verify env-driven seed values are set, or seed isn't run in prod.
5. **Graceful failure, not stack traces.** Hitting an error should show a clean message, not a Next.js stack trace or a 500 with internals. Spot-check the obvious paths (bad roster save, device callback with junk, expired session).

If any of these five is open, **we are not ready for outreach**, regardless of how polished the features are.

---

## 6. The work list (status + definition of done)

Status: **Done** / **Gap** (work needed for Gate 1) / **Later** (Gate 2+).

### Onboarding & access
| Item | Status | Done when |
|------|--------|-----------|
| Operator "Create org + admin" action (or scripted provisioning) | **Gap** | We can spin up a clean tester org + login in under 5 minutes, no DB editing |
| Hand-off credentials to tester | **Gap** | A short "welcome" template + temp password process exists (manual email is fine) |
| Setup wizard guides first run | **Done** | — |
| Password reset / forgot | **Later** | Gate 2 (manual reset by us is acceptable for Gate 1) |
| Clerk signup / provisioning webhooks | **Later** | Gate 2 |

### Core product loop
| Item | Status | Done when |
|------|--------|-----------|
| Roster build / lock / copy | **Done** | — |
| **Roster publish + share** (link/print) | **Gap** | **Step 05** — completes the loop: build → publish → get it to staff |
| Staff CRUD + archive | **Done** | — |
| Requests (vacation / day off) block roster | **Done** | — |
| Attendance week + manual edit + report | **Done** | — |
| Empty-state quality on first login | **Gap** | A brand-new org with zero data looks intentional, not broken, on Home/Roster/Attendance |
| Mobile / tablet sanity pass | **Gap** | Managers can read Home and the roster on a phone without it falling apart (doesn't need to be perfect) |

### Devices / partner path
| Item | Status | Done when |
|------|--------|-----------|
| ADMS ingest + unmapped mapping + health | **Done** | — |
| Field-test runbook | **Done** | `DEVICE_INGEST_FIELD_TEST.md` |
| One real end-to-end device test on a live org | **Gap** | A physical (or partner) ZKTeco punch shows in attendance on a non-seed org |

### Trust & safety (see §5)
| Item | Status | Done when |
|------|--------|-----------|
| Cross-org isolation audit | **Gap** | Documented attempt to break it, with zero leaks |
| Prod backups confirmed | **Gap** | Screenshot/note that PITR/backups are on |
| No seed creds in prod | **Gap** | Verified prod has no `*@demo.local` default logins |
| Clean error pages | **Gap** | Spot-checked; no raw stack traces to users |

### Marketing site + legal
| Item | Status | Done when |
|------|--------|-----------|
| Landing page exists | **Done** | `landing-page/index.html` |
| Privacy + Terms | **Done (draft)** | `landing-page/privacy.html`, `terms.html` — owner reviews wording once |
| Contact form actually sends | **Gap** | Form submits to a real inbox/endpoint (even a simple mailto or form service), demo `alert()` removed |
| Copy matches shipped features | **Gap** | One pass to remove any over-promise (esp. "AI"); CTA is now **freemium "Start Free"** per `PRICING.md` — but self-serve signup isn't built until Gate 2, so during Phase 1 the CTA should capture interest (waitlist / contact), not promise instant self-signup |
| Basic SEO meta | **Gap** | Title, description, OG tags per `MAPPING.md §0`; real domain decided |

### Operability (can we support a live tester?)
| Item | Status | Done when |
|------|--------|-----------|
| Operator console live | **Done** | `/ops` |
| Read-only impersonation for support | **Done** | — |
| We can see a tester's org health | **Done** | Org 360 + device health |
| A way to take feedback / bug reports | **Gap** | An email or channel testers use; we triage it |

---

## 7. Decisions only the owner can make

Agents should stop and ask on these, not guess:

1. ~~**CTA / offer model.**~~ **Resolved by [`PRICING.md`](./PRICING.md): freemium self-serve** (Free ≤10 staff → Plus $19.99 → Pro $49.99; 30-day device trial). Remaining sub-question for Phase 1 only: since self-serve signup is Gate 2, does the landing **"Start Free"** CTA capture a **waitlist / early-access** during outreach, or do we hold public launch until Gate 2 is live? *(Recommendation: waitlist now; flip to real self-serve when Gate 2 ships. Hand-onboard the first design partners regardless.)*
2. **Domain.** Stay on `simplerosterplus.vercel.app` for testers, or buy `simplerosterplus.com` before outreach? *(Recommendation: buy the domain before any SEO/marketing spend; fine to demo on Vercel URL to hand-picked partners.)*
3. **How many testers in the first batch?** This sets how much the manual onboarding pain matters. 2–3 = scripts are fine; 10+ = build the operator "create org" action first.
4. **Pricing posture for testers.** Public pricing is set ([`PRICING.md`](./PRICING.md)); the only open call is whether design partners run **free during testing** (recommended) or on a comped Plus/Pro. Informal for Gate 1.
5. **Privacy/Terms wording.** Legal review (even a light one) before collecting real staff/biometric-adjacent data, especially given multi-region timezones.

---

## 8. Sequenced plan (do it in this order)

Each item maps to a claimable step in [`mvp-launch/STATUS.md`](./mvp-launch/STATUS.md) — agents take the lowest `pending` step.

### Phase 0 — Close the blockers (this is the real MVP work)
- **Step 01** — Multi-tenant isolation audit (§5.1). Highest priority.
- **Step 02** — Tenant provisioning: operator "Create org + admin" action **or** a documented script (§6 Onboarding).
- **Step 03** — Confirm prod backups + remove seed creds from prod (§5.3, §5.4).
- **Step 04** — Graceful errors / no stack traces (§5.5).

> **When Phase 0 is done, we have met Gate 1 for ourselves** — we can safely put the app in front of a hand-onboarded tester.

### Phase 1 — Complete the loop + make the first partner demo great
- **Step 05** — Roster **publish & share** (Publish action + read-only link/print). Core loop — without it a manager can't get the week to their team.
- **Step 06** — One real ZKTeco end-to-end test on a non-seed org (§6 Devices).
- **Step 07** — Empty-state + mobile sanity pass (§6 Core loop).
- **Step 08** — Marketing site: wire contact form + tighten copy + SEO meta + decide domain (§6 Marketing).
- **Step 09** — Feedback / support channel (§6 Operability).

> **When Phase 1 is done, we can do outreach and partner demos with confidence.** This is the point the owner is aiming for.

### Phase 2 — Earn cold/SEO traffic (Gate 2, later — steps start `blocked`)
- **Step 10** — Clerk auth + tenant provisioning webhooks + `/setup` go-live gates (`AGENT_CONTEXT_GTM_AUTH_PRICING.md`).
- **Step 11** — Self-serve "Start Free" signup + free tier + demo sandbox + 30-day device trial (`PRICING.md`).
- **Step 12** — Stripe keys on Vercel + pricing/SKUs (mirror columns already exist). Password reset / email verification comes with Clerk in step 10.

> Only invest in Phase 2 once Phase 1 testers prove the core loop is valuable. Don't build the funnel before the product is loved by 2–3 real sites. Open Gate 2 by flipping steps 10–12 from `blocked` to `pending` in STATUS.md.

### Deferred — Automated roster notifications (step 13)
- **Step 13** — Email/SMS/WhatsApp notifications on publish (personal shifts only). Real provider + opt-in + TCPA work; **not** needed for first testers since step 05 covers manual sharing. Un-gate independently once the owner picks a channel/market. See [`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md).

---

## 9. The one-line answer for "are we ready?"

- **Ready to demo to a hand-picked partner today?** Almost — finish Phase 0 (mainly: prove isolation, make a clean way to create their org, confirm backups).
- **Ready for outreach + a truthful landing page?** After Phase 1.
- **Ready for SEO / cold self-serve signups?** Not yet — that's Phase 2 (Clerk + trial + pricing).

**Bottom line: the product is built; what's left for the true MVP is trust, tenant onboarding, and marketing wiring — not features.**

---

*Update the status tables and the date at the top whenever a row moves. When Phase 0 closes, note it here so the next agent knows Gate 1 is met.*
