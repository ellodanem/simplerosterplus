# Simple Roster Plus

An updated roster + attendance direction (ZKTeco / ADMS per product goals).

## Repository layout

| Path | Description |
|------|-------------|
| **Repo root** | Next.js app (App Router), Prisma, PostgreSQL — run `npm run dev` here. |
| `docs/PRODUCT_NOTES.md` | Timezone model (per-organization IANA) and multi-user roadmap. |
| `SIMPLE_ROSTER_PLUS_SOURCE_HANDOFF.md` | Notes ported from Shift Close for parity of domain concepts. |

### Quick start

1. Copy [`.env.example`](./.env.example) to `.env` and set `DATABASE_URL`.
2. `npm run db:generate` then `npm run db:migrate` or `npm run db:push`.
3. `npm run dev`.
