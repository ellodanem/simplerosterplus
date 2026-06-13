# Step 04 — Graceful error handling

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** None.

---

## Mission

A tester hitting an error should see a clean, calm message — never a Next.js stack trace, a raw 500, or a blank screen. This is about not looking broken in front of the first real users.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **04** → `in_progress`.

---

## Implement

1. **App-level error & not-found UI.** Ensure `app/error.tsx`, `app/not-found.tsx` (and a `global-error.tsx` if missing) exist with on-brand, friendly copy and a path back to Home/Login. Add route-group error boundaries for `(authenticated)` if a failure there currently bubbles raw.
2. **API responses.** Spot-check that route handlers return structured JSON errors (`{ error: "..." }`) with sane status codes, and never leak internals (Prisma error text, stack traces) to the client. Wrap risky handlers so unexpected throws become a generic 500 JSON, with the detail logged server-side only.
3. **Targeted manual checks** — confirm clean handling for:
   - Invalid roster save / locked-week write.
   - Expired or missing session (redirect to login, not a crash).
   - ADMS/`/iclock` callback with malformed payload (must not 500-loop the device).
   - A 404 on a guessed tenant resource (ties to step 01).
4. **Note** any deeper issues found for a follow-up; fix the user-facing ones now.

---

## Out of scope

- Full observability / error monitoring service (nice later, not required for Gate 1).
- Retry/queue logic for ingest.

---

## Definition of done

- [ ] `error.tsx` / `not-found.tsx` (+ global) present and on-brand
- [ ] No raw stack traces or internal error text reach users on the checked paths
- [ ] Malformed device callback does not crash/500-loop
- [ ] Expired session redirects cleanly
- [ ] [STATUS.md](./STATUS.md) row **04** → `completed`

**Do not commit unless user asks.**
