import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    // Test database connection first
    const connectionTest = await testDatabaseConnection()
    if (!connectionTest.success) {
      console.error("❌ Database connection failed:", connectionTest.error)
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
      console.error("❌ User not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Fetching members for trip:", params.tripId, "by user:", user.id)

    // Verify user is a member of this trip
    const membership = await prisma.tripMember.findFirst({
      where: {
        tripId: params.tripId,
        userClerkId: user.id,
      },
    })

    if (!membership) {
      console.error("❌ User not a member of trip:", params.tripId)
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You are not a member of this trip",
        },
        { status: 403 },
      )
    }

    console.log("🔍 Fetching members for trip:", params.tripId)

    const members = await prisma.tripMember.findMany({
      where: {
        tripId: params.tripId,
      },
      include: {
        user: {
          select: {
            clerkId: true,
            email: true,
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    })

    console.log("✅ Found members:", members.length)

    return NextResponse.json({ members })
  } catch (error) {
    console.error("❌ Error fetching members:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch members",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    // Test database connection first
    const connectionTest = await testDatabaseConnection()
    if (!connectionTest.success) {
      console.error("❌ Database connection failed:", connectionTest.error)
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
      console.error("❌ User not authenticated")
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { userClerkIds } = body

    console.log("🔄 Adding members to trip:", {
      tripId: params.tripId,
      userClerkIds,
      requestedBy: user.id,
    })

    if (!userClerkIds || !Array.isArray(userClerkIds)) {
      console.error("❌ Invalid userClerkIds:", userClerkIds)
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["userClerkIds"],
          received: { userClerkIds },
        },
        { status: 400 },
      )
    }

    // Verify user is the trip handler
    const trip = await prisma.trip.findFirst({
      where: {
        id: params.tripId,
        handlerClerkId: user.id,
      },
    })

    if (!trip) {
      console.error("❌ User not trip handler:", params.tripId, user.id)
      return NextResponse.json(
        {
          error: "Access denied",
          details: "Only trip handler can invite users",
        },
        { status: 403 },
      )
    }

    // Verify all users exist in database
    const existingUsers = await prisma.user.findMany({
      where: {
        clerkId: {
          in: userClerkIds,
        },
      },
      select: {
        clerkId: true,
      },
    })

    const existingUserIds = existingUsers.map((u) => u.clerkId)
    const missingUsers = userClerkIds.filter((id: string) => !existingUserIds.includes(id))

    if (missingUsers.length > 0) {
      console.error("❌ Some users not found in database:", missingUsers)
      return NextResponse.json(
        {
          error: "Some users not found",
          details: `Users not found: ${missingUsers.join(", ")}`,
          missingUsers,
        },
        { status: 400 },
      )
    }

    console.log("🔄 Adding members to trip:", {
      tripId: params.tripId,
      userCount: userClerkIds.length,
    })

    // Add multiple users to trip
    const members = await prisma.tripMember.createMany({
      data: userClerkIds.map((clerkId: string) => ({
        tripId: params.tripId,
        userClerkId: clerkId,
        role: "MEMBER" as const,
      })),
      skipDuplicates: true,
    })

    console.log("✅ Members added successfully:", members.count)

    return NextResponse.json({
      message: "Members added successfully",
      count: members.count,
    })
  } catch (error) {
    console.error("❌ Error adding members:", error)
    return NextResponse.json(
      {
        error: "Failed to add members",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: process.env.NODE_ENV === "development" ? (error as Error).stack : undefined,
      },
      { status: 500 },
    )
  }
}
