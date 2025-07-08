import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { tripId: string } }) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trip = await prisma.trip.findFirst({
      where: {
        id: params.tripId,
        members: {
          some: {
            userClerkId: userId,
          },
        },
      },
      include: {
        handler: true,
        members: {
          include: {
            user: true,
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
      return NextResponse.json({ error: "Trip not found" }, { status: 404 })
    }

    return NextResponse.json({ trip })
  } catch (error) {
    console.error("Error fetching trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
