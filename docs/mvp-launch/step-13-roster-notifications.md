# Step 13 — Roster notifications (email / SMS / WhatsApp) — deferred

**Status:** See [STATUS.md](./STATUS.md). **Starts `blocked`** — post-MVP enhancement. Not required for first testers; step 05 (publish + manual share) already closes the core loop.

**Depends on:** Step 05 (publish exists). **Opt-in model decided (Jul 2026):** org toggle + per-staff `whatsappOptIn` — see [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md) § Owner decisions.

---

## Mission

Automatically notify staff of *their* shifts when a week is published — email first, SMS second, WhatsApp optional by market. This is the heavier, provider-and-compliance version of sharing, on top of the manual link/export from step 05.

**Read first:** [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md) — full direction, market context (US SMS vs Caribbean WhatsApp), what works, what's usually wrong.

**This is a paid feature** ([../PRICING.md](../PRICING.md)): **SMS roster publish** is included on **Plus/Pro** (personal-schedule / change alerts only; **Plus 50/mo, Pro 200/mo**); **WhatsApp publish** is a **+$5/mo add-on** on Plus (**200/mo**) or **included on Pro** (**500/mo**). Sends must be gated by plan + per-staff opt-in, and metered against the plan's per-channel cap.

---

## Why it's deferred (don't start without owner go-ahead)

- Step 05 lets a manager share the published week into their existing channel today — that's enough for Gate 1.
- Automated messaging needs a provider (Twilio), per-staff **opt-in**, and **TCPA/STOP** handling for US SMS — real scope, real cost, not needed to validate the product with design partners.
- Channel priority depends on which market the first paying users are in.

---

## Implement (when un-gated, per ROSTER_PUBLISH_SMS_NOTES.md)

1. **Schema:** per-staff `whatsappOptIn` (+ `whatsappOptInAt` audit), org `messagingWhatsappEnabled`, monthly send counters, notification log for idempotency. Defer `smsOptIn` / `emailOptIn` until those channels ship.
2. **Personal content only:** each staff gets *their* shifts + link — never the full grid blasted to everyone.
3. **Channels in priority order:** email (cheapest; `Staff.email` exists) → SMS to `contactNumber` (opt-in; Twilio; STOP/TCPA) → WhatsApp (optional; can share a Twilio provider with SMS later).
4. **Change alerts:** after first publish, notify only people whose shifts changed.
5. **RBAC:** supervisor-like roles must not send broadcasts — mirror `apiWriteAllowedForRole` semantics when routes exist.
6. **Manager summary (optional):** "Week of Jun 2 published — 12 staff, 3 gaps" + link.

---

## Owner decisions (Jul 2026)

- **Opt-in:** **Both** — org master toggle in Settings **and** per-staff checkbox on create/edit (`whatsappOptIn`, default off). See [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md).
- **Manual share:** Unlimited; no opt-in (manager uses link/print/phone browser). Separate from automated Twilio sends.
- **Staff UI copy:** No “message and data rates may apply” on WhatsApp opt-in (Caribbean trust).

## Open questions (still before un-gating)

- Tokenized public "my schedule" link vs require employee login first?
- Notify every publish vs only on change after first publish?
- US-only TCPA copy + STOP flow vs generic international SMS (when SMS ships)?

---

## Out of scope (even when built)

- Full roster PDF/image to SMS.
- WhatsApp group broadcast of the whole grid.
- Two-way SMS replies / shift acknowledgement.

---

## Definition of done

- [x] Owner has chosen opt-in model (org + per-staff; manual share exempt)
- [ ] Owner has chosen remaining open items (link shape, publish vs change-only, SMS legal)
- [ ] Published week sends personal (not full-grid) notifications to opted-in staff
- [ ] Opt-in + STOP/unsubscribe respected (if SMS)
- [ ] Notification log prevents duplicates
- [ ] [STATUS.md](./STATUS.md) row **13** → `completed`

**Do not commit unless user asks.**
