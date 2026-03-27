import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { CreateEscrowForm } from "@/components/create-escrow-form"
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth"

type CreateEscrowPageProps = {
  searchParams: Promise<{ role?: string }>
}

export default async function CreateEscrowPage({
  searchParams,
}: CreateEscrowPageProps) {
  const cookieStore = await cookies()
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)
  const params = await searchParams
  const initialRole = params.role === "freelancer" ? "freelancer" : "client"

  if (!session) {
    redirect("/")
  }

  return (
    <CreateEscrowForm
      walletAddress={session.walletAddress}
      initialRole={initialRole}
    />
  )
}
