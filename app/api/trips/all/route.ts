import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"
import { getOrCreateUser } from "@/lib/user"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Fetching all available trips for user:", user.id)

    const dbUser = await getOrCreateUser(user)

    // Get all trips with handler and member count info
    const trips = await prisma.trip.findMany({
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
      orderBy: {
        createdAt: "desc",
      },
    })

    console.log("✅ Found all trips:", trips.length)

    return NextResponse.json({ trips })
  } catch (error) {
    console.error("❌ Error fetching all trips:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trips",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
