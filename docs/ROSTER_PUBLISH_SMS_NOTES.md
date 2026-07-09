# Roster publish & SMS/WhatsApp distribution — agent reference

**Status:** Product discussion captured 2026-05-30; owner decisions Jul 2026. Automated send not implemented; manual publish + share (step 05) shipped.
**Related:** [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`MVP_LAUNCH_READINESS.md`](./MVP_LAUNCH_READINESS.md) · [`../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md`](../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md)

---

## Why this doc exists

Owner asked whether **publishing the roster to SMS** (or WhatsApp) would be a useful feature, especially for US users who often use text or WhatsApp instead of in-app views. This captures the discussion and recommended direction for future agent sessions.

---

## Current codebase state (as of 2026-05-30)

| Area | Status |
|------|--------|
| `RosterWeek.status` | Schema supports `draft` \| `published`; weeks default to `draft` on upsert |
| Publish UI / API | **Shipped (step 05)** — publish/unpublish API + share token link; **no automated notifications** on publish yet |
| SMS / WhatsApp / Twilio | **WhatsApp v1 shipped (Jul 2026)** — Twilio send on publish, opt-in, caps; SMS/email still out |
| Shift Close handoff | Explicitly deferred **WhatsApp roster broadcast** for SR+ v1 (`SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md` §9) |
| Staff contact data | `Staff.contactNumber` and optional `Staff.email` already exist (staff CRUD captures both) |
| Product filter | [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) favors **alerts, summaries, and AI guidance** over heavy broadcast workflows |

**Truth sources if this doc drifts:** `prisma/schema.prisma` (`RosterWeek`, `Staff`), `app/(authenticated)/roster/`, `app/api/roster/**`.

---

## Market context: US vs Caribbean / primary market

- **US:** SMS is nearly universal; managers and hourly staff often share schedules via **group text** or spreadsheet. WhatsApp is common in some communities but is **not** the default "everyone has it" channel the way it is in the Caribbean, Latin America, and much of Europe.
- **SR+ primary market (per product notes):** Caribbean — WhatsApp group chats for rosters are a real pain point (also reflected in `landing-page/MAPPING.md` problem copy).
- **Same underlying problem, different app:** disconnected schedule sharing (WhatsApp / SMS / paper / spreadsheet) vs attendance in another system.

---

## Is "publish roster to SMS" a thing?

**Yes — but as personal notifications, not a full-grid blast.**

### What tends to work

1. **Personal schedule SMS** — on publish, each staff member gets *their* shifts for the week (short, readable; one or a few messages).
2. **Manager summary** — e.g. "Week of Jun 2 published — 12 staff, 3 gaps" plus a link to the full roster.
3. **Change alerts** — after initial publish, notify only people whose shifts changed (high value, lower cost and annoyance).

### What is harder / usually wrong

- **Full roster grid via SMS** — unreadable on phones, expensive (long/multi-segment messages), and staff typically only want their own line.
- **US compliance (TCPA)** — business SMS needs opt-in, STOP handling, and usually a provider (Twilio, etc.) rather than the manager's personal number.
- **Cost** — per-message pricing; weekly blast to whole team adds up unless messages are targeted (personal schedule or changes only).

---

## Recommended channel priority (product direction from discussion)

1. **Email** — cheapest; staff email already on model; good for "here's your week" + link.
2. **SMS** — strongest US fit for **personal schedule** or **change alerts** to `contactNumber` (opt-in per staff).
3. **Link to read-only view** — "my schedule" page even before full employee self-service login (see employee-facing plans in `PRODUCT_NOTES.md`).
4. **WhatsApp** — defer unless explicitly serving markets where it is already the norm; can later share Twilio WhatsApp API with SMS if one provider is chosen.

**Not recommended as v1 default:** replacing WhatsApp group chaos with an SMS group blast of the entire grid.

---

## Suggested v1 publish flow (if built later)

```
Publish click
  → set RosterWeek.status = published (and optionally lock editing rules)
  → for each staff on roster (with opt-in):
       email: personal weekly summary + link (if email present)
       SMS: personal weekly summary + link (if contactNumber + smsOptIn)
  → optional manager notification: summary counts + link
```

**Out of scope for v1 unless requested:** full roster PDF/image to SMS, WhatsApp group broadcast, two-way SMS replies.

---

## Alignment with SR+ product positioning

From `PRODUCT_NOTES.md`:

- Favor work that helps managers **schedule faster** and staff **see their schedule with less chase-down**.
- Prefer **alerts and summaries** over heavy workflows.
- Employee self-service (`/me`, staff submits leave) is planned foundation — publish notifications should feed that same model (staff linked via future `Staff.appUserId`).

Good framing: **"Notify staff when the week is published (their shifts only)"** — not **"SMS the entire roster to everyone."**

---

## Implementation hints for future agents

- **Schema gaps to consider:** per-staff `smsOptIn` / `emailOptIn`, notification log for idempotency (Shift Close used `AppSettings` keys in `present-absence-notify.ts` — not ported to SR+ yet).
- **Provider:** Twilio is the usual US starting point for SMS; WhatsApp Business API is heavier setup.
- **RBAC (from handoff):** supervisor-like roles should not send roster broadcasts — mirror `apiWriteAllowedForRole` when routes exist.
- **MVP scope fence:** [`MVP_LAUNCH_READINESS.md`](./MVP_LAUNCH_READINESS.md) lists WhatsApp roster broadcast as optional / post-MVP parity with Shift Close.

---

## Owner decisions (Jul 2026)

### Manual share vs automated send (two lanes)

| Lane | Who acts | Opt-in? | Plan cap? |
|------|----------|---------|-----------|
| **Manual share** | Manager copies link, print, or opens share on phone/browser | **No** — manager chooses the channel (WhatsApp group, SMS, etc.) | No |
| **Automated send** | App sends via Twilio on publish (step 13) | **Yes** — org + per-staff (below) | Yes — [`PRICING.md`](./PRICING.md) |

Manual share is the free/default path (step 05). Automated WhatsApp is the paid add-on / Pro feature.

### Opt-in model — **both** (org + per-staff)

Automated WhatsApp sends only when **all** are true:

1. Org on **Plus + WhatsApp add-on** or **Pro**
2. Org setting **`messagingWhatsappEnabled`** (or equivalent) is on
3. **`Staff.whatsappOptIn`** is true for that person
4. Valid **`Staff.contactNumber`**
5. Under monthly WhatsApp cap

Default **`whatsappOptIn` = false**. Manager enables per staff on create/edit.

### Staff create/edit copy (WhatsApp opt-in)

Use plain language. **Do not** include “Message and data rates may apply” — Caribbean users read that as a hidden charge and trust drops.

**Checkbox label (example):**

> **WhatsApp schedule alerts** — Send my shifts to this number when the weekly roster is published.

**Helper text (optional):**

> Staff can be removed from alerts anytime by turning this off.

Opt-out on WhatsApp: manager unchecks the box (no STOP keyword; that is SMS/TCPA when SMS ships).

### Still open (owner)

- Tokenized public "my schedule" link vs full-week share link vs employee login
- Notify on every publish vs changes-only after first publish
- US SMS: TCPA copy + STOP flow (defer until SMS channel ships)

---

## One-line summary for agents

> Manual roster share (link/print) is unlimited and needs no opt-in. Automated WhatsApp (step 13) needs **org toggle + per-staff opt-in**, utility templates, Twilio, and plan caps. Personal shifts + link only — never full-grid blast.
