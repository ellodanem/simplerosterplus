# Step 12 — Plan enforcement + Stripe billing (Gate 2)

**Status:** See [STATUS.md](./STATUS.md). **Starts `blocked`** — do not begin until Gate 2 is open and step 11 is `completed`. Tiers, limits, and SKUs are defined in [../PRICING.md](../PRICING.md) (canonical).

**Depends on:** Step 10 (Clerk, for admin/member counts) and step 11 (self-serve + trial). **Note:** free-tier limit enforcement is needed the moment self-serve free signups go live (step 11) — don't open public free signup without it, or someone adds 500 staff on a free org.

---

## Mission

Make the freemium model real: enforce free/paid **limits** in-app (works without Stripe) and let trials **convert to paid** via Stripe. [../PRICING.md](../PRICING.md) is the source of truth for every number here.

This is a large step — when un-gated it can be split into **12a (limit enforcement)** and **12b (Stripe billing)**.

---

## Before you start

1. Confirm Gate 2 open, step 11 `completed`. Final caps/legal items flagged "TBD" in [../PRICING.md](../PRICING.md) (AI metering, exact SMS caps) do **not** block this work.
2. [STATUS.md](./STATUS.md) row **12** → `in_progress`.

---

## Implement

### Part A — Plan-limit enforcement (in-app; Free needs no Stripe)
1. **Schema additions** for the device trial (not in schema yet): `deviceTrialStartedAt`, `deviceTrialExpiresAt`, `deviceTrialExtensionUsed`. Reuse existing `plan` / `subscriptionStatus` / `isDemo` / `trialEndsAt` columns; add a derived/stored `staffCount` source if needed for the operator console.
2. **Caps** ([../PRICING.md](../PRICING.md) § Plans):
   - **Free:** hard block at staff #11; soft block at location #3; 1 admin; 1 device slot.
   - **Plus:** soft warnings at 40/47 staff, hard at #51 → Pro; 2 admins, 1 device included.
   - **Pro:** up to **100** staff (soft warnings at 80/95); unlimited locations; 5 admins, 3 devices included.
3. **Device sync trial (Free):** 30-day live sync from first device connect; **one +30-day extension** if the org has **never published a roster** (`RosterWeek.status !== published` — see step 05). After trial: historical punches read-only, ingest paused, roster + manual attendance continue.
4. **Upgrade UX:** soft warnings before hard blocks; clear upgrade CTAs at each trigger ([../PRICING.md](../PRICING.md) § Upgrade triggers). No silent failures.
5. **Add-ons quantity logic:** extra device (+$5), extra admin (+$2), WhatsApp (+$5; included on Pro).

### Part B — Stripe billing
6. **Stripe keys on Vercel:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SIGNING_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; webhook → `/api/stripe/webhook`.
7. **Products/prices** matching [../PRICING.md](../PRICING.md) § Stripe SKU sketch (`srp_plus`, `srp_pro`, annual variants, device/admin/WhatsApp add-ons).
8. **Checkout / customer portal:** upgrade from Free/trial → subscribe; manage subscription. Free = no Stripe subscription (enforced in-app only).
9. **Status → access:** active/trialing → full; past_due/canceled → soft gate. Confirm mirror columns (`plan`, `mrrCents`, `currentPeriodEnd`, `subscriptionStatus`) populate from webhooks.

### Operator console
10. Surface (per [../PRICING.md](../PRICING.md) § Operator console): `staffCount` vs cap, location count vs free limit, device trial dates + extension used, plan + add-on quantities.

---

## Out of scope

- AI metering implementation (PRICING.md open item; counter is a later pass).
- In-console refunds/plan changes beyond deep-link to Stripe.
- Tax/invoicing customization; Enterprise SSO tier.

---

## Definition of done

- [ ] Free caps enforced (staff hard #11, location soft #3, 1 admin, 1 device) with upgrade CTAs
- [ ] Device sync trial (30-day + conditional extension) + post-trial read-only behavior works
- [ ] Plus/Pro caps + add-on quantities enforced
- [ ] Trial/Free → paid conversion works end to end via Stripe
- [ ] Webhooks populate billing mirror columns; access reflects subscription status
- [ ] Operator console shows limits, device trial, plan + add-ons
- [ ] [STATUS.md](./STATUS.md) row **12** → `completed`

**Do not commit unless user asks.**
