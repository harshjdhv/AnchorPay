import { NextRequest, NextResponse } from "next/server"

import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth"
import {
  createEscrow,
  listEscrowsForWallet,
  validateCreateEscrowInput,
} from "@/lib/escrows"

const getSessionFromRequest = async (request: NextRequest) => {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  return await verifySessionToken(token)
}

export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const escrows = listEscrowsForWallet(session.walletAddress)
  return NextResponse.json({ escrows })
}

export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request)

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const validation = validateCreateEscrowInput(body)

  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  if (validation.input.freelancerWallet === session.walletAddress) {
    return NextResponse.json(
      { error: "Freelancer wallet must be different from client wallet" },
      { status: 400 }
    )
  }

  const escrow = createEscrow({
    clientWallet: session.walletAddress,
    input: validation.input,
  })

  return NextResponse.json({ escrow }, { status: 201 })
}
