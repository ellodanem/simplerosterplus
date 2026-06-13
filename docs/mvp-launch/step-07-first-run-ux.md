# Step 07 — First-run UX polish

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 02 (so you can create a truly empty org to test against) and step 05 (publish/share UI exists to polish).

---

## Mission

A brand-new org with zero data should look **intentional and inviting**, not broken. And a manager glancing at Home or the roster on a phone should be able to read it. First impressions decide whether a tester keeps going.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **07** → `in_progress`.
2. Create a fresh empty org (step 02) and walk it as a new user would.

---

## Implement

1. **Empty states.** Audit Home (`app/(authenticated)/page.tsx`), Roster, Attendance, Staff, Devices with no data. Replace any bleak "0 / undefined / blank table" with a short helpful prompt that points to the next action (e.g. "No staff yet — add your team" → link). Keep it calm and on-brand (emerald/zinc). See [../DASHBOARD_RECOMMENDATIONS.md](../DASHBOARD_RECOMMENDATIONS.md) for Home intent.
2. **Setup → first value path.** Confirm the journey "sign in → `/setup` → add template/role/staff → build first week → publish/share" has no dead ends or confusing jumps.
3. **Mobile/tablet sanity.** Not pixel-perfect — just usable: Home cards stack, nav works, the roster grid is scrollable/readable, modals fit, the shared read-only view reads well on a phone. Fix the worst breakages only.
4. **Copy honesty.** Make sure no in-app text promises features we don't have (e.g. generative AI). "Summary" language is fine.

---

## Out of scope

- Full responsive redesign of the roster grid.
- Onboarding tour / coach marks.
- Theming / dark mode.

---

## Definition of done

- [ ] Empty org looks intentional on Home, Roster, Attendance, Staff, Devices
- [ ] New-user path from setup to first published week has no dead ends
- [ ] Home, roster, and the shared view are usable on a phone
- [ ] No over-promising copy in-app
- [ ] [STATUS.md](./STATUS.md) row **07** → `completed`

**Do not commit unless user asks.**
