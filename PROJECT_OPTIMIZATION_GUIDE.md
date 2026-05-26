# Project optimization guide

A practical checklist for **active** and **greenfield** projects—especially apps built quickly with AI assistance (“vibe coding”), where performance and hosting cost are easy to overlook until something breaks.

This guide is stack-agnostic. Examples use **web apps + hosted SQL** (e.g. Next.js + Neon/Postgres) because that is where many of these lessons came from, but the patterns apply to mobile clients, workers, queues, and other backends.

---

## The one idea to internalize

**Managed and serverless databases are often billed on *active compute time*, not “number of queries.”**

- Each HTTP request, cron job, or device ping can **wake** the database.
- Many parallel small queries can keep compute **busy longer** than one batched query.
- **Background traffic** (hardware, webhooks, polling tabs) can dominate usage even when “nobody is using the app.”

Optimization means: **fewer wake-ups, shorter busy periods, bounded reads, batched writes**—not shaving milliseconds off React renders.

---

## When to use this document


| Situation                                          | Use                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------- |
| **New project** (before first deploy)              | [Greenfield checklist](#greenfield-checklist-before-you-ship)       |
| **Live project** (users, quota errors, slow pages) | [Active project checklist](#active-project-checklist-audit--phases) |
| **Adding a feature**                               | [Per-feature review](#per-feature-review-5-minutes)                 |
| **Incident** (“login failed”, quota exceeded)      | [Triage first](#phase-0-triage-before-you-optimize-code)            |


---

## Phase 0: Triage before you optimize code

If the app is **down** or **flaky**, fix access before refactoring.

- Confirm whether errors are **quota / connection / auth config**, not bad user input (e.g. generic “server error” on login often means DB never answered).
- Check provider dashboard: **compute time**, connection limits, project isolation (multiple DB projects = multiple quotas, not one shared pool on typical free tiers).
- Verify **environment files**: local overrides (`.env.local`) must not blank out secrets or `DATABASE_URL` that exist in `.env`.
- Decide **short-term relief** (upgrade tier, pause non-essential envs, disable a noisy integration) so users can work while you ship code fixes.

**Lesson:** Correct credentials can still “fail login” when the database never runs the lookup.

---

## Greenfield checklist (before you ship)

Use at planning or first sprint review.

### Architecture & data

- **Default queries are bounded**—date range, pagination, or `take` cap; no “load entire table” on list screens.
- **Writes are batched** where volume exists (imports, device sync, webhooks)—design for `createMany` / bulk upsert, not per-row loops.
- **Heavy dashboards** are designed as one **bootstrap** (or BFF) endpoint, not eight parallel micro-fetches on mount.
- **Background producers** identified up front: clocks, agents, email pollers, `setInterval`, cron—each has an owner and expected QPS.
- **Polling is a last resort**; prefer push, webhooks, or “poll only when tab visible + stale.”

### API & client conventions

- **List screens** use server-side filters; **search** on large lists is debounced (≈150–300 ms), not per keystroke to the DB.
- **Tab badges / counts** use `COUNT(*)` or aggregate endpoints—not “fetch all rows and `.length`.”
- **Session / profile** reads are cacheable for soft navigation (short TTL in memory); force refresh only after login/logout.
- **Visibility refetch** policy defined: e.g. only refetch after tab hidden ≥ 3 minutes, not on every focus.

### Ops & env

- **One canonical env story** documented: which file wins locally, what Vercel/production uses, which vars must match across environments.
- **Dev machines** don’t hammer production DB by default (local DB, branch DB, or read-only replica)—document the team choice.
- **Usage monitoring** wired from day one (provider dashboard or simple weekly check).

### Process (vibe coding–specific)

- **Audit pass** scheduled before “many users” or first hardware integration—not after quota fire drill.
- **Optimization PRs** are scoped (Phase 1: ingest, Phase 2: dashboard)—easier review and rollback.
- **Agent/human rule**: don’t commit `.env.local`, secrets, or `.next` / build caches; keep optimization commits separate from UX/nav tweaks when possible.

---

## Active project checklist (audit + phases)

### Step 1 — Measure and map (1–2 hours)

- Provider usage graph: daily compute, spikes by time of day.
- List **non-human** traffic sources (devices, sync agents, cron, health checks).
- List **human** hot paths: login, home/dashboard, most-used manager screens.
- Browser Network tab on those screens: count API calls on load and per minute idle.
- Note routes with `force-dynamic` / `cache: 'no-store'` everywhere—necessary for auth, costly for read-heavy lists.

### Step 2 — Prioritize by impact


| Severity   | Pattern                                    | Typical fix                                              |
| ---------- | ------------------------------------------ | -------------------------------------------------------- |
| **High**   | 24/7 polling or webhooks with N+1 writes   | Batch writes; backoff; dedupe                            |
| **High**   | Open tabs polling every 30–60s             | Longer interval; sync-hint fingerprint; skip when hidden |
| **High**   | Page mount: 6–10 parallel API calls        | Single bootstrap endpoint                                |
| **Medium** | Unbounded `findMany` on growing tables     | `recentDays` / cursor pagination                         |
| **Medium** | Full list fetch for counts/badges          | `count` endpoint or SQL aggregate                        |
| **Medium** | Refetch entire page on tab focus           | Visibility throttle + stale time                         |
| **Low**    | `auth/me` every navigation                 | Short client TTL cache                                   |
| **Low**    | Redundant env or double DB on `/` redirect | Config hygiene                                           |


### Step 3 — Ship in phases (proven order)

1. **Unblock** (Phase 0): tier, env, access.
2. **Volume writers** (Phase 1): batch ingest, cap largest list queries.
3. **Human bursts** (Phase 2): dashboard bootstrap, batch viewer queries, visibility throttle.
4. **Remaining reads** (Phase 3): slim poll endpoints, date windows, auth cache, domain bundles (e.g. week + related rows).
5. **Polish** (Phase 4): static bootstraps, count APIs, stricter poll-when-hidden rules.

After each phase: deploy, smoke-test, watch usage for a few days before the next phase.

---

## Per-feature review (5 minutes)

Before merging any feature that touches data:

- How many **DB round trips** per user action? Can it be one?
- Does this run on a **timer** or **visibility** hook? What happens with 5 tabs open?
- Does this **scale with history** (unbounded table growth)?
- Is there a **cheaper “changed?”** check before a full reload?
- Are counts/lists **separate** queries (counts should be cheap)?

---

## Pattern reference (copy these solutions)

### 1. Sync-hint / fingerprint polling

**Problem:** Full reload every N seconds.

**Approach:**

- Tiny endpoint returns **version fingerprint** (max timestamps, config tick)—one aggregate query, not four `findFirst` calls.
- Client polls fingerprint; **full load only when fingerprint changes**.
- Increase interval when acceptable (e.g. 90s → 120s).
- **Do not poll when** `document.hidden` (or equivalent).

### 2. Dashboard / page bootstrap

**Problem:** Mount triggers many parallel API calls → many DB sessions.

**Approach:**

- One authenticated `GET /api/.../bootstrap` returns all widgets for that role.
- Small **partial refresh** endpoints only after user edits one widget.

### 3. Bounded history

**Problem:** `GET /api/items` loads all rows; cost grows forever.

**Approach:**

- Default `recentDays=120` (or pagination).
- `?all=1` for rare admin/export cases only.
- Document header e.g. `X-Items-Since` for debugging.

### 4. Week / domain bundle

**Problem:** Changing one filter refetches 4 related resources.

**Approach:**

- One server function `Promise.all([...])` per domain (week + day-off + holidays + …).
- Single route exposes bundle; client one fetch per navigation.

### 5. Static bootstrap (first paint)

**Problem:** Three “once on load” calls (staff, settings, templates).

**Approach:**

- Single `static-bootstrap` route for immutable-on-session data.

### 6. Counts without lists

**Problem:** Tab shows `(pending)` count by loading every pending row.

**Approach:**

- `GET .../counts` → `{ pendingCount, paidCount }` via DB `count()`.
- Or include counts in page bootstrap.

### 7. Visibility refetch throttle

**Problem:** Alt-tabbing retriggers heavy fetches.

**Approach:**

- Record `hiddenAt`; on visible, refetch only if `now - hiddenAt >= 3 minutes` (tune per screen).
- Shared helper in `lib/refetch-on-visibility.ts` (or equivalent) for consistency.

### 8. Client session cache

**Problem:** Every route change hits `auth/me`.

**Approach:**

- In-memory TTL (~2 min) for session payload; `refresh(true)` after login/logout; clear on logout.

### 9. Batch writes (ingest / sync)

**Problem:** 500 items = 500× (`findFirst` + `create`).

**Approach:**

- One `findMany` for existing keys + `createMany` in chunks (e.g. 250).
- Shared ingest module for every entry point (HTTP device push, file upload, agent).

---

## Environment hygiene (recurring failure mode)


| Rule                                                          | Why                                                                           |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **Local override file wins** for duplicate keys               | Empty `AUTH_SECRET` in `.env.local` breaks sessions even if `.env` is correct |
| **Same secrets across** local / preview / prod where intended | Avoid “works in prod, broken locally” mysteries                               |
| **Never commit** `.env.local`, credentials, build output      | Noise and security risk                                                       |
| **Restart dev server** after env changes                      | Frameworks cache env at startup                                               |
| **Document** which DB URL is for dev vs prod                  | Prevents accidental prod burns during vibe sessions                           |


---

## What not to do (yet)

- **Local DB / VM migration** solely for optimization anxiety—only when team wants that ops model.
- **Premature Redis** before measuring; fix N+1 and polling first.
- **Micro-optimizing React** while the Network tab shows 10 DB-backed API calls per page.
- **One giant “optimize everything” PR**—hard to review and risky to roll back.
- **Caching sensitive payroll/financial data** in public CDNs without an explicit threat model.

---

## Monitoring habits (low effort)

- Weekly: provider **compute graph** + top endpoints (if APM exists).
- After each optimization deploy: **smoke-test** login, main dashboard, heaviest list screen.
- When adding hardware or integrations: estimate **requests/minute** and add to the audit table.
- Keep a **project context log** (commits/pushes) so optimization work is traceable across agent sessions.

---

## Quick reference: Symptom → likely cause


| Symptom                                            | Likely cause                                           |
| -------------------------------------------------- | ------------------------------------------------------ |
| Login fails with generic error; DB logs show quota | Compute suspended; upgrade or reduce wake-ups          |
| Fine in morning, slow after shift change           | Parallel dashboard/API burst + many users              |
| Usage high overnight                               | Device polling, cron, or open browser tabs             |
| App fast locally, costly in prod                   | Dev pointed at prod DB; or prod has more polling users |
| Tab counts slow                                    | Loading full lists for `.length`                       |


---

## Adoption in this workspace

- **Shift Close** applied Phases 0–4 (ingest batching, dashboard bootstrap, sync-hint aggregate, days/shifts windows, roster bundles, vendor counts, visibility throttles). See that repo’s commit history on `main` for concrete diffs.
- For new repos under **westline**: copy this file or link to it in README / Cursor rules.
- Suggested agent instruction (optional `.cursor/rules` snippet): *Before DB or hosting optimization work, read `docs/PROJECT_OPTIMIZATION_GUIDE.md` and prefer phased, measurable changes.*

---

## Version

- **Created:** 2026-05-20 (from Shift Close / Neon compute optimization work).
- **Maintainer:** Update when new patterns prove useful; append “lessons learned” bullets at the bottom rather than rewriting history.

### Lessons log

- Generic **login failure** can mean **database unavailable**, not wrong password—triage provider quota first.
- **Multiple Neon projects** do not share one free-tier CU pool; still worth pruning unused projects.
- **Phase 3 item “sync-hint slim”** cut four queries to one aggregate—high leverage for polling screens.
- **Vendor invoice tabs** were loading entire tables for counts—always use `count()` or bootstrap metadata.

