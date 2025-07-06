import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    // Test database connection first
    const connectionTest = await testDatabaseConnection()
    if (!connectionTest.success) {
      return NextResponse.json(
        {
          error: "Database connection failed",
          details: connectionTest.error,
          suggestion: connectionTest.suggestion,
        },
        { status: 500 },
      )
    }

    const body = await request.json().catch(() => ({}))
    const { clerkId } = body

    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Missing clerkId",
          required: ["clerkId"],
        },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error("❌ Error checking user:", error)
    return NextResponse.json(
      {
        error: "Failed to check user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
