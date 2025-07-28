import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
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

    console.log("🔍 Fetching public trip info:", params.tripId, "for user:", user.id)

    // Get basic trip information (public view)
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      include: {
        handler: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
    })

    if (!trip) {
      return NextResponse.json(
        {
          error: "Trip not found",
          details: "The trip does not exist",
        },
        { status: 404 },
      )
    }

    console.log("✅ Public trip info found:", trip.name)

    return NextResponse.json({ trip })
  } catch (error) {
    console.error("❌ Error fetching public trip:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trip",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
