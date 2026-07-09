# Simple Roster Plus — pricing (canonical)

**Status:** Owner-approved direction (May 2026). **Gate 2 (Stripe live)** implements SKUs and enforcement from this doc.

**Related:** [`AGENT_CONTEXT_GTM_AUTH_PRICING.md`](./AGENT_CONTEXT_GTM_AUTH_PRICING.md) · [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md) · [`mvp-launch/step-12-stripe-pricing-live.md`](./mvp-launch/step-12-stripe-pricing-live.md)

---

## Positioning

- **Hero product:** weekly roster + leave/requests + manager view of plan vs actual — not payroll or enterprise HR.
- **Primary competitor (attendance + devices):** [Timetaag](https://timetaag.com/pricing/) — strong on biometric sync; annual Pro (~$115/yr) reads as “~$10/mo” but requires upfront annual commitment.
- **SRP wedge:** roster-first simplicity, **monthly billing**, cancel anytime. Free tier hooks via **30-day device sync trial**; paid tier at **$19.99/mo** is an easier yes than $115/year for buyers who want simplicity over attendance-dashboard depth.

**Landing one-liner:**

> Free for up to 10 staff. Try your clock free for 30 days. Then **$19.99/month** — up to 50 staff on Plus (100 on Pro), live attendance, and SMS roster publish. No annual contract required.

---

## Plans

### Free — $0

| Dimension | Limit | Enforcement |
|-----------|-------|-------------|
| **Staff** | Up to **10** | **Hard** block at staff #11 |
| **Locations** | Up to **2** | **Soft** block at location #3 (upgrade CTA; no silent failure) |
| **Admins** (Clerk members) | **1** | Hard |
| **Device sync** | **1 device slot** | **30-day live sync** when first device connects; **one +30-day extension** if org has never published a roster (`RosterWeek.status !== published`) |
| **After device trial** | — | Historical punches **read-only**; ingest paused; roster + **manual** attendance continue |
| **AI assist** | **5 actions / calendar month** | Unit definition **TBD** (see Open items) |
| **SMS / WhatsApp publish** | Not included | — |

Device trial is **per organization**, not per location (one trial clock even with 2 free locations).

---

### Plus — **$19.99/mo**

| Dimension | Limit |
|-----------|-------|
| **Staff** | Up to **50** (soft warnings at 40 and 47; **hard** at #51 → Pro) |
| **Locations** | **Unlimited** (not a billing axis on paid tiers) |
| **Admins** | **2** included |
| **Devices** | **1** included, full sync |
| **SMS roster publish** | Included — personal-schedule / change alerts only; **50 messages / calendar month** |
| **WhatsApp publish** | **+$5/mo** add-on — **200 messages / calendar month** when add-on active |
| **AI assist** | Included — fair-use cap **TBD** |

**Add-ons (Plus and Pro):**

| Add-on | Price |
|--------|------:|
| Extra device (beyond plan included count) | **+$5/mo** each |
| Extra admin (beyond plan included count) | **+$2/mo** each |
| WhatsApp publish (Plus only; included on Pro) | **+$5/mo** |

**Annual (optional, not primary CTA):** Plus **$199/yr** (~$16.58/mo, ~2 months free).

---

### Pro — **$49.99/mo**

| Dimension | Limit |
|-----------|-------|
| **Staff** | Up to **100** (soft warnings at 80 and 95; **hard** at #101 → contact support) |
| **Locations** | **Unlimited** |
| **Admins** | **5** included (+$2/mo each extra) |
| **Devices** | **3** included (+$5/mo each extra) |
| **SMS roster publish** | Included — personal-schedule / change alerts only; **200 messages / calendar month** |
| **WhatsApp publish** | **Included** — **500 messages / calendar month** |
| **AI assist** | Included — fair-use cap **TBD** |
| **Extras (when built)** | Exports, API, priority support |

**Annual (optional):** Pro **$499/yr** (~2 months free).

---

## Definitions

### Staff (for limits)

**Active roster staff** — rows that count toward plan caps:

- Not archived (`Staff.archivedAt` is null)
- Includes **Attendance only** rows if they remain on the staff list (simplest rule; revisit if abuse appears)

Archived staff and past-week historical data do not count toward the cap.

### Locations

- Schema: multiple `Location` rows per `Organization`.
- **Free:** 2 locations max (soft blocker at 3+).
- **Plus / Pro:** unlimited locations. **Staff cap** scales by tier (Plus **50** → Pro **100**).

### Device

- A connected biometric terminal (ZKTeco / ADMS ingest) or equivalent attendance source counted toward plan device limits.
- Free tier: one slot, time-limited sync (see above).
- Paid: included devices per tier; additional devices via **$5/mo** add-on.

### Automated roster messaging (SMS / WhatsApp)

Applies when step 13 roster notifications are built. **Manual** publish share (link copy, print, manager drops into a group chat) is **unlimited** on all tiers — caps apply only to **automated outbound** messages via Twilio.

**Scope:** personal-schedule notifications and post-publish **change alerts** only — not full-grid broadcasts. See [`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md).

**What counts (1 per recipient per send):**

- **Publish notify** — one utility template to each opted-in staff member when a week is published.
- **Change alert** — one utility template to each affected staff member when their shifts change after publish.

**What does not count:**

- Inbound staff messages and free-form replies inside Meta’s 24-hour customer service window.
- Failed / undelivered sends (provider billing may still apply — track separately in ops).
- Email channel (no cap in v1).
- Manager manually copying a published roster link into WhatsApp/SMS.

**Monthly caps (calendar month, org-level, separate per channel):**

| Plan | SMS | WhatsApp |
|------|----:|---------:|
| Plus | 50 | 200 (requires **+$5/mo** WhatsApp add-on) |
| Pro | 200 | 500 (included) |

**Enforcement:**

- **Soft warning** at **80%** of cap (40 SMS / 160 WhatsApp on Plus; 160 SMS / 400 WhatsApp on Pro).
- **Hard block** at cap — automated sends stop; manual link share still works; show upgrade CTA (Plus → Pro or contact support).
- **No rollover** and **no auto-overage billing** in v1. Optional later: operator-granted or Stripe **+$3 / 100 messages** pack.

**COGS rationale (WhatsApp, Jul 2026):** Twilio **$0.005/msg** + Meta utility template **~$0.004–$0.013/msg** by recipient country (Caribbean-heavy planning uses **~$0.013**). At Plus cap 200 × $0.013 ≈ **$2.60** provider cost vs **$5** add-on. At Pro cap 500 × $0.013 ≈ **$6.50** — acceptable inside Pro subscription. WhatsApp caps are more generous than SMS because per-message cost is lower and Caribbean is WhatsApp-first.

**Legal / product gates (before automated send):** org WhatsApp toggle **and** per-staff `whatsappOptIn` (default off); utility templates only — not marketing blasts. **Manual** link/print/share needs no opt-in. US SMS TCPA + STOP when SMS ships. Staff opt-in copy: plain language; **no** “message and data rates may apply” on WhatsApp checkbox (owner Jul 2026).

---

## Upgrade triggers (UX)

| Event | Target plan |
|-------|-------------|
| Staff #11 on Free | Plus |
| Location #3 on Free | Plus |
| Device trial expired; user wants live sync | Plus |
| Staff #51 on Plus | Pro |
| Staff #101 on Pro | Contact support |
| Needs WhatsApp on Plus | Plus + WhatsApp add-on, or Pro if bundle is cheaper |
| Needs 4+ devices with WhatsApp | Compare Plus à la carte vs Pro |
| WhatsApp cap hit on Plus (200/mo) | Pro (500/mo included) or wait for next calendar month |
| SMS cap hit on Plus (50/mo) | Pro (200/mo) or wait for next calendar month |

Show **soft warnings** before hard blocks (staff 40/47 on Plus; staff 80/95 on Pro; location 2 banner on Free; messaging at 80% of monthly cap).

Optional policy (later): **14-day Pro trial** when hitting Plus staff cap to reduce upgrade friction.

---

## Stripe SKU sketch (Gate 2)

| Stripe product / price | Amount | Notes |
|------------------------|-------:|-------|
| `srp_plus` | $19.99/mo | Base subscription |
| `srp_plus_annual` | $199/yr | Optional |
| `srp_pro` | $49.99/mo | Base subscription |
| `srp_pro_annual` | $499/yr | Optional |
| `srp_device_addon` | $5/mo | Quantity = devices beyond plan inclusion |
| `srp_admin_addon` | $2/mo | Quantity = admins beyond plan inclusion |
| `srp_whatsapp_addon` | $5/mo | Plus only; omit on Pro subscriptions |

**Free:** no Stripe subscription; enforce limits in app + operator console.

Plan enforcement maps to org mirror columns (`plan`, `subscriptionStatus`, etc.) — see step 12.

---

## Competitive reference (25 staff, 1 location, 1 device)

| Product | Typical monthly cost |
|---------|---------------------:|
| Timetaag Pro (annual) | ~$9.58 ($115/yr) |
| **SRP Plus** | **$19.99** |
| Homebase Essentials | $30 |
| ZoomShift Starter | ~$50 |
| When I Work Essentials | ~$62.50 |

SRP is not priced to undercut Timetaag on attendance alone; it wins on **monthly flexibility**, **roster-first UX**, and **device trial → habit → pay**.

---

## Open items (deferred — do not block SKU creation)

Track in separate passes; numbers here are placeholders until product/legal sign-off.

1. **AI metering** — Define one “action” (e.g. fill-week suggestion, conflict explanation). Free = 5/mo; Plus/Pro = fair use (e.g. 50/mo) unless COGS allow more. In-app counter before GA.
2. **Messaging caps** — **Resolved (Jul 2026):** Plus 50 SMS / 200 WhatsApp (add-on); Pro 200 SMS / 500 WhatsApp. See **Automated roster messaging** under Definitions. Still open: TCPA opt-in / STOP implementation before US SMS send; WhatsApp template approval and per-staff `whatsappOptIn`.
3. **Device trial Terms** — 30-day clock start, one extension rule, post-trial read-only behavior, no data deletion.
4. **Grandfathering** — Policy when Plus org exceeds 50 staff or Pro exceeds 100 staff mid-cycle.
5. **Pro price** — $49.99 confirmed; revisit after first paid cohort if conversion stalls.
6. **Messaging overage packs** — Optional v2: **+$3 / 100** extra automated messages (operator or Stripe); not in v1.

---

## Operator console

Surface for support:

- `staffCount` / plan staff limit
- `locationCount` / free limit (2)
- Device trial: `deviceTrialStartedAt`, `deviceTrialExpiresAt`, extension used (Y/N)
- Subscription plan + add-on quantities (devices, admins, WhatsApp)
- Messaging usage: `smsSentThisMonth` / `whatsappSentThisMonth` vs plan caps (when step 13 ships)

---

*Last updated: 2026-07-09. Plus staff cap 50; Pro staff cap 100. Messaging caps: Plus 50 SMS / 200 WhatsApp; Pro 200 SMS / 500 WhatsApp.*
