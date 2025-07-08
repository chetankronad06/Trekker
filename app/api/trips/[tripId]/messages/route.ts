import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
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

    // Verify user is a member of this trip
    const membership = await prisma.tripMember.findFirst({
      where: {
        tripId: params.tripId,
        userClerkId: user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You are not a member of this trip",
        },
        { status: 403 },
      )
    }

    console.log("🔍 Fetching messages for trip:", params.tripId)

    // Fetch messages with user details
    const messages = await prisma.tripMessage.findMany({
      where: {
        tripId: params.tripId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Format messages for frontend
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      message: message.message,
      userId: message.userClerkId,
      userName: message.user.firstName || message.user.email,
      createdAt: message.createdAt.toISOString(),
    }))

    console.log("✅ Found messages:", formattedMessages.length)

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error("❌ Error fetching messages:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
