# Step 13 — Roster notifications (email / SMS / WhatsApp) — deferred

**Status:** See [STATUS.md](./STATUS.md). **Starts `blocked`** — post-MVP enhancement. Not required for first testers; step 05 (publish + manual share) already closes the core loop.

**Depends on:** Step 05 (publish exists), and an owner decision on channel + market + opt-in.

---

## Mission

Automatically notify staff of *their* shifts when a week is published — email first, SMS second, WhatsApp optional by market. This is the heavier, provider-and-compliance version of sharing, on top of the manual link/export from step 05.

**Read first:** [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md) — full direction, market context (US SMS vs Caribbean WhatsApp), what works, what's usually wrong.

**This is a paid feature** ([../PRICING.md](../PRICING.md)): **SMS roster publish** is included on **Plus/Pro** (personal-schedule / change alerts only, volume cap TBD — Plus ~50/mo, Pro ~200/mo); **WhatsApp publish** is a **+$5/mo add-on** (included on Pro). So sends must be gated by plan + per-staff opt-in, and metered against the plan's cap.

---

## Why it's deferred (don't start without owner go-ahead)

- Step 05 lets a manager share the published week into their existing channel today — that's enough for Gate 1.
- Automated messaging needs a provider (Twilio), per-staff **opt-in**, and **TCPA/STOP** handling for US SMS — real scope, real cost, not needed to validate the product with design partners.
- Channel priority depends on which market the first paying users are in.

---

## Implement (when un-gated, per ROSTER_PUBLISH_SMS_NOTES.md)

1. **Schema:** per-staff `smsOptIn` / `emailOptIn`, plus a notification log for idempotency (Shift Close used `AppSettings` keys in `present-absence-notify.ts` — not ported to SR+ yet).
2. **Personal content only:** each staff gets *their* shifts + link — never the full grid blasted to everyone.
3. **Channels in priority order:** email (cheapest; `Staff.email` exists) → SMS to `contactNumber` (opt-in; Twilio; STOP/TCPA) → WhatsApp (optional; can share a Twilio provider with SMS later).
4. **Change alerts:** after first publish, notify only people whose shifts changed.
5. **RBAC:** supervisor-like roles must not send broadcasts — mirror `apiWriteAllowedForRole` semantics when routes exist.
6. **Manager summary (optional):** "Week of Jun 2 published — 12 staff, 3 gaps" + link.

---

## Open questions (owner decides before un-gating)

- Opt-in at staff create, org-wide toggle, or both?
- Tokenized public "my schedule" link vs require employee login first?
- Notify every publish vs only on change after first publish?
- US-only TCPA copy + STOP flow vs generic international SMS?

---

## Out of scope (even when built)

- Full roster PDF/image to SMS.
- WhatsApp group broadcast of the whole grid.
- Two-way SMS replies / shift acknowledgement.

---

## Definition of done

- [ ] Owner has chosen channel(s), market, and opt-in model
- [ ] Published week sends personal (not full-grid) notifications to opted-in staff
- [ ] Opt-in + STOP/unsubscribe respected (if SMS)
- [ ] Notification log prevents duplicates
- [ ] [STATUS.md](./STATUS.md) row **13** → `completed`

**Do not commit unless user asks.**
