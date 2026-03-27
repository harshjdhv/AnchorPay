import { PublicKey } from "@solana/web3.js"

export const ESCROW_TOKENS = ["USDC", "SOL"] as const
export type EscrowToken = (typeof ESCROW_TOKENS)[number]

export const ESCROW_STATUSES = [
  "CREATED",
  "FUNDED",
  "SUBMITTED",
  "REJECTED",
  "DISPUTED",
  "COMPLETED",
  "REFUNDED",
] as const
export type EscrowStatus = (typeof ESCROW_STATUSES)[number]

export type EscrowRecord = {
  id: string
  projectTitle: string
  description: string
  clientWallet: string
  freelancerWallet: string
  amount: string
  token: EscrowToken
  status: EscrowStatus
  deadline: string | null
  submissionLink: string | null
  createdAt: string
  updatedAt: string
  fundedAt: string | null
}

type EscrowStore = Map<string, EscrowRecord>

declare global {
  var __trustlockEscrowStore: EscrowStore | undefined
}

const escrowStore: EscrowStore = globalThis.__trustlockEscrowStore ?? new Map()

if (!globalThis.__trustlockEscrowStore) {
  globalThis.__trustlockEscrowStore = escrowStore
}

export type CreateEscrowInput = {
  projectTitle: string
  description: string
  freelancerWallet: string
  amount: string
  token: EscrowToken
  deadline: string | null
}

const normalizeSpace = (value: string) => value.trim().replace(/\s+/g, " ")

const parseAmount = (value: string) => {
  const normalized = value.trim()
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return null
  }

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000_000) {
    return null
  }

  return normalized
}

const isIsoDate = (value: string) => !Number.isNaN(Date.parse(value))

export const validateCreateEscrowInput = (rawInput: unknown) => {
  if (!rawInput || typeof rawInput !== "object") {
    return { ok: false as const, error: "Invalid request body" }
  }

  const input = rawInput as Partial<CreateEscrowInput>
  const projectTitle = normalizeSpace(input.projectTitle ?? "")
  const description = normalizeSpace(input.description ?? "")
  const freelancerWallet = input.freelancerWallet?.trim() ?? ""
  const amount = parseAmount(input.amount ?? "")
  const token = input.token
  const deadlineRaw = input.deadline?.trim()

  if (projectTitle.length < 3 || projectTitle.length > 120) {
    return {
      ok: false as const,
      error: "Project title must be between 3 and 120 characters",
    }
  }

  if (description.length < 10 || description.length > 2000) {
    return {
      ok: false as const,
      error: "Description must be between 10 and 2000 characters",
    }
  }

  try {
    new PublicKey(freelancerWallet)
  } catch {
    return { ok: false as const, error: "Invalid freelancer wallet address" }
  }

  if (!amount) {
    return { ok: false as const, error: "Amount must be a valid positive number" }
  }

  if (!token || !ESCROW_TOKENS.includes(token)) {
    return { ok: false as const, error: "Token must be USDC or SOL" }
  }

  let deadline: string | null = null
  if (deadlineRaw) {
    if (!isIsoDate(deadlineRaw)) {
      return { ok: false as const, error: "Deadline must be a valid date" }
    }

    const deadlineTime = new Date(deadlineRaw).getTime()
    if (deadlineTime <= Date.now()) {
      return { ok: false as const, error: "Deadline must be in the future" }
    }

    deadline = new Date(deadlineTime).toISOString()
  }

  return {
    ok: true as const,
    input: {
      projectTitle,
      description,
      freelancerWallet,
      amount,
      token,
      deadline,
    },
  }
}

export const createEscrow = ({
  clientWallet,
  input,
}: {
  clientWallet: string
  input: CreateEscrowInput
}) => {
  const now = new Date().toISOString()
  const escrow: EscrowRecord = {
    id: `esc_${crypto.randomUUID()}`,
    projectTitle: input.projectTitle,
    description: input.description,
    clientWallet,
    freelancerWallet: input.freelancerWallet,
    amount: input.amount,
    token: input.token,
    status: "CREATED",
    deadline: input.deadline,
    submissionLink: null,
    createdAt: now,
    updatedAt: now,
    fundedAt: null,
  }

  escrowStore.set(escrow.id, escrow)
  return escrow
}

export const fundEscrow = ({
  escrowId,
  clientWallet,
}: {
  escrowId: string
  clientWallet: string
}) => {
  const escrow = escrowStore.get(escrowId)

  if (!escrow) {
    return { ok: false as const, reason: "not_found" }
  }

  if (escrow.clientWallet !== clientWallet) {
    return { ok: false as const, reason: "forbidden" }
  }

  if (escrow.status !== "CREATED") {
    return { ok: false as const, reason: "invalid_state", status: escrow.status }
  }

  const now = new Date().toISOString()
  const fundedEscrow: EscrowRecord = {
    ...escrow,
    status: "FUNDED",
    fundedAt: now,
    updatedAt: now,
  }

  escrowStore.set(escrowId, fundedEscrow)

  return { ok: true as const, escrow: fundedEscrow }
}

export const listEscrowsForWallet = (walletAddress: string) => {
  return Array.from(escrowStore.values())
    .filter(
      (escrow) =>
        escrow.clientWallet === walletAddress ||
        escrow.freelancerWallet === walletAddress
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}
