# Step 08 — Marketing site launch-ready

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** None (parallel with Phase 1).

---

## Mission

Make the landing page truthful, conversion-clear, and contactable so outreach has somewhere to send people. The offer is now decided — **freemium self-serve** per [../PRICING.md](../PRICING.md) ("Free up to 10 staff… then $19.99/mo"), superseding the older "request a setup quote" copy. Today the contact form uses a demo `alert()`, and the CTA needs to land on the freemium message.

---

## Before you start

1. [STATUS.md](./STATUS.md) row **08** → `in_progress`.
2. Read [../PRICING.md](../PRICING.md) (offer + landing one-liner) and [../../landing-page/MAPPING.md](../../landing-page/MAPPING.md) (page architecture + cut list). The remaining call (see [../MVP_LAUNCH_READINESS.md §7](../MVP_LAUNCH_READINESS.md)): during Phase 1, does **"Start Free"** capture a **waitlist / early-access** (self-serve signup is Gate 2), or do we hold launch until Gate 2 is live?

---

## Implement

1. **Wire the contact form.** Replace the demo `alert()` so submissions reach a real inbox/endpoint (a form service or a simple API route + email is fine). Confirm a test submission arrives.
2. **CTA consistency.** Apply the owner's offer decision across header, hero, setup-paths, closing band, footer (one label everywhere). Update `SRP_APP_SIGNUP_URL` / `SRP_APP_LOGIN_URL` targets to match.
3. **Truthful copy pass.** Remove over-promises (esp. generative "AI" — keep "fast and simple / summary"). Align claims with shipped features; no fake testimonials/logos (use the interim "what setup includes" block per MAPPING).
4. **SEO baseline.** Set `<title>`, meta description (canonical mission sentence), OG/Twitter tags, favicon, `lang`. One natural keyword mention, not stuffing.
5. **Legal links live.** Point footer Privacy/Terms to `privacy.html` / `terms.html`; flag to owner for a wording review.
6. **Domain.** Surface the owner's domain decision (buy `simplerosterplus.com` vs stay on Vercel) and update canonical URLs/OG accordingly.

---

## Out of scope

- Analytics / conversion tracking (MAPPING Step 10 — later).
- Blog / content SEO program.
- A/B testing.

---

## Definition of done

- [ ] Contact form delivers a real submission (verified)
- [ ] Single consistent CTA matching the chosen offer model
- [ ] No over-promising or fake social proof
- [ ] SEO meta + OG + favicon present; canonical URL set
- [ ] Privacy/Terms linked
- [ ] [STATUS.md](./STATUS.md) row **08** → `completed`

**Do not commit unless user asks.**
