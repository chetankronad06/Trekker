import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

// GET - Fetch user data
export async function GET() {
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

    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    })

    if (!dbUser) {
      return NextResponse.json(
        {
          error: "User not found in database",
          suggestion: "Try signing out and signing in again to sync your account",
        },
        { status: 404 },
      )
    }

    return NextResponse.json({ user: dbUser })
  } catch (error) {
    console.error("❌ Error fetching user:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// PUT - Update user data
export async function PUT(request: NextRequest) {
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

    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { firstName, lastName, email } = body

    if (!firstName || !lastName || !email) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["firstName", "lastName", "email"],
        },
        { status: 400 },
      )
    }

    // Update in database
    const updatedUser = await prisma.user.update({
      where: { clerkId: user.id },
      data: {
        firstName,
        lastName,
        email,
      },
    })

    return NextResponse.json({
      message: "User updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("❌ Error updating user:", error)

    if (error instanceof Error && error.message.includes("Record to update not found")) {
      return NextResponse.json(
        {
          error: "User not found in database",
          suggestion: "Try signing out and signing in again to sync your account",
        },
        { status: 404 },
      )
    }

    return NextResponse.json(
      {
        error: "Failed to update user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
