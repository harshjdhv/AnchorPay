import { PublicKey } from "@solana/web3.js"
import { type Escrow as PrismaEscrow } from "@prisma/client"

import { prisma } from "@/lib/prisma"

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
  submissionMessage: string | null
  createdAt: string
  updatedAt: string
  fundedAt: string | null
  submittedAt: string | null
  releasedAt: string | null
}

export type CreateEscrowInput = {
  projectTitle: string
  description: string
  freelancerWallet: string
  amount: string
  token: EscrowToken
  deadline: string | null
}

export type SubmitWorkInput = {
  submissionLink: string
  message: string
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

const validateSubmissionLink = (value: string) => {
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null
    }
    return parsed.toString()
  } catch {
    return null
  }
}

const toEscrowRecord = (escrow: PrismaEscrow): EscrowRecord => {
  return {
    id: escrow.id,
    projectTitle: escrow.projectTitle,
    description: escrow.description,
    clientWallet: escrow.clientWallet,
    freelancerWallet: escrow.freelancerWallet,
    amount: escrow.amount.toString(),
    token: escrow.token,
    status: escrow.status,
    deadline: escrow.deadline?.toISOString() ?? null,
    submissionLink: escrow.submissionLink,
    submissionMessage: escrow.submissionMessage,
    createdAt: escrow.createdAt.toISOString(),
    updatedAt: escrow.updatedAt.toISOString(),
    fundedAt: escrow.fundedAt?.toISOString() ?? null,
    submittedAt: escrow.submittedAt?.toISOString() ?? null,
    releasedAt: escrow.releasedAt?.toISOString() ?? null,
  }
}

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

export const validateSubmitWorkInput = (rawInput: unknown) => {
  if (!rawInput || typeof rawInput !== "object") {
    return { ok: false as const, error: "Invalid request body" }
  }

  const input = rawInput as Partial<SubmitWorkInput>
  const submissionLink = validateSubmissionLink((input.submissionLink ?? "").trim())
  const message = normalizeSpace(input.message ?? "")

  if (!submissionLink) {
    return {
      ok: false as const,
      error: "Submission link must be a valid http(s) URL",
    }
  }

  if (message.length < 10 || message.length > 1500) {
    return {
      ok: false as const,
      error: "Message must be between 10 and 1500 characters",
    }
  }

  return {
    ok: true as const,
    input: {
      submissionLink,
      message,
    },
  }
}

export const createEscrow = async ({
  clientWallet,
  input,
}: {
  clientWallet: string
  input: CreateEscrowInput
}) => {
  const created = await prisma.escrow.create({
    data: {
      id: `esc_${crypto.randomUUID()}`,
      projectTitle: input.projectTitle,
      description: input.description,
      clientWallet,
      freelancerWallet: input.freelancerWallet,
      amount: input.amount,
      token: input.token,
      status: "CREATED",
      deadline: input.deadline ? new Date(input.deadline) : null,
    },
  })

  return toEscrowRecord(created)
}

export const fundEscrow = async ({
  escrowId,
  clientWallet,
}: {
  escrowId: string
  clientWallet: string
}) => {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
  })

  if (!escrow) {
    return { ok: false as const, reason: "not_found" }
  }

  if (escrow.clientWallet !== clientWallet) {
    return { ok: false as const, reason: "forbidden" }
  }

  if (escrow.status !== "CREATED") {
    return { ok: false as const, reason: "invalid_state", status: escrow.status }
  }

  const now = new Date()
  const fundedEscrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "FUNDED",
      fundedAt: now,
    },
  })

  return { ok: true as const, escrow: toEscrowRecord(fundedEscrow) }
}

export const submitWork = async ({
  escrowId,
  freelancerWallet,
  input,
}: {
  escrowId: string
  freelancerWallet: string
  input: SubmitWorkInput
}) => {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
  })

  if (!escrow) {
    return { ok: false as const, reason: "not_found" }
  }

  if (escrow.freelancerWallet !== freelancerWallet) {
    return { ok: false as const, reason: "forbidden" }
  }

  if (escrow.status !== "FUNDED") {
    return { ok: false as const, reason: "invalid_state", status: escrow.status }
  }

  const now = new Date()
  const submittedEscrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "SUBMITTED",
      submissionLink: input.submissionLink,
      submissionMessage: input.message,
      submittedAt: now,
    },
  })

  return { ok: true as const, escrow: toEscrowRecord(submittedEscrow) }
}

export const releasePayment = async ({
  escrowId,
  clientWallet,
}: {
  escrowId: string
  clientWallet: string
}) => {
  const escrow = await prisma.escrow.findUnique({
    where: { id: escrowId },
  })

  if (!escrow) {
    return { ok: false as const, reason: "not_found" }
  }

  if (escrow.clientWallet !== clientWallet) {
    return { ok: false as const, reason: "forbidden" }
  }

  if (escrow.status !== "SUBMITTED") {
    return { ok: false as const, reason: "invalid_state", status: escrow.status }
  }

  const now = new Date()
  const completedEscrow = await prisma.escrow.update({
    where: { id: escrowId },
    data: {
      status: "COMPLETED",
      releasedAt: now,
    },
  })

  return { ok: true as const, escrow: toEscrowRecord(completedEscrow) }
}

export const listEscrowsForWallet = async (walletAddress: string) => {
  const escrows = await prisma.escrow.findMany({
    where: {
      OR: [
        { clientWallet: walletAddress },
        { freelancerWallet: walletAddress },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return escrows.map(toEscrowRecord)
}
