# Simple Roster Plus

An updated roster + attendance direction (ZKTeco / ADMS per product goals).

## Repository layout

| Path | Description |
|------|-------------|
| **Repo root** | Next.js app (App Router), Prisma, PostgreSQL — run `npm run dev` here. |
| `docs/PRODUCT_NOTES.md` | Timezone model (per-organization IANA) and multi-user roadmap. |
| `docs/DASHBOARD_RECOMMENDATIONS.md` | Home dashboard mock review, target UX, visual system, and build sequencing. |
| `SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md` | Notes ported from Shift Close for parity of domain concepts. |

### Quick start

1. Copy [`.env.example`](./.env.example) to `.env` and set **`DATABASE_URL`** and **`AUTH_SECRET`** (16+ characters).
2. `npm run db:generate` then **`npm run db:migrate`** (or `npm run db:push` while prototyping).
3. **`npm run db:seed`** — creates a demo org, admin user, sample staff, shift template, and holiday.
4. **`npm run dev`** — open [http://localhost:3000](http://localhost:3000), **Sign in** with `admin@demo.local` / `demo`, then open **Staff**.

Set the same env vars on **Vercel** (Production + Preview). Add **`AUTH_SECRET`** there or sign-in and protected routes will fail.

### “Environment variable not found: DATABASE_URL” (P1012)

Prisma needs **`DATABASE_URL`** on your machine before `db:migrate` / `db:seed` work.

1. In the **repo root** (same folder as `package.json`), create **`.env`** (or use **`.env.local`**).
2. Add your Neon URL, for example:  
   `DATABASE_URL="postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require"`
3. Add **`AUTH_SECRET=`** (16+ random characters) for login.
4. In PowerShell: **`copy .env.example .env`** then edit values.

Scripts **`npm run db:migrate`**, **`db:push`**, **`db:studio`**, and **`db:seed`** use `scripts/run-prisma.mjs`, which loads **`.env`** then **`.env.local`** (same pattern as Next.js) before calling Prisma, so `DATABASE_URL` in either file works.

`npm run db:generate` does not need a database URL.

### Optimization guardrails

- Keep local development pointed at a local, branch, or disposable database when possible. Avoid using the production `DATABASE_URL` as the default during day-to-day work.
- `scripts/run-prisma.mjs` and Next.js both treat **`.env.local`** as an override on top of **`.env`**. A blank or stale value in `.env.local` wins, so check both files when auth or database access breaks unexpectedly.
- Restart the dev server after env changes; auth and database settings are read at startup.
- Before and after performance-sensitive changes, review the database provider's compute/usage graph and smoke-test the heaviest paths: login, roster, attendance, staff, and requests.

For the current optimization baseline and rollout checklist, see [`docs/OPTIMIZATION_BASELINE.md`](./docs/OPTIMIZATION_BASELINE.md).

### Useful scripts

| Command | Purpose |
|--------|---------|
| `npm run db:seed` | Idempotent demo data (after migrate) |
| `npm run db:studio` | Prisma Studio |
