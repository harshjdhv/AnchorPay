# AnchorPay – Internal Master Spec

> **Single Source of Truth (SSOT)**
>
> This document combines **vision, scope, architecture, and phased execution** for AnchorPay.
> It is the *only* internal reference that should be followed by humans or AI when building the project.
>
> If something is not explicitly described here, it should **not** be built.

---

## 1. Project Intent

AnchorPay is a **Solana-native programmable escrow** that enables **milestone-based payments** between two known parties (client and freelancer).

The project exists to provide a **minimal, correct, non-custodial payment execution primitive** for:

* DAO grants
* Bounties
* Freelance work
* Contributor payments

AnchorPay is intentionally boring, deterministic, and limited in scope.

---

## 2. What AnchorPay Is

AnchorPay allows:

* A client to lock funds into an on-chain escrow
* Payments to be split into milestones
* Funds to be released only after milestone approval
* Cancellation to be blocked once work is submitted

Funds are held in a **Program Derived Address (PDA)** owned by the AnchorPay program.

---

## 3. What AnchorPay Is NOT (Strict Non‑Goals)

To prevent scope creep, AnchorPay explicitly does **not** include:

* ❌ Freelancer marketplace
* ❌ Job discovery or listings
* ❌ User profiles or reputation
* ❌ Notifications or emails
* ❌ Backend server or database
* ❌ Arbitration or dispute resolution
* ❌ Governance, DAO logic, or voting
* ❌ Subscriptions or recurring payments
* ❌ Tokens or incentives

If a feature requires any of the above, it is **out of scope**.

---

## 4. Actors

There are exactly two actors:

### Client (Payer)

* Creates escrow
* Locks funds
* Approves milestones
* Can cancel escrow *only before submission*

### Freelancer (Recipient)

* Submits milestone work
* Receives released funds

There are no admins, moderators, or privileged roles.

---

## 5. Core Mental Model

* **Escrow** = funds locked until rules are met
* **PDA** = program-controlled wallet (no private key)
* **Milestone** = unit of work + payment
* **State machine** = deterministic control flow

AnchorPay is fundamentally a **state machine that controls money**.

---

## 6. Milestone State Machine

Each milestone follows this strict progression:

```
Pending → Submitted → Approved → Released
```

### State Definitions

* **Pending**

  * Freelancer has not submitted work
  * Client may cancel escrow

* **Submitted**

  * Freelancer has submitted work
  * Escrow becomes non-cancelable

* **Approved**

  * Client has approved submitted work

* **Released**

  * Funds are transferred
  * Next milestone begins

There are no alternative paths or shortcuts.

---

## 7. Cancellation Rules (Critical)

Cancellation is allowed **only if**:

* Current milestone state is `Pending`

Cancellation is **blocked** if:

* Milestone is `Submitted`
* Milestone is `Approved`
* Any milestone has been released

Unreleased funds always return to the client.

---

## 8. On-Chain Architecture (Anchor)

### EscrowAccount (PDA)

Stores:

* Client public key
* Freelancer public key
* Token mint (None = SOL)
* Total escrow amount
* Vector of milestone amounts
* Current milestone index
* Current milestone state
* PDA bump

This account owns all locked funds.

---

## 9. Program Instructions

### `initialize_escrow`

* Called by client
* Creates escrow PDA
* Validates milestone amounts
* Transfers funds into escrow

### `submit_milestone`

* Called by freelancer
* Allowed only if state is `Pending`
* Transitions state → `Submitted`

### `approve_milestone`

* Called by client
* Allowed only if state is `Submitted`
* Transitions state → `Approved`

### `release_milestone`

* Called by client or freelancer
* Allowed only if state is `Approved`
* Transfers milestone funds
* Increments milestone index
* Sets next state → `Pending`

### `cancel_escrow`

* Called by client
* Allowed only if state is `Pending`
* Returns remaining funds
* Closes escrow account

---

## 10. Frontend Scope (Minimal UI)

The frontend exists **only** to exercise the contract.

### Required Screens

1. **Create Escrow**

   * Wallet connect
   * Milestone configuration
   * Fund deposit

2. **Escrow Detail Page**

   * Locked funds
   * Milestone list and states
   * Action buttons (submit / approve / release)

No dashboards, feeds, or discovery features.

---

## 11. Frontend Technology Decision

### Chosen Approach

* Simple web app
* Next.js
* Solana Wallet Adapter
* Anchor client (TypeScript)

### Explicitly Excluded

* Browser extensions
* Mobile apps
* Desktop apps
* Custom wallets

These add unnecessary complexity.

---

## 12. Repository Structure (Target)

```
anchorpay/
├── apps/
│   └── web/                 # Frontend
├── programs/
│   └── anchorpay/           # Anchor program
├── packages/
│   └── sdk/                 # Optional TS helpers
├── package.json
├── pnpm-workspace.yaml
├── turbo.json (optional)
└── README.md
```

---

## 13. Phase-by-Phase Execution Plan

### Phase 1 — Repo & Project Setup

**Goal:** Establish a clean, reproducible foundation.

#### Tasks

* pnpm monorepo configured
* `pnpm-workspace.yaml` set up
* Root `package.json` with scripts only
* Anchor program initialized at `programs/anchorpay`
* Local validator working
* `anchor build` and `anchor test` succeed

#### Explicit Non‑Goals

* No escrow logic
* No SOL transfers
* No UI changes

#### Exit Criteria

* Repo matches target structure
* All tooling works locally

---

### Phase 2 — Data Model & State Machine

**Goal:** Define escrow structure without moving money.

* `EscrowAccount` struct
* `MilestoneState` enum
* State transition logic
* Validation rules

No transfers in this phase.

---

### Phase 3 — SOL Escrow & Transfers

**Goal:** Lock and release SOL safely.

* SOL transfers into PDA
* Release logic
* Double-spend protection

---

### Phase 4 — Submission & Cancellation Safety

**Goal:** Prevent unfair cancellation.

* `submit_milestone`
* `cancel_escrow`
* State-based cancellation rules

---

### Phase 5 — Approval & Full Milestone Flow

**Goal:** Complete the milestone lifecycle.

* `approve_milestone`
* Multi-milestone looping
* Escrow completion

---

### Phase 6 — SPL Token (USDC) Support

**Goal:** Support non-SOL payments.

* Token mint handling
* ATA logic
* Token transfers

---

### Phase 7 — Minimal Web UI

**Goal:** Demonstrate usage.

* Create escrow UI
* Escrow detail view
* Submit / approve / release actions

---

### Phase 8 — Hardening & Documentation

**Goal:** Production readiness.

* Expanded tests
* Code comments
* README cleanup

---

### Phase 9 — Grant Readiness

**Goal:** External review preparation.

* Demo video
* Clear scope summary
* Grant milestones

---

## 14. Testing Requirements

Tests must cover:

* Escrow initialization
* Milestone submission
* Approval and release
* Cancellation allowed state
* Cancellation blocked state

Passing tests are the primary trust signal.

---

## 15. Guiding Principles (Never Break These)

* Simple > Clever
* Deterministic > Flexible
* On-chain only where required
* No human judgment in code
* No hidden state

---

## 16. Internal One‑Line Definition

> AnchorPay is a deterministic milestone escrow state machine that controls funds using program-owned accounts.

---

## 17. Authority

This document is the **authoritative reference** for AnchorPay.
Any deviation must be intentional and documented.
