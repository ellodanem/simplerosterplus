# Step 11 — Self-serve signup + free tier + demo (Gate 2)

**Status:** See [STATUS.md](./STATUS.md). **Starts `blocked`** — do not begin until Gate 2 is open and step 10 is `completed`.

**Depends on:** Step 10 (Clerk). Pairs with step 12 (limit enforcement) — see note.

---

## Mission

Let cold traffic onboard themselves under the freemium model in [../PRICING.md](../PRICING.md): a free org (≤10 staff), with a **30-day device sync trial** as the attendance hook, plus an optional seeded **demo sandbox** for tire-kickers. **Canonical model is `PRICING.md`** (freemium + device trial), which supersedes the older "14-day app trial" framing in `AGENT_CONTEXT_GTM_AUTH_PRICING.md`.

---

## Before you start

1. Confirm Gate 2 open + step 10 `completed`.
2. [STATUS.md](./STATUS.md) row **11** → `in_progress`.
3. Read [../PRICING.md](../PRICING.md) (plans, device trial) and [../AGENT_CONTEXT_GTM_AUTH_PRICING.md](../AGENT_CONTEXT_GTM_AUTH_PRICING.md) §1 (journey) for context.

---

## Implement

1. **Self-serve signup:** landing **"Start Free"** → Clerk sign-up → provision Free org + default location → `/setup`.
2. **Free tier:** new orgs start on `plan = free` (no Stripe subscription). The 30-day **device** sync trial starts when the first device connects (the trial is the device hook, not an app-wide countdown).
3. **Demo sandbox (optional):** provision a seeded `isDemo` org with sample staff/roster/punches; set `demoExpiresAt`; auto-reclaim job.
4. **Optional 14-day Pro trial:** only as the upgrade-friction reducer when a Plus org hits the staff cap ([../PRICING.md](../PRICING.md) § Upgrade triggers) — not a blanket app trial.
5. **Operator visibility:** confirm free/demo/trial states render in the operator console (mirror columns).

> **Enforcement note:** free-tier **limits** (staff cap, device trial behavior) live in **step 12 Part A** and must be live before public free signup opens — otherwise a free org can add unlimited staff. Coordinate the two steps.

---

## Out of scope

- Limit enforcement + payment capture (step 12).
- Per-email anti-abuse beyond basic checks.
- Employee self-service.

---

## Definition of done

- [ ] Visitor can self-sign-up via "Start Free" → provisioned Free org → `/setup`
- [ ] Optional demo sandbox can be self-created; it expires/reclaims
- [ ] Device sync trial starts on first device connect (countdown visible)
- [ ] Free/demo/trial states visible in operator console
- [ ] Free-tier limits (step 12 Part A) confirmed live before public free signup opens
- [ ] [STATUS.md](./STATUS.md) row **11** → `completed`

**Do not commit unless user asks.**
