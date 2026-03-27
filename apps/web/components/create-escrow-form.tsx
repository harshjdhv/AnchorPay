"use client"

import { useWallet } from "@solana/wallet-adapter-react"
import { useWalletModal } from "@solana/wallet-adapter-react-ui"
import { Button } from "@workspace/ui/components/button"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

const SHORT_ADDRESS_PREFIX = 4
const SHORT_ADDRESS_SUFFIX = 4

type CreateEscrowFormProps = {
  walletAddress: string
  initialRole: "client" | "freelancer"
}

type CreateEscrowPayload = {
  projectTitle: string
  description: string
  freelancerWallet: string
  amount: string
  token: "USDC" | "SOL"
  deadline: string | null
}

type CreateEscrowResponse = {
  escrow?: {
    id: string
  }
  error?: string
}

const shortenAddress = (value: string) =>
  `${value.slice(0, SHORT_ADDRESS_PREFIX)}...${value.slice(-SHORT_ADDRESS_SUFFIX)}`

const toIsoDate = (value: string) => {
  if (!value) {
    return null
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function CreateEscrowForm({
  walletAddress,
  initialRole,
}: CreateEscrowFormProps) {
  const router = useRouter()
  const { connected, publicKey } = useWallet()
  const { setVisible } = useWalletModal()
  const [selectedRole, setSelectedRole] = useState<"CLIENT" | "FREELANCER">("CLIENT")

  const [projectTitle, setProjectTitle] = useState("")
  const [description, setDescription] = useState("")
  const [freelancerWallet, setFreelancerWallet] = useState("")
  const [amount, setAmount] = useState("")
  const [token, setToken] = useState<"USDC" | "SOL">("USDC")
  const [deadline, setDeadline] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const roleFromQuery = initialRole === "client" ? "CLIENT" : "FREELANCER"
    const roleFromStorage = window.localStorage.getItem("trustlock_role")
    if (roleFromStorage === "CLIENT" || roleFromStorage === "FREELANCER") {
      setSelectedRole(roleFromStorage)
      return
    }
    setSelectedRole(roleFromQuery)
  }, [initialRole])

  useEffect(() => {
    window.localStorage.setItem("trustlock_role", selectedRole)
  }, [selectedRole])

  const hasWalletMismatch = useMemo(() => {
    if (!publicKey) {
      return false
    }
    return publicKey.toBase58() !== walletAddress
  }, [publicKey, walletAddress])

  const resetForm = () => {
    setProjectTitle("")
    setDescription("")
    setFreelancerWallet("")
    setAmount("")
    setToken("USDC")
    setDeadline("")
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    if (!connected || !publicKey) {
      setError("Connect your wallet before creating an escrow")
      return
    }

    if (hasWalletMismatch) {
      setError(
        "Connected wallet does not match authenticated session. Logout and sign in again."
      )
      return
    }

    if (selectedRole !== "CLIENT") {
      setError("Only client role can create escrow. Switch role to Client.")
      return
    }

    const payload: CreateEscrowPayload = {
      projectTitle: projectTitle.trim(),
      description: description.trim(),
      freelancerWallet: freelancerWallet.trim(),
      amount: amount.trim(),
      token,
      deadline: toIsoDate(deadline),
    }

    if (payload.projectTitle.length < 3) {
      setError("Project title must be at least 3 characters")
      return
    }

    if (payload.description.length < 10) {
      setError("Description must be at least 10 characters")
      return
    }

    if (!payload.freelancerWallet) {
      setError("Freelancer wallet address is required")
      return
    }

    if (!payload.amount || Number(payload.amount) <= 0) {
      setError("Amount must be a positive number")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("/api/escrows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = (await response.json().catch(() => null)) as
        | CreateEscrowResponse
        | null

      if (!response.ok) {
        setError(body?.error ?? "Unable to create escrow")
        return
      }

      resetForm()
      setSuccess(`Escrow ${body?.escrow?.id ?? "created"} is ready and in CREATED state.`)
      router.refresh()
    } catch {
      setError("Network error while creating escrow")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#FAFAFA] px-6 py-12 text-zinc-950">
      <div className="mx-auto max-w-[960px] space-y-8">
        <header className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          <p className="text-xs font-semibold tracking-[0.12em] text-zinc-500 uppercase">
            Create Escrow
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            New escrow for {shortenAddress(walletAddress)}
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-600">
            Define project details and lock payment terms. Escrow will be created in
            `CREATED` status and can be funded in the next step.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
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
              ? "Client creates escrow and enters freelancer wallet address."
              : "Freelancer cannot create escrow. Ask client to create and fund it first."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-zinc-950 hover:bg-zinc-100"
              onClick={() => setVisible(true)}
            >
              {connected ? "Wallet Connected" : "Connect Wallet"}
            </Button>
            <Button
              asChild
              className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-zinc-950 hover:bg-zinc-100"
            >
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
          {hasWalletMismatch ? (
            <p className="mt-3 text-sm text-amber-700">
              Connected wallet differs from authenticated session. Use the same wallet
              for secure escrow creation.
            </p>
          ) : null}
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]">
          {selectedRole === "CLIENT" ? (
            <form className="grid gap-5" onSubmit={handleSubmit}>
              <label className="grid gap-2">
                <span className="text-sm font-medium">Project Title</span>
                <input
                  className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                  value={projectTitle}
                  onChange={(event) => setProjectTitle(event.target.value)}
                  placeholder="Landing Page Design"
                  maxLength={120}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Description</span>
                <textarea
                  className="min-h-28 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Scope, deliverables, and acceptance criteria."
                  maxLength={2000}
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium">Freelancer Wallet Address</span>
                <input
                  className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                  value={freelancerWallet}
                  onChange={(event) => setFreelancerWallet(event.target.value)}
                  placeholder="8dj3f... Solana wallet"
                  required
                />
              </label>

              <div className="grid gap-5 md:grid-cols-3">
                <label className="grid gap-2">
                  <span className="text-sm font-medium">Amount</span>
                  <input
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="50"
                    inputMode="decimal"
                    required
                  />
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Token Type</span>
                  <select
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                    value={token}
                    onChange={(event) =>
                      setToken(event.target.value as "USDC" | "SOL")
                    }
                  >
                    <option value="USDC">USDC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </label>

                <label className="grid gap-2">
                  <span className="text-sm font-medium">Deadline (optional)</span>
                  <input
                    type="datetime-local"
                    className="h-11 rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none ring-zinc-900 transition focus:ring-2"
                    value={deadline}
                    onChange={(event) => setDeadline(event.target.value)}
                  />
                </label>
              </div>

              {error ? (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              ) : null}

              {success ? (
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {success}
                </p>
              ) : null}

              <div className="flex flex-wrap gap-3 pt-1">
                <Button
                  type="submit"
                  className="h-11 rounded-full bg-zinc-950 px-6 text-white hover:bg-zinc-800"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Creating..." : "Create Escrow"}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-full border border-zinc-300 bg-white px-6 text-zinc-950 hover:bg-zinc-100"
                  onClick={resetForm}
                  disabled={isSubmitting}
                >
                  Reset
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <h2 className="text-lg font-semibold tracking-tight">
                Freelancer flow starts after funding
              </h2>
              <p className="mt-2 text-sm text-zinc-600">
                Ask the client to create escrow with your wallet address and fund it.
                Then you can submit proof in the next workflow step.
              </p>
              <Button
                asChild
                className="mt-4 h-10 rounded-full bg-zinc-950 px-5 text-white hover:bg-zinc-800"
              >
                <Link href="/dashboard">Go to Dashboard</Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
