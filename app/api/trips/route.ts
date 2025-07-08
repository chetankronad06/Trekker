import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateInviteCode } from "@/lib/utils/invite-code"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, description, startDate, endDate, startingPoint } = body

    // Ensure user exists in database
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const inviteCode = generateInviteCode()

    // Create trip with handler as member
    const trip = await prisma.trip.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        startingPoint,
        handlerClerkId: userId,
        inviteCode,
        members: {
          create: {
            userClerkId: userId,
            role: "HANDLER",
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

    return NextResponse.json({ trip })
  } catch (error) {
    console.error("Error creating trip:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get trips where user is a member
    const trips = await prisma.trip.findMany({
      where: {
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
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json({ trips })
  } catch (error) {
    console.error("Error fetching trips:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
