import { NextRequest, NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import { submitWork, validateSubmitWorkInput } from "@/lib/escrows"

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

  const body = await request.json().catch(() => null)
  const validation = validateSubmitWorkInput(body)

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const submitted = await submitWork({
    escrowId,
    freelancerWallet: session.walletAddress,
    input: validation.input,
  })

  if (!submitted.ok) {
    if (submitted.reason === "not_found") {
      return NextResponse.json({ error: "Escrow not found" }, { status: 404 })
    }

    if (submitted.reason === "forbidden") {
      return NextResponse.json(
        { error: "Only escrow freelancer can submit work for this escrow" },
        { status: 403 }
      )
    }

    return NextResponse.json(
      { error: `Work cannot be submitted from status ${submitted.status}` },
      { status: 409 }
    )
  }

  return NextResponse.json({ escrow: submitted.escrow })
}
