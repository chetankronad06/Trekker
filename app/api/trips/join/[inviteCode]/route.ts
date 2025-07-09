import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function POST(request: NextRequest, { params }: { params: { inviteCode: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Processing join request for invite code:", params.inviteCode)
    console.log("🔍 User ID:", user.id)

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
    const { message, checkOnly } = body

    // Find trip by invite code
    const trip = await prisma.trip.findUnique({
      where: {
        inviteCode: params.inviteCode,
      },
      select: {
        id: true,
        name: true,
        description: true,
        handlerClerkId: true,
        startingPoint: true,
        startDate: true,
        endDate: true,
      },
    })

    if (!trip) {
      return NextResponse.json(
        {
          error: "Invalid invite code",
          details: "The invite code does not exist or has expired",
        },
        { status: 404 },
      )
    }

    console.log("✅ Trip found:", trip.name, "Handler:", trip.handlerClerkId)

    // Check if user is already a member
    const existingMember = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId: trip.id,
          userClerkId: user.id,
        },
      },
    })

    if (existingMember) {
      console.log("ℹ️ User already a member of trip:", trip.name)
      return NextResponse.json({
        message: "Already a member",
        trip,
        status: "member",
      })
    }

    // Check if user is the trip handler
    if (trip.handlerClerkId === user.id) {
      return NextResponse.json(
        {
          error: "Cannot join own trip",
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
          requesterClerkId: user.id,
        },
      },
    })

    if (existingRequest) {
      console.log("ℹ️ Request already exists:", existingRequest.status)
      return NextResponse.json({
        message: `Request already ${existingRequest.status.toLowerCase()}`,
        trip,
        status: existingRequest.status.toLowerCase(),
        request: existingRequest,
      })
    }

    // If this is just a status check, return that no request exists
    if (checkOnly) {
      return NextResponse.json({
        trip,
        status: "none",
      })
    }

    // Ensure trip handler exists in database
    const tripHandler = await prisma.user.findUnique({
      where: { clerkId: trip.handlerClerkId },
    })

    if (!tripHandler) {
      console.log("⚠️ Trip handler not found in DB")
      return NextResponse.json(
        {
          error: "Trip handler not found",
          details: "The trip handler is not properly set up in the database",
        },
        { status: 400 },
      )
    }

    console.log("🔄 Creating trip join request:", {
      tripId: trip.id,
      tripName: trip.name,
      requesterClerkId: user.id,
      receiverClerkId: trip.handlerClerkId,
      userEmail: user.emailAddresses[0]?.emailAddress,
      message: message || "No message",
    })

    // Create trip request with explicit transaction
    const tripRequest = await prisma.$transaction(async (tx) => {
      console.log("🔄 Starting transaction to create trip request...")
      const newRequest = await tx.tripRequest.create({
        data: {
          tripId: trip.id,
          requesterClerkId: user.id,
          receiverClerkId: trip.handlerClerkId,
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
      requestId: tripRequest.id,
      status: tripRequest.status,
      tripName: tripRequest.trip.name,
      requester: `${tripRequest.requester.firstName} ${tripRequest.requester.lastName}`,
      receiver: `${tripRequest.receiver.firstName} ${tripRequest.receiver.lastName}`,
    })

    return NextResponse.json({
      message: "Trip request sent successfully",
      trip,
      status: "pending",
      request: tripRequest,
      success: true,
    })
  } catch (error) {
    console.error("❌ Error processing join request:", error)
    return NextResponse.json(
      {
        error: "Failed to process join request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: { inviteCode: string } }) {
  try {
    console.log("🔍 Fetching trip info for invite code:", params.inviteCode)

    const trip = await prisma.trip.findUnique({
      where: {
        inviteCode: params.inviteCode,
      },
      select: {
        id: true,
        name: true,
        description: true,
        handlerClerkId: true,
        startingPoint: true,
        startDate: true,
        endDate: true,
        handler: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!trip) {
      return NextResponse.json(
        {
          error: "Invalid invite code",
          details: "The invite code does not exist or has expired",
        },
        { status: 404 },
      )
    }

    console.log("✅ Trip found:", trip.name)

    return NextResponse.json({ trip })
  } catch (error) {
    console.error("❌ Error fetching trip:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch trip",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
