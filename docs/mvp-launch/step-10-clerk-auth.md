# Step 10 — Clerk auth + tenant provisioning (Gate 2)

**Status:** See [STATUS.md](./STATUS.md). **Starts `blocked`** — do not begin until the owner opens Gate 2.

**Depends on:** Phase 0 + Phase 1 complete, and explicit owner go-ahead.

---

## Mission

Replace custom tenant JWT auth with Clerk so cold/SEO traffic can sign up and into their own org without us provisioning by hand. This is the foundation for self-serve. Keep `AppUser`/`Organization` as the source of truth; link Clerk IDs.

---

## Before you start

1. Confirm the owner has **opened Gate 2** (steps 01–09 done; decision recorded).
2. [STATUS.md](./STATUS.md) row **10** → `in_progress`.
3. Read [../AGENT_CONTEXT_GTM_AUTH_PRICING.md](../AGENT_CONTEXT_GTM_AUTH_PRICING.md) §1–2 and §6 (build order) — that doc is the spec for this work.

---

## Implement (per GTM doc)

1. Clerk foundation: `clerkMiddleware`, SignIn/SignUp UI, scoped to the tenant host.
2. Schema links: `Organization.clerkOrgId`, `AppUser.clerkUserId`, `AppUser.role` (owner/admin/member). Keep audit FKs on `AppUser.id`.
3. Provisioning webhooks (`organization.created`, `user.created`, `organizationMembership.created`) → create/update Org + default Location + AppUser.
4. Retire custom tenant auth pieces the GTM doc lists as replaced (custom `/login` password flow, `PasswordResetToken`) — only after Clerk path is verified.
5. Keep operator console on its own auth for now (separate Clerk app is a later step).

---

## Out of scope

- Operator-plane Clerk + MFA (separate future step).
- Stripe / pricing (step 12).
- Employee self-service `/me`.

---

## Definition of done

- [ ] New user can sign up via Clerk and land in a provisioned org
- [ ] `clerkOrgId` / `clerkUserId` linked; audit FKs intact
- [ ] `/setup` go-live gates still enforced post-Clerk
- [ ] Custom tenant auth retired cleanly (no broken `/login`)
- [ ] [STATUS.md](./STATUS.md) row **10** → `completed`

**Do not commit unless user asks.**
