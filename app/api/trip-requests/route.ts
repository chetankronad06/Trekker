import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

// GET - Fetch user's sent and received requests
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") // 'sent' or 'received'
    const tripId = searchParams.get("tripId")

    console.log("🔍 Fetching trip requests for user:", user.id, "type:", type)

    // Ensure user exists in database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    })

    if (!dbUser) {
      console.log("🔄 User not found in DB, creating...")
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          profileImageUrl: user.imageUrl || null,
        },
      })
      console.log("✅ User created in DB:", dbUser.clerkId)
    }

    if (type === "sent") {
      // Get requests sent by this user
      const sentRequests = await prisma.tripRequest.findMany({
        where: {
          requesterClerkId: user.id,
        },
        include: {
          trip: {
            select: {
              id: true,
              name: true,
              description: true,
              startingPoint: true,
              startDate: true,
              endDate: true,
            },
          },
          receiver: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      console.log("📤 Found sent requests:", sentRequests.length)
      return NextResponse.json({ requests: sentRequests })
    } else if (type === "received") {
      // Get requests received by this user (as trip handler)
      const receivedRequests = await prisma.tripRequest.findMany({
        where: {
          receiverClerkId: user.id,
          ...(tripId && { tripId }), // Add tripId filter if provided
        },
        include: {
          trip: {
            select: {
              id: true,
              name: true,
              description: true,
              startingPoint: true,
              startDate: true,
              endDate: true,
            },
          },
          requester: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              profileImageUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      })

      console.log("📥 Found received requests:", receivedRequests.length)
      return NextResponse.json({ requests: receivedRequests })
    } else {
      // Get both sent and received requests
      const [sentRequests, receivedRequests] = await Promise.all([
        prisma.tripRequest.findMany({
          where: {
            requesterClerkId: user.id,
          },
          include: {
            trip: {
              select: {
                id: true,
                name: true,
                description: true,
                startingPoint: true,
                startDate: true,
                endDate: true,
              },
            },
            receiver: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
        prisma.tripRequest.findMany({
          where: {
            receiverClerkId: user.id,
          },
          include: {
            trip: {
              select: {
                id: true,
                name: true,
                description: true,
                startingPoint: true,
                startDate: true,
                endDate: true,
              },
            },
            requester: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                profileImageUrl: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        }),
      ])

      return NextResponse.json({
        sentRequests,
        receivedRequests,
      })
    }
  } catch (error) {
    console.error("❌ Error fetching trip requests:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trip requests",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// POST - Create a new trip request (including invitations)
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    // Ensure user exists in database first
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    })

    if (!dbUser) {
      console.log("🔄 User not found in DB, creating...")
      dbUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "",
          lastName: user.lastName || "",
          profileImageUrl: user.imageUrl || null,
        },
      })
      console.log("✅ User created in DB:", dbUser.clerkId)
    }

    const body = await request.json().catch(() => ({}))
    const { tripId, targetUserClerkId, message, type } = body

    // Handle different types of requests
    let requesterClerkId: string
    let receiverClerkId: string

    if (type === "INVITE") {
      // Trip handler is inviting someone
      if (!targetUserClerkId) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            required: ["tripId", "targetUserClerkId"],
          },
          { status: 400 },
        )
      }
      requesterClerkId = targetUserClerkId // The person being invited
      receiverClerkId = user.id // The trip handler (current user)
    } else {
      // Regular join request
      if (!tripId) {
        return NextResponse.json(
          {
            error: "Missing required fields",
            required: ["tripId"],
          },
          { status: 400 },
        )
      }
      requesterClerkId = user.id
      // We'll get the receiver from the trip
    }

    console.log("🔄 Creating trip request:", {
      tripId,
      requesterClerkId,
      receiverClerkId: receiverClerkId || "TBD",
      type: type || "JOIN",
      message: message || "No message",
    })

    // Get trip details and handler
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        name: true,
        handlerClerkId: true,
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

    // Set receiver for regular join requests
    if (type !== "INVITE") {
      receiverClerkId = trip.handlerClerkId
    }

    console.log("✅ Trip found:", trip.name, "Handler:", trip.handlerClerkId)

    // Ensure both users exist in database
    const [requester, receiver] = await Promise.all([
      prisma.user.findUnique({ where: { clerkId: requesterClerkId } }),
      prisma.user.findUnique({ where: { clerkId: receiverClerkId } }),
    ])

    if (!requester || !receiver) {
      return NextResponse.json(
        {
          error: "User not found",
          details: "One or both users are not properly set up in the database",
        },
        { status: 400 },
      )
    }

    // Check if user is already a member
    const existingMember = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId: trip.id,
          userClerkId: requesterClerkId,
        },
      },
    })

    if (existingMember) {
      return NextResponse.json(
        {
          error: "Already a member",
          details: "This user is already a member of this trip",
        },
        { status: 400 },
      )
    }

    // Check if user is the trip handler (for join requests)
    if (type !== "INVITE" && trip.handlerClerkId === requesterClerkId) {
      return NextResponse.json(
        {
          error: "Cannot request own trip",
          details: "You cannot send a request to join your own trip",
        },
        { status: 400 },
      )
    }

    // Check if request already exists
    const existingRequest = await prisma.tripRequest.findUnique({
      where: {
        tripId_requesterClerkId: {
          tripId: trip.id,
          requesterClerkId: requesterClerkId,
        },
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        {
          error: "Request already exists",
          details: `A ${existingRequest.status.toLowerCase()} request already exists for this trip`,
          existingRequest,
        },
        { status: 400 },
      )
    }

    console.log("🔄 Creating trip request in database...")

    // Create the trip request using a transaction
    const tripRequest = await prisma.$transaction(async (tx) => {
      const newRequest = await tx.tripRequest.create({
        data: {
          tripId: trip.id,
          requesterClerkId: requesterClerkId,
          receiverClerkId: receiverClerkId,
          message: message || null,
          status: "PENDING",
        },
        include: {
          trip: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          requester: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          receiver: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      console.log("✅ Trip request created in transaction:", newRequest.id)
      return newRequest
    })

    console.log("🎉 Trip request created successfully:", {
      id: tripRequest.id,
      status: tripRequest.status,
      tripName: tripRequest.trip.name,
      requester: `${tripRequest.requester.firstName} ${tripRequest.requester.lastName}`,
      receiver: `${tripRequest.receiver.firstName} ${tripRequest.receiver.lastName}`,
      type: type || "JOIN",
    })

    return NextResponse.json({
      message: `Trip ${type === "INVITE" ? "invitation" : "request"} sent successfully`,
      request: tripRequest,
      success: true,
    })
  } catch (error) {
    console.error("❌ Error creating trip request:", error)
    return NextResponse.json(
      {
        error: "Failed to create trip request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
