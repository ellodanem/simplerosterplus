# Mobile strategy — outline for exploration

**Status:** Draft outline (Jul 2026). Not approved — use this as the brief for a dedicated agent/session.

**Product lens:** Managers schedule weekly and share rosters fast. Staff may need self-service later. Attendance review stays desktop-first for now.

**Related:** [`PRODUCT_NOTES.md`](./PRODUCT_NOTES.md) · [`PRICING.md`](./PRICING.md) · [`ROSTER_PUBLISH_SMS_NOTES.md`](./ROSTER_PUBLISH_SMS_NOTES.md) · [`mvp-launch/step-13-roster-notifications.md`](./mvp-launch/step-13-roster-notifications.md) · [`AGENT_CONTEXT_GTM_AUTH_PRICING.md`](./AGENT_CONTEXT_GTM_AUTH_PRICING.md)

---

## 1. Reality check

| Surface | Likely primary device | Why |
|---------|----------------------|-----|
| Roster build / edit | Desktop or tablet | Grid density, copy week, templates |
| Attendance review, punch log, reports | **Desktop** | Wide tables, corrections, exports |
| Publish & share roster | **Mobile** | WhatsApp/SMS handoff, quick link copy |
| Glance at “who’s on today” | Mobile | Manager between tasks |
| Staff: request leave, see my shifts | Mobile (if we build `/me`) | “Download the app” expectation |

**Implication:** We probably need **two tracks**, not one “make everything mobile” project:

1. **Manager mobile** — share, notify, light scheduling, home summary.
2. **Staff mobile** — optional employee portal (requests, my schedule, maybe hours).

---

## 2. Strategic fork (decide early)

### Option A — Mobile-friendly web (responsive PWA)

- Extend existing Next.js app: breakpoints, touch targets, simplified mobile views.
- Optional: installable PWA (home screen icon, offline-lite for read-only share pages).
- **Pros:** One codebase, ships with current stack, Clerk auth already there, faster iteration.
- **Cons:** App-store presence weak; push notifications harder; “download the app” marketing is fuzzier.

### Option B — Native or hybrid app (React Native, Expo, Capacitor wrapper)

- **Pros:** App Store / Play Store, push, biometric login, stronger “download our app” story for staff.
- **Cons:** Second surface to maintain; auth, API, and release cadence multiply cost.

### Option C — Phased hybrid

1. **Phase 1:** Responsive web + killer mobile flows (share, home, read-only roster link).
2. **Phase 2:** Staff `/me` on web, mobile-optimized.
3. **Phase 3:** Native shell or RN **only if** design partners demand store listing / push.

**Recommendation to explore:** Start with **Option C** unless a pilot customer blocks on app-store presence.

---

## 3. User stories to size (by persona)

### Manager (existing admin login)

- [ ] Copy published roster link and drop into WhatsApp in &lt;30 seconds from phone.
- [ ] See today’s coverage / exceptions without horizontal scroll hell.
- [ ] Approve or deny a leave request from notification or inbox (when requests ship on mobile).
- [ ] Quick tweak: move one shift, not full grid surgery (stretch goal).
- [ ] Optional: trigger roster publish + WhatsApp/SMS (step 13 / paid add-on).

### Staff (future — not in Gate 1 MVP)

- [ ] “Download the app” → sign in → see **my** shifts this week.
- [ ] Submit vacation / day-off request; see status.
- [ ] See hours or attendance summary (scope TBD — payroll-adjacent, keep light).
- [ ] No access to full roster grid or other people’s data.

### Operator / support

- No mobile requirement for v1.

---

## 4. What we already have (inventory)

- Responsive Tailwind layout exists but **not audited** for manager-on-phone (step 07 was a sanity pass, not full mobile UX).
- **Publish + share link** (`/share/roster/[token]`) — candidate for mobile-first read-only view.
- **Requests inbox** — manager UI; staff submit path may be admin-only today.
- **Clerk** — works on mobile browsers; app deep links need design if native later.
- **No employee `/me` portal** — documented as future in `PRODUCT_NOTES.md` / GTM docs.
- **Step 13** — automated WhatsApp/SMS on publish; separate from “mobile app” but central to mobile *sharing*.

---

## 5. Workstreams (for a dedicated agent)

### 5.1 Mobile audit (web)

- Page-by-page: Home, Roster, Staff, Attendance, Devices, Settings, `/setup`, share page.
- Classify: **mobile-OK** | **mobile-degraded** | **desktop-only** (hide or redirect with honest copy).
- Core Web Vitals + touch target pass (44px, no hover-only actions).

### 5.2 High-impact mobile slices (manager)

- Home dashboard mobile layout.
- Roster: read-only week view on small screens vs edit mode on desktop?
- Share flow: one-tap copy link + `whatsapp://` or `https://wa.me/?text=` prefilled message.
- Leave/request notifications entry point (when built).

### 5.3 Staff self-service (`/me`) — product decision

- Auth model: Clerk member linked to `Staff.appUserId` (per GTM doc phase 3).
- Minimum v1: my shifts + request leave.
- Explicit **OUT**: full HR, payslips, clock-in from phone (unless product expands).

### 5.4 Native app decision packet

- When triggers fire: N customers ask for App Store, push for shift reminders, offline need.
- Build vs buy: Expo + existing API vs Capacitor wrap vs true greenfield.
- Clerk mobile SDK, Stripe billing on mobile (if staff never pay, lower priority).

### 5.5 WhatsApp / messaging (ties to step 13)

- Personal schedule links vs in-chat formatted text.
- Opt-in, STOP, caps per `PRICING.md` — legal before engineering.
- Mobile web is the **composer**; WhatsApp is the **delivery channel**.

---

## 6. Non-goals (keep scope honest)

- Rebuilding attendance grid as a mobile-first spreadsheet.
- Full offline roster editing sync.
- Replacing ZKTeco device admin on phone.
- Enterprise MDM / kiosk modes.

---

## 7. Open questions for the exploration session

1. **First mobile persona:** managers only, or managers + staff in one release?
2. **“Download the app”:** PWA install prompt enough, or hard requirement for store apps?
3. **Staff auth:** magic link, Clerk invite, or SMS OTP tied to `Staff.contactNumber`?
4. **Roster edit on phone:** required for v1 mobile, or read + share + approve requests only?
5. **Markets:** Caribbean WhatsApp-heavy — does that prioritize share message format over native app?
6. **Pricing:** staff logins counted toward admin caps today — staff `/me` may need tier review.

---

## 8. Suggested sequencing (draft)

| Phase | Focus | Depends on |
|-------|--------|------------|
| **M0** | Mobile audit + fix critical breakpoints | — |
| **M1** | Manager: Home + share/WhatsApp handoff + published roster read view | step 05 done |
| **M2** | Manager: requests inbox usable on phone | requests v1 |
| **M3** | Staff `/me` web (shifts + leave request) | Clerk + `Staff.appUserId` |
| **M4** | Step 13 notifications + mobile-optimized message templates | Stripe/WhatsApp provider |
| **M5** | Native app evaluation / pilot | M3 feedback |

---

## 9. Artifacts to produce in the next agent

- [ ] Mobile audit checklist with per-route grades.
- [ ] Wireframe or bullet UX for “share to WhatsApp” happy path.
- [ ] Decision doc: PWA vs native (one-pager with recommendation).
- [ ] Staff `/me` scope fence (IN/OUT) aligned with positioning rules.
- [ ] Optional: `mvp-launch/step-14-mobile.md` if we add to the launch playbook.

---

*Next step: open a new agent with “Implement M0 audit per docs/MOBILE_STRATEGY.md” or “Decide PWA vs native per §2”.*
