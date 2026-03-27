import { NextRequest, NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import { fundEscrow } from "@/lib/escrows"

type RouteContext = {
  params: Promise<{
    escrowId: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  const session = await verifySessionToken(token)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const params = await context.params
  const escrowId = params.escrowId?.trim()

  if (!escrowId) {
    return NextResponse.json({ error: "Escrow id is required" }, { status: 400 })
  }

  const funded = fundEscrow({
    escrowId,
    clientWallet: session.walletAddress,
  })

  if (!funded.ok) {
    if (funded.reason === "not_found") {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 })
    }

    if (funded.reason === "forbidden") {
      return NextResponse.json(
        { error: "Only escrow client can fund this escrow" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: `Escrow cannot be funded from status ${funded.status}` },
      { status: 409 }
    )
  }

  return NextResponse.json({ escrow: funded.escrow })
}
