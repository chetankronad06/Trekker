import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Fetching members for trip:", params.tripId)

    // Check if user is the trip handler
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      select: { handlerClerkId: true },
    })

    if (!trip || trip.handlerClerkId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Get all trip members
    const members = await prisma.tripMember.findMany({
      where: { tripId: params.tripId },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
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
      },
      { status: 500 },
    )
  }
}
