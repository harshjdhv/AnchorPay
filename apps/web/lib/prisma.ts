import { PrismaClient } from "@prisma/client"

declare global {
  var __trustlockPrisma: PrismaClient | undefined
}

export const prisma =
  globalThis.__trustlockPrisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })

if (process.env.NODE_ENV !== "production") {
  globalThis.__trustlockPrisma = prisma
}
