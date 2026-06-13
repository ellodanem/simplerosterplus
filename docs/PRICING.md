# Simple Roster Plus — pricing (canonical)

**Status:** Owner-approved direction (May 2026). **Gate 2 (Stripe live)** implements SKUs and enforcement from this doc.

**Related:** [`AGENT_CONTEXT_GTM_AUTH_PRICING.md`](./AGENT_CONTEXT_GTM_AUTH_PRICING.md) · [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md) · [`mvp-launch/step-12-stripe-pricing-live.md`](./mvp-launch/step-12-stripe-pricing-live.md)

---

## Positioning

- **Hero product:** weekly roster + leave/requests + manager view of plan vs actual — not payroll or enterprise HR.
- **Primary competitor (attendance + devices):** [Timetaag](https://timetaag.com/pricing/) — strong on biometric sync; annual Pro (~$115/yr) reads as “~$10/mo” but requires upfront annual commitment.
- **SRP wedge:** roster-first simplicity, **monthly billing**, cancel anytime. Free tier hooks via **30-day device sync trial**; paid tier at **$19.99/mo** is an easier yes than $115/year for buyers who want simplicity over attendance-dashboard depth.

**Landing one-liner:**

> Free for up to 10 staff. Try your clock free for 30 days. Then **$19.99/month** — unlimited staff (up to 100 on Plus), live attendance, and SMS roster publish. No annual contract required.

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
| **Staff** | Up to **100** (soft warnings at 80 and 95; **hard** at #101 → Pro) |
| **Locations** | **Unlimited** (not a billing axis on paid tiers) |
| **Admins** | **2** included |
| **Devices** | **1** included, full sync |
| **SMS roster publish** | Included — personal-schedule / change alerts only; volume cap **TBD** |
| **WhatsApp publish** | **+$5/mo** add-on |
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
| **Staff** | **Unlimited** |
| **Locations** | **Unlimited** |
| **Admins** | **5** included (+$2/mo each extra) |
| **Devices** | **3** included (+$5/mo each extra) |
| **SMS roster publish** | Included — higher cap than Plus (**TBD**) |
| **WhatsApp publish** | **Included** |
| **AI assist** | Included — fair-use cap **TBD** |
| **Extras (when built)** | Exports, API, priority support |

**Annual (optional):** Pro **$499/yr** (~2 months free).

---

## Definitions

### Staff (for limits)

**Active roster staff** — rows that count toward Free / Plus caps:

- Not archived (`Staff.archivedAt` is null)
- Includes **Attendance only** rows if they remain on the staff list (simplest rule; revisit if abuse appears)

Archived staff and past-week historical data do not count toward the cap.

### Locations

- Schema: multiple `Location` rows per `Organization`.
- **Free:** 2 locations max (soft blocker at 3+).
- **Plus / Pro:** unlimited — location count is **not** sold separately; org scale is reflected primarily via **staff cap** (Plus 100 → Pro).

### Device

- A connected biometric terminal (ZKTeco / ADMS ingest) or equivalent attendance source counted toward plan device limits.
- Free tier: one slot, time-limited sync (see above).
- Paid: included devices per tier; additional devices via **$5/mo** add-on.

---

## Upgrade triggers (UX)

| Event | Target plan |
|-------|-------------|
| Staff #11 on Free | Plus |
| Location #3 on Free | Plus |
| Device trial expired; user wants live sync | Plus |
| Staff #101 on Plus | Pro |
| Needs WhatsApp on Plus | Plus + WhatsApp add-on, or Pro if bundle is cheaper |
| Needs 4+ devices with WhatsApp | Compare Plus à la carte vs Pro |

Show **soft warnings** before hard blocks (staff 80/95 on Plus; location 2 banner on Free).

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
2. **SMS caps** — Plus ~50 SMS/mo, Pro ~200/mo; personal schedule + change alerts only ([`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md)). TCPA opt-in / STOP before send.
3. **Device trial Terms** — 30-day clock start, one extension rule, post-trial read-only behavior, no data deletion.
4. **Grandfathering** — Policy when Plus org exceeds 100 staff mid-cycle.
5. **Pro price** — $49.99 confirmed; revisit after first paid cohort if conversion stalls.

---

## Operator console

Surface for support:

- `staffCount` / plan staff limit
- `locationCount` / free limit (2)
- Device trial: `deviceTrialStartedAt`, `deviceTrialExpiresAt`, extension used (Y/N)
- Subscription plan + add-on quantities (devices, admins, WhatsApp)

---

*Last updated: 2026-05-30. Update when Stripe goes live, caps are finalized, or tiers change.*
