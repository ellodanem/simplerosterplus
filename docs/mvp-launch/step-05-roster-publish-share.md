# Step 05 — Roster publish & share

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 02 recommended (a real org to publish from). This completes the **core product loop** — don't ship outreach without it.

---

## Mission

A manager builds a week — then what? Right now there is **no way to publish or share it**. The schema has `RosterWeek.status` (`draft` | `published`) and the page shows a "Published" badge, but there is **no Publish button, no API that sets status, and no way for staff to see their shifts** (only admins log in for Gate 1). Close this loop with a real **Publish** action plus a **shareable read-only output** the manager can drop into their existing WhatsApp/SMS group or print.

This is the MVP slice only. Automated SMS/WhatsApp/email notifications are **out** here — see step 13 and [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md).

**Pricing interplay ([../PRICING.md](../PRICING.md)):** the manual link/print share you build here is the **free-tier** way to distribute a roster; **SMS/WhatsApp publish is a paid feature** (step 13). Also, `RosterWeek.status === published` later becomes a **billing signal** — the Free device-trial extension is only offered to orgs that have *never* published — so make sure Publish sets the status reliably and durably.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **05** → `in_progress`.
2. Read [../ROSTER_PUBLISH_SMS_NOTES.md](../ROSTER_PUBLISH_SMS_NOTES.md) (direction + what NOT to build) and confirm the open questions in §"Open questions" that affect the share surface with the owner if they block you.

---

## Implement

1. **Publish action + API.** Add a **Publish** button to the roster week (`app/(authenticated)/roster/`). Route sets `RosterWeek.status = published`, scoped to the org/location, respecting existing week-lock rules. Support **re-publish** (after edits) and **unpublish / back to draft** with a clear confirmation. Keep it org-isolated (ties to step 01).
2. **Shareable read-only output.** Give the manager something to share into the channel they already use:
   - Preferred: a **tokenized public read-only link** to the week (unguessable token, no login) showing the published grid; safe to paste into a group chat.
   - And/or a **print-friendly / export** view (clean print CSS or PDF/image) so the manager can share a tidy grid.
   - Decide token scope/expiry with the owner if unclear (whole-week read-only is the simple default).
3. **Gap awareness before sharing.** Surface unfilled cells / coverage gaps at publish time so the manager doesn't broadcast an incomplete week unknowingly (reuse Home "open shifts" logic where possible).
4. **Reflect state.** Home and the roster header should clearly show published vs draft and expose the share link/print action.

---

## Out of scope

- Automated email/SMS/WhatsApp delivery (step 13).
- Per-staff opt-in, TCPA/STOP handling, messaging providers (step 13).
- Two-way replies / shift acknowledgement.
- Employee login / `/me` self-service (future).

---

## Definition of done

- [ ] Manager can Publish a week (status persists, org-scoped, respects locks)
- [ ] Re-publish and unpublish/back-to-draft work with confirmation
- [ ] A read-only shareable link **or** print/export of the week works and is safe to share
- [ ] Coverage gaps are visible before/at publish
- [ ] Published vs draft is clear on Home and the roster
- [ ] [STATUS.md](./STATUS.md) row **05** → `completed`

**Do not commit unless user asks.**
