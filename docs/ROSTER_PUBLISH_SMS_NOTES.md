# Roster publish & SMS/WhatsApp distribution — agent reference

**Status:** Product discussion captured 2026-05-30. Not implemented.
**Related:** [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`MVP_LAUNCH_READINESS.md`](./MVP_LAUNCH_READINESS.md) · [`../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md`](../SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md)

---

## Why this doc exists

Owner asked whether **publishing the roster to SMS** (or WhatsApp) would be a useful feature, especially for US users who often use text or WhatsApp instead of in-app views. This captures the discussion and recommended direction for future agent sessions.

---

## Current codebase state (as of 2026-05-30)

| Area | Status |
|------|--------|
| `RosterWeek.status` | Schema supports `draft` \| `published`; weeks default to `draft` on upsert |
| Publish UI / API | **Not wired** — roster page shows a "Published" badge when `status === "published"`, but there is no Publish button or route that sets status or sends notifications |
| SMS / WhatsApp / Twilio | **Not implemented** — no messaging provider integration in repo |
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

## Open questions (not decided)

- Opt-in collected at staff create, org-wide toggle, or both?
- Public unauthenticated "my schedule" link (tokenized URL) vs require employee login first?
- Notify on every publish vs only when shifts change after first publish?
- US-only TCPA copy and STOP flow vs generic international SMS?

---

## One-line summary for agents

> SMS roster **notifications** (personal shifts + link) fit the US market and SR+ positioning; SMS as the way to **read the full team roster** does not. Email first, SMS second, WhatsApp optional by market. Publish + notify is not built yet — only `draft`/`published` status exists in schema.
