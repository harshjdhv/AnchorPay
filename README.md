# TrustLock

TrustLock is a Solana-first freelance escrow app built as a Turborepo monorepo.

Current shipped lifecycle:
- Create escrow
- Fund escrow
- Submit work proof
- Approve and release payment

All escrow state is persisted with Prisma on Postgres (recommended: Supabase).

## Stack
- Next.js App Router (`apps/web`)
- Solana Wallet Adapter (Phantom, Solflare, Backpack)
- Wallet-signature auth (nonce + signed message)
- Prisma ORM + Postgres

## Local Setup
1. Install deps:
```bash
pnpm install
```

2. Configure env:
```bash
cp apps/web/.env.example apps/web/.env.local
```

3. Fill Supabase/Postgres credentials in `apps/web/.env.local`:
- `DATABASE_URL` (pooled)
- `DIRECT_URL` (direct)
- `AUTH_JWT_SECRET`

4. Generate Prisma client and push schema:
```bash
pnpm --filter web prisma:generate
pnpm --filter web prisma:push
```

5. Start app:
```bash
pnpm --filter web dev
```

## Supabase Notes
- Use pooled URL for app runtime (`DATABASE_URL`) for stable serverless connections.
- Use direct URL (`DIRECT_URL`) for schema migrations / `db push`.

## Useful Commands
```bash
pnpm --filter web typecheck
pnpm --filter web lint
pnpm --filter web prisma:migrate
```
