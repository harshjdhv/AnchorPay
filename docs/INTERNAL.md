# AnchorPay – Internal Engineering README

> **Internal reference document**
>
> This document defines the *exact scope, architecture, and build phases* for AnchorPay.
> It exists to:
>
> * Keep the project intentionally simple
> * Prevent scope creep
> * Act as a single source of truth for humans and AI
> * Guide development end-to-end

This is **not** a marketing document and **not** a grant-facing README.

---

## 1. Project Intent

AnchorPay is a **Solana-native programmable escrow** that enables **milestone-based payments** between two known parties (client and freelancer).

The system is intentionally designed as:

* A *payment execution primitive*
* A *non-custodial on-chain escrow*
* A *minimal shared UI*

AnchorPay does **not** attempt to solve human disputes, work quality, or discovery.

---

## 2. What AnchorPay Is

AnchorPay allows:

* A client to lock funds into an on-chain escrow
* Payments to be split into milestones
* Funds to be released only after milestone approval
* Cancellation to be blocked once work is submitted

Funds are held in a **Program Derived Address (PDA)** owned by the AnchorPay program.

---

## 3. What AnchorPay Is NOT (Strict Non-Goals)

To prevent over-engineering, AnchorPay explicitly does **not** include:

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

There are no admins or moderators.

---

## 5. Core Concepts (Mental Model)

* **Escrow** = funds locked until rules are met
* **PDA** = program-controlled wallet
* **Milestone** = unit of work + payment
* **State machine** = deterministic control flow

AnchorPay is a state machine that controls money.

---

## 6. Milestone State Machine

Each milestone follows this strict progression:

```
Pending → Submitted → Approved → Released
```

### State Rules

* `Pending`

  * Freelancer has not submitted work
  * Client may cancel escrow

* `Submitted`

  * Freelancer has submitted work
  * Escrow becomes non-cancelable

* `Approved`

  * Client has approved submitted work

* `Released`

  * Funds are transferred
  * Next milestone begins

There are no alternative paths.

---

## 7. Cancellation Rules (Critical)

Cancellation is allowed **only if**:

* Current milestone state is `Pending`

Cancellation is **blocked** if:

* Milestone is `Submitted`
* Milestone is `Approved`
* Any funds have been released

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

---

### `submit_milestone`

* Called by freelancer
* Allowed only if state is `Pending`
* Transitions state → `Submitted`

---

### `approve_milestone`

* Called by client
* Allowed only if state is `Submitted`
* Transitions state → `Approved`

---

### `release_milestone`

* Called by client or freelancer
* Allowed only if state is `Approved`
* Transfers milestone funds
* Increments milestone index
* Sets next state → `Pending`

---

### `cancel_escrow`

* Called by client
* Allowed only if state is `Pending`
* Returns remaining funds
* Closes escrow account

---

## 10. Frontend Scope (Minimal UI)

The frontend exists only to **exercise the contract**.

### Required Screens

1. Create Escrow

   * Wallet connect
   * Milestone configuration
   * Fund deposit

2. Escrow Detail Page

   * Locked funds
   * Milestone list and states
   * Action buttons (submit / approve / release)

No dashboards or feeds.

---

## 11. Frontend Technology Decision

### Chosen Approach: Simple Web App

* Next.js
* Solana Wallet Adapter
* Anchor client

### Explicitly Excluded

* Browser extensions
* Mobile apps
* Custom wallets
* Desktop apps

These add unnecessary complexity.

---

## 12. Repository Structure

```
anchorpay/
├── programs/anchorpay/   # Anchor program
├── apps/web/             # Minimal web UI
├── packages/sdk/         # Optional TS helpers
└── README.md
```

---

## 13. Phase-by-Phase Build Plan

### Phase 1 — Core Escrow Logic

* Escrow PDA
* SOL support
* Milestone state machine
* Cancellation rules
* Tests

No UI in this phase.

---

### Phase 2 — Token Support & Hardening

* SPL token support (USDC)
* Validation and safety checks
* Edge case handling
* Expanded tests

---

### Phase 3 — Minimal UI

* Create escrow flow
* Milestone submission
* Approval and release

No styling polish.

---

### Phase 4 — Documentation & Cleanup

* Code comments
* README updates
* Example usage
* Open-source readiness

---

## 14. Testing Requirements

Tests must cover:

* Escrow initialization
* Milestone submission
* Approval and release
* Cancellation allowed state
* Cancellation blocked state

If tests pass, the system is trusted.

---

## 15. Guiding Principles (Never Break These)

* Simple > Clever
* Deterministic > Flexible
* On-chain only where required
* No human judgment in code
* No hidden state

If a feature violates these, it is rejected.

---

## 16. One-Line Internal Definition

> AnchorPay is a deterministic milestone escrow state machine that controls funds using program-owned accounts.

---

## 17. Status

This document is the **authoritative reference** for AnchorPay.
Any deviation must be intentional and documented.
