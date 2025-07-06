import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    errorFormat: "pretty",
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Enhanced database connection test with better error handling
export async function testDatabaseConnection() {
  try {
    console.log("🔍 Testing database connection...")

    // Test connection
    await prisma.$connect()

    // Test a simple query
    await prisma.$queryRaw`SELECT 1`

    console.log("✅ Database connected successfully")
    return { success: true, error: null }
  } catch (error) {
    console.error("❌ Database connection failed:", error)

    let errorMessage = "Unknown database error"
    let suggestion = "Check your DATABASE_URL configuration"

    if (error instanceof Error) {
      if (error.message.includes("authentication failed") || error.message.includes("credentials")) {
        errorMessage = "Database authentication failed"
        suggestion = "Check your database password in the DATABASE_URL"
      } else if (error.message.includes("Can't reach database server")) {
        errorMessage = "Cannot reach database server"
        suggestion = "Check your database host and port in the DATABASE_URL"
      } else if (error.message.includes("Tenant or user not found")) {
        errorMessage = "Database user or tenant not found"
        suggestion = "Verify your database URL format and project reference"
      } else {
        errorMessage = error.message
      }
    }

    return { success: false, error: errorMessage, suggestion }
  } finally {
    await prisma.$disconnect()
  }
}

// Graceful shutdown
process.on("beforeExit", async () => {
  await prisma.$disconnect()
})
