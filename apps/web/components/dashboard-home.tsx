"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Button } from "@workspace/ui/components/button"
import { ArrowRight, LogOut, ShieldCheck, Wallet } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const shortenAddress = (value: string) =>
  `${value.slice(0, 4)}...${value.slice(-4)}`

type EscrowStatus =
  | "CREATED"
  | "FUNDED"
  | "SUBMITTED"
  | "REJECTED"
  | "DISPUTED"
  | "COMPLETED"
  | "REFUNDED"

type EscrowListItem = {
  id: string
  projectTitle: string
  clientWallet: string
  freelancerWallet: string
  amount: string
  token: "USDC" | "SOL"
  status: EscrowStatus
  submissionLink: string | null
  submissionMessage: string | null
  submittedAt: string | null
  releasedAt: string | null
  createdAt: string
}

type DashboardHomeProps = {
  walletAddress: string
  initialEscrows: EscrowListItem[]
}

type UserRole = "CLIENT" | "FREELANCER"

const timelineSteps = [
  "Escrow Created",
  "Escrow Funded",
  "Work Submitted",
  "Waiting for Client Review",
  "Payment Released",
] as const

const statusStepMap: Record<EscrowStatus, number> = {
  CREATED: 1,
  FUNDED: 2,
  SUBMITTED: 4,
  REJECTED: 3,
  DISPUTED: 3,
  COMPLETED: 5,
  REFUNDED: 2,
}

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso))

const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso))

const ROLE_STORAGE_KEY = "trustlock_role"

export function DashboardHome({
  walletAddress,
  initialEscrows,
}: DashboardHomeProps) {
  const router = useRouter()
  const { connected, publicKey, disconnect } = useWallet()
  const { setVisible } = useWalletModal()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>("CLIENT")
  const [fundingEscrowId, setFundingEscrowId] = useState<string | null>(null)
  const [submittingEscrowId, setSubmittingEscrowId] = useState<string | null>(null)
  const [releasingEscrowId, setReleasingEscrowId] = useState<string | null>(null)
  const [submitLinkByEscrow, setSubmitLinkByEscrow] = useState<
    Record<string, string>
  >({})
  const [submitMessageByEscrow, setSubmitMessageByEscrow] = useState<
    Record<string, string>
  >({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)

  useEffect(() => {
    const persistedRole = window.localStorage.getItem(ROLE_STORAGE_KEY)
    if (persistedRole === "CLIENT" || persistedRole === "FREELANCER") {
      setSelectedRole(persistedRole)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(ROLE_STORAGE_KEY, selectedRole)
  }, [selectedRole])

  const roleEscrows = useMemo(
    () =>
      initialEscrows.filter((escrow) =>
        selectedRole === "CLIENT"
          ? escrow.clientWallet === walletAddress
          : escrow.freelancerWallet === walletAddress
      ),
    [initialEscrows, selectedRole, walletAddress]
  )
  const hasWalletMismatch = publicKey ? publicKey.toBase58() !== walletAddress : false

  const handleFundEscrow = async (escrowId: string) => {
    setActionError(null)
    setActionSuccess(null)

    if (!connected || !publicKey) {
      setActionError("Connect wallet before funding escrow")
      return
    }

    if (hasWalletMismatch) {
      setActionError(
        "Connected wallet does not match authenticated session. Logout and sign in again."
      )
      return
    }

    if (selectedRole !== "CLIENT") {
      setActionError("Switch role to Client to fund escrow")
      return
    }

    setFundingEscrowId(escrowId)

    try {
      const response = await fetch(`/api/escrows/${encodeURIComponent(escrowId)}/fund`, {
        method: "POST",
      })
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string
          }
        | null

      if (!response.ok) {
        setActionError(body?.error ?? "Unable to fund escrow")
        return
      }

      setActionSuccess(`Escrow ${escrowId} funded. Status moved to FUNDED.`)
      router.refresh()
    } catch {
      setActionError("Network error while funding escrow")
    } finally {
      setFundingEscrowId(null)
    }
  }

  const handleSubmitWork = async (escrowId: string) => {
    setActionError(null)
    setActionSuccess(null)

    if (!connected || !publicKey) {
      setActionError("Connect wallet before submitting work")
      return
    }

    if (hasWalletMismatch) {
      setActionError(
        "Connected wallet does not match authenticated session. Logout and sign in again."
      )
      return
    }

    if (selectedRole !== "FREELANCER") {
      setActionError("Switch role to Freelancer to submit work")
      return
    }

    const submissionLink = (submitLinkByEscrow[escrowId] ?? "").trim()
    const message = (submitMessageByEscrow[escrowId] ?? "").trim()

    if (!submissionLink) {
      setActionError("Proof link is required")
      return
    }

    if (message.length < 10) {
      setActionError("Submission message must be at least 10 characters")
      return
    }

    setSubmittingEscrowId(escrowId)

    try {
      const response = await fetch(
        `/api/escrows/${encodeURIComponent(escrowId)}/submit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionLink,
            message,
          }),
        }
      )
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string
          }
        | null

      if (!response.ok) {
        setActionError(body?.error ?? "Unable to submit work")
        return
      }

      setSubmitLinkByEscrow((previous) => ({
        ...previous,
        [escrowId]: "",
      }))
      setSubmitMessageByEscrow((previous) => ({
        ...previous,
        [escrowId]: "",
      }))
      setActionSuccess(`Work submitted for escrow ${escrowId}. Awaiting client review.`)
      router.refresh()
    } catch {
      setActionError("Network error while submitting work")
    } finally {
      setSubmittingEscrowId(null)
    }
  }

  const handleReleasePayment = async (escrowId: string) => {
    setActionError(null)
    setActionSuccess(null)

    if (!connected || !publicKey) {
      setActionError("Connect wallet before releasing payment")
      return
    }

    if (hasWalletMismatch) {
      setActionError(
        "Connected wallet does not match authenticated session. Logout and sign in again."
      )
      return
    }

    if (selectedRole !== "CLIENT") {
      setActionError("Switch role to Client to release payment")
      return
    }

    setReleasingEscrowId(escrowId)

    try {
      const response = await fetch(
        `/api/escrows/${encodeURIComponent(escrowId)}/release`,
        {
          method: "POST",
        }
      )
      const body = (await response.json().catch(() => null)) as
        | {
            error?: string
          }
        | null

      if (!response.ok) {
        setActionError(body?.error ?? "Unable to release payment")
        return
      }

      setActionSuccess(`Payment released for escrow ${escrowId}. Status moved to COMPLETED.`)
      router.refresh()
    } catch {
      setActionError("Network error while releasing payment")
    } finally {
      setReleasingEscrowId(null)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      await fetch("/api/auth/logout", { method: "POST" })
    } finally {
      try {
        await disconnect()
      } catch {
        // Wallet adapters can reject disconnect if wallet app is not available.
      }

      router.push("/")
      router.refresh()
      setIsLoggingOut(false)
    }
  }

  if (!connected || !publicKey) {
    return (
      <main className="min-h-screen bg-[#FAFAFA] px-6 py-12 text-zinc-950">
        <div className="mx-auto max-w-[720px] rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect your wallet to continue
          </h1>
          <p className="mt-3 text-zinc-600">
            Dashboard data is tied to your wallet. Connect Phantom, Solflare, or
            Backpack to load your escrow workspace.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="h-11 rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800"
              onClick={() => setVisible(true)}
            >
              <Wallet className="h-4 w-4" />
              Connect Wallet
            </Button>
            <Button
              asChild
              className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-zinc-950 hover:bg-zinc-100"
            >
              <Link href="/">Back to Landing</Link>
            </Button>
            <Button
              className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-zinc-950 hover:bg-zinc-100"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-6 py-12 text-zinc-950">
      <div className="mx-auto max-w-[1100px] space-y-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
              Dashboard
            </p>
            <Button
              className="h-10 rounded-full border border-zinc-300 bg-white px-5 text-zinc-950 hover:bg-zinc-100"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Welcome, {shortenAddress(walletAddress)}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Wallet connected successfully. Next stage is to let clients create
            escrows and fund USDC directly from this dashboard.
          </p>
          {hasWalletMismatch ? (
            <p className="mt-2 text-sm text-amber-700">
              Connected wallet differs from authenticated session. Logout and sign
              in again to switch identity.
            </p>
          ) : null}
          <div className="mt-6">
            <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
              Active Role
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                className={[
                  "h-10 rounded-full px-5",
                  selectedRole === "CLIENT"
                    ? "bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100",
                ].join(" ")}
                onClick={() => setSelectedRole("CLIENT")}
              >
                Client
              </Button>
              <Button
                className={[
                  "h-10 rounded-full px-5",
                  selectedRole === "FREELANCER"
                    ? "bg-zinc-950 text-white hover:bg-zinc-800"
                    : "border border-zinc-300 bg-white text-zinc-950 hover:bg-zinc-100",
                ].join(" ")}
                onClick={() => setSelectedRole("FREELANCER")}
              >
                Freelancer
              </Button>
            </div>
            <p className="mt-3 text-sm text-zinc-600">
              {selectedRole === "CLIENT"
                ? "As client: create escrow, fund payment, review submission, approve/reject."
                : "As freelancer: wait for funded escrow, submit proof, or raise dispute."}
            </p>
          </div>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold tracking-tight">Active Escrows</h2>
            {roleEscrows.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-600">
                {selectedRole === "CLIENT"
                  ? "No client escrows yet. Create your first protected contract."
                  : "No freelancer escrows yet. Ask client to create and fund escrow."}
              </p>
            ) : (
              <p className="mt-2 text-sm text-zinc-600">
                {roleEscrows.length} escrow
                {roleEscrows.length === 1 ? "" : "s"} for role {selectedRole.toLowerCase()}.
              </p>
            )}
            {selectedRole === "CLIENT" ? (
              <Button
                asChild
                className="mt-4 h-10 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
              >
                <Link href="/dashboard/create?role=client">Create Escrow</Link>
              </Button>
            ) : (
              <p className="mt-4 text-xs text-zinc-500">
                Escrow creation is a client action.
              </p>
            )}
          </article>
          <article className="rounded-2xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold tracking-tight">Next Action</h2>
            <p className="mt-2 text-sm text-zinc-600">
              {selectedRole === "CLIENT"
                ? "Create and fund escrow (`create_escrow()` -> `fund_escrow()`)."
                : "Submit work proof on funded escrows and track client review."}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-zinc-900">
              <ShieldCheck className="h-4 w-4" />
              Wallet auth layer is now ready
            </div>
          </article>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">
            Escrow Timeline Overview
          </h2>
          {actionError ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}
          {actionSuccess ? (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {actionSuccess}
            </p>
          ) : null}
          {roleEscrows.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-600">
              Escrows will appear here with timeline progress once created.
            </p>
          ) : (
            <div className="mt-4 grid gap-4">
              {roleEscrows.map((escrow) => {
                const progress = statusStepMap[escrow.status]
                const counterparty =
                  escrow.clientWallet === walletAddress
                    ? `Freelancer: ${shortenAddress(escrow.freelancerWallet)}`
                    : `Client: ${shortenAddress(escrow.clientWallet)}`

                return (
                  <article
                    key={escrow.id}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-zinc-900">
                          {escrow.projectTitle}
                        </h3>
                        <p className="mt-1 text-xs text-zinc-600">
                          {escrow.amount} {escrow.token} · {counterparty}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-zinc-700">
                          {escrow.status}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDate(escrow.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 md:grid-cols-5">
                      {timelineSteps.map((step, index) => {
                        const completed = index + 1 <= progress
                        return (
                          <div key={step} className="flex items-center gap-2">
                            <span
                              className={[
                                "h-2.5 w-2.5 rounded-full",
                                completed ? "bg-emerald-600" : "bg-zinc-300",
                              ].join(" ")}
                            />
                            <span
                              className={[
                                "text-[11px] leading-4",
                                completed ? "text-zinc-900" : "text-zinc-500",
                              ].join(" ")}
                            >
                              {step}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                    {escrow.submissionLink ? (
                      <div className="mt-4 rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-[11px] font-semibold tracking-[0.08em] text-zinc-500 uppercase">
                          Submission Proof
                        </p>
                        <p className="mt-2 text-xs">
                          <a
                            href={escrow.submissionLink}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="text-zinc-900 underline decoration-zinc-400 underline-offset-4"
                          >
                            {escrow.submissionLink}
                          </a>
                        </p>
                        {escrow.submissionMessage ? (
                          <p className="mt-2 text-xs text-zinc-700">{escrow.submissionMessage}</p>
                        ) : null}
                        {escrow.submittedAt ? (
                          <p className="mt-2 text-[11px] text-zinc-500">
                            Submitted: {formatDateTime(escrow.submittedAt)}
                          </p>
                        ) : null}
                        {escrow.releasedAt ? (
                          <p className="mt-1 text-[11px] text-emerald-700">
                            Released: {formatDateTime(escrow.releasedAt)}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                    {selectedRole === "CLIENT" &&
                    escrow.clientWallet === walletAddress &&
                    escrow.status === "CREATED" ? (
                      <div className="mt-4">
                        <Button
                          className="h-9 rounded-full bg-zinc-950 px-4 text-xs text-white hover:bg-zinc-800"
                          onClick={() => handleFundEscrow(escrow.id)}
                          disabled={fundingEscrowId === escrow.id || hasWalletMismatch}
                        >
                          {fundingEscrowId === escrow.id ? "Funding..." : "Fund Escrow"}
                        </Button>
                      </div>
                    ) : null}
                    {selectedRole === "FREELANCER" &&
                    escrow.freelancerWallet === walletAddress &&
                    escrow.status === "FUNDED" ? (
                      <div className="mt-4 space-y-3 rounded-lg border border-zinc-200 bg-white p-3">
                        <p className="text-xs font-medium text-zinc-700">
                          Submit work proof for client review
                        </p>
                        <input
                          className="h-9 w-full rounded-md border border-zinc-300 px-3 text-xs outline-none ring-zinc-900 transition focus:ring-2"
                          placeholder="https://github.com/... or https://figma.com/..."
                          value={submitLinkByEscrow[escrow.id] ?? ""}
                          onChange={(event) =>
                            setSubmitLinkByEscrow((previous) => ({
                              ...previous,
                              [escrow.id]: event.target.value,
                            }))
                          }
                        />
                        <textarea
                          className="min-h-20 w-full rounded-md border border-zinc-300 px-3 py-2 text-xs outline-none ring-zinc-900 transition focus:ring-2"
                          placeholder="Completed features, deployment links, and notes."
                          value={submitMessageByEscrow[escrow.id] ?? ""}
                          onChange={(event) =>
                            setSubmitMessageByEscrow((previous) => ({
                              ...previous,
                              [escrow.id]: event.target.value,
                            }))
                          }
                        />
                        <Button
                          className="h-9 rounded-full bg-zinc-950 px-4 text-xs text-white hover:bg-zinc-800"
                          onClick={() => handleSubmitWork(escrow.id)}
                          disabled={submittingEscrowId === escrow.id || hasWalletMismatch}
                        >
                          {submittingEscrowId === escrow.id
                            ? "Submitting..."
                            : "Submit Work"}
                        </Button>
                      </div>
                    ) : null}
                    {selectedRole === "CLIENT" &&
                    escrow.clientWallet === walletAddress &&
                    escrow.status === "SUBMITTED" ? (
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          className="h-9 rounded-full bg-zinc-950 px-4 text-xs text-white hover:bg-zinc-800"
                          onClick={() => handleReleasePayment(escrow.id)}
                          disabled={releasingEscrowId === escrow.id || hasWalletMismatch}
                        >
                          {releasingEscrowId === escrow.id
                            ? "Releasing..."
                            : "Approve & Release Payment"}
                        </Button>
                      </div>
                    ) : null}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold tracking-tight">Roadmap</h2>
          <ol className="mt-4 grid gap-3 text-sm text-zinc-700 md:grid-cols-2">
            <li>1. Create escrow form</li>
            <li>2. Fund escrow with USDC</li>
            <li>3. Submit proof link</li>
            <li>4. Approve/reject and release</li>
          </ol>
          <Button
            asChild
            className="mt-6 h-11 rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800"
          >
            <Link href="/">
              Return to Landing
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </section>
      </div>
    </main>
  )
}
