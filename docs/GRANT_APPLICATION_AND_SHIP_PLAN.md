# TrustLock: Grant Application + Staged Ship Plan

## Goal
Secure a **$3,000 Superteam India / Solana Foundation India Grant** by showing strong proof-of-work without fully shipping the entire BRIEF scope upfront.

This document defines:
- What to show **before grant approval** (high signal, low burn)
- What to ship **with grant funding**
- What from `docs/BRIEF.md` is required for a real launch

---

## Current Status (Already Built)
- Wallet connection and wallet-signature auth
- Session-based protected dashboard
- Escrow creation UI/API
- Escrow funding UI/API
- Role-aware dashboard timeline (client/freelancer)

## Key Gap Right Now
- Escrow state is in-memory (not persistent, not on-chain)
- No end-to-end on-chain escrow lifecycle yet
- No submission/review/dispute/admin execution flow yet

---

## Strategy: Build "Grant-Worthy Progress", Not Full Product

### Why this strategy works
The grant page emphasizes:
- Proof-of-work over ideas
- Active links over concepts
- Fast execution with milestones

So we should ship a **tight alpha slice** that proves execution and ecosystem value, then request funding to finish the rest.

---

## What To Complete Before Applying (Pre-Grant Scope)

## 1) Ship a Credible Alpha Slice
Complete only these core pieces:
- `create_escrow` flow
- `fund_escrow` flow
- `submit_work` flow (basic)
- `release_payment` flow (basic happy path)

Do **not** build full dispute/admin/timeout automation yet.

## 2) Replace In-Memory Store
Move escrow records to a real DB (minimal Prisma + Postgres schema), including:
- escrow id
- client/freelancer wallets
- amount/token
- status
- tx signatures / links
- timestamps

This makes demo links and product feedback believable.

## 3) Add Minimal On-Chain Truth
Integrate basic Solana program interactions for the above 4 flows (devnet is fine).
The app can still be rough, but transactions must be real and verifiable.

## 4) Produce Reviewer Assets
- Live demo URL
- Public repo
- 2–4 minute demo video
- 1-page milestones + budget
- Evidence of user feedback (even 3–5 calls with notes)

---

## What To Explicitly Defer Until After Grant
- Full dispute system UX and arbitration tooling
- Admin panel with resolution actions
- Auto-release scheduler/keeper logic
- Notification system (email/in-app)
- Mobile app
- Reputation layer and profiles

This keeps scope realistic and preserves funded milestones.

---

## BRIEF Mapping: Ship-Critical vs Deferred

## Must-Have For "Actually Shippable v1"
From `BRIEF.md`, these are required to claim a real usable escrow MVP:
- Escrow creation
- Escrow funding
- Work submission proof
- Client approval/rejection action
- Payment release
- Basic persistence + history
- Role-based authorization checks

## Required For "Full BRIEF MVP" (Can Be Post-Grant)
- Dispute creation flow
- Admin dispute resolution panel
- Auto-release after inactivity window
- End-to-end timeline completion states in UI

## Future (Not Needed for Grant Alpha)
- Milestones payments
- Reputation system
- Public profiles
- AI dispute assistance
- Mobile app

---

## Recommended $3,000 Milestone Plan

## Milestone 1 — $1,000
- On-chain + app integration for:
  - create escrow
  - fund escrow
- Devnet tx verification and test coverage for core state transitions

## Milestone 2 — $1,200
- Submit work + release payment flows
- Persistent DB-backed escrow history
- Escrow detail page showing tx/state history

## Milestone 3 — $800
- Open-source docs + SDK helper methods
- Demo walkthrough, public changelog, and weekly progress updates

---

## What We Should Say in the Application
- We are **not** asking funds to start from zero.
- We already shipped a working alpha shell and will use the grant to complete verifiable on-chain escrow lifecycle milestones.
- We are deliberately sequencing scope to maximize execution speed and accountability.

---

## Execution Rule
If a feature does not increase:
1. proof-of-work quality,
2. demo credibility, or
3. milestone measurability,

it should be deferred until after grant approval.

