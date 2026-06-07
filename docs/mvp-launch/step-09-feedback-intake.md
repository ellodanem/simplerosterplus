# Step 09 — Feedback & support intake

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** None.

---

## Mission

Before testers arrive, have a simple, reliable way for them to reach us and for us to triage. The whole point of design partners is feedback — capture it, don't lose it.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **09** → `in_progress`.

---

## Implement

Keep this lightweight — no helpdesk platform required for a handful of testers.

1. **A channel testers use.** Decide and wire one: a support email, a "Send feedback" link in the app footer/nav (mailto or small form), or a shared inbox. Whatever it is, make sure it actually reaches a person.
2. **Triage home.** Pick one place where feedback/bugs get logged and prioritized (a simple list/issue tracker). Document where it lives so future agents and the owner check the same spot.
3. **Operator visibility.** Confirm that when a tester reports an issue, we can investigate via the operator console (Org 360 + read-only impersonation) without asking them for screenshots of everything.
4. **Document** the intake → triage → fix loop in a short `feedback-loop.md`.

---

## Out of scope

- In-app live chat / NPS surveys.
- Public status page.
- Automated ticketing.

---

## Definition of done

- [ ] A working way for testers to contact us (verified end to end)
- [ ] One agreed place where feedback/bugs are tracked
- [ ] Operator console confirmed sufficient to investigate a reported issue
- [ ] `feedback-loop.md` written
- [ ] [STATUS.md](./STATUS.md) row **09** → `completed`

**Do not commit unless user asks.**
