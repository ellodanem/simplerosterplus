# Step 05 — Organization public app URL (ADMS base)

**Status:** See [STATUS.md](./STATUS.md).

**Depends on:** Step 01 `completed`. **Skip** if step 01 already documented env-only URL and user accepts one URL per deployment.

---

## Mission

Shift Close stores **`AppSettings.public_app_url`** for hyphen-free hostname and ADMS pairing copy. SR+ may rely only on `VERCEL_URL` / `APP_URL` — this step adds an **org-level override** when you need correct pairing text on production (custom domain, staging vs prod).

---

## Before you start

1. [STATUS.md](./STATUS.md) row **05** → `in_progress`.
2. Read step 01 notes in [STATUS.md](./STATUS.md) — if public URL is env-only, mark this step `completed` with note “skipped — env sufficient” or implement override.

---

## Implement

1. Store per-org public base URL (`AppSetting` key or `Organization` field — match existing SR+ patterns).
2. **`lib/public-url.ts`** (or extend) — resolve: org setting → env → request headers.
3. Devices pairing UI + smoke doc use resolved URL.
4. Validation: no trailing slash; warn on hyphens in hostname (Shift Close keypad note).

---

## Definition of done

- [ ] Operator can set URL once per org; pairing card shows correct push/poll URLs
- [ ] Documented in `docs/DEVICE_INGEST_SMOKE.md`
- [ ] [STATUS.md](./STATUS.md) row **05** → `completed` or `completed` with “skipped” note

**Do not commit unless user asks.**
