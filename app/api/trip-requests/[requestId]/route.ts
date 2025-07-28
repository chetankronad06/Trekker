import { type NextRequest, NextResponse } from "next/server"
import { prisma, testDatabaseConnection } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

// PUT - Update request status (accept/reject)
export async function PUT(request: NextRequest, { params }: { params: { requestId: string } }) {
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

    const body = await request.json().catch(() => ({}))
    const { action } = body // 'accept' or 'reject'

    if (!action || !["accept", "reject"].includes(action)) {
      return NextResponse.json(
        {
          error: "Invalid action",
          details: "Action must be 'accept' or 'reject'",
        },
        { status: 400 },
      )
    }

    console.log("🔄 Processing request action:", {
      requestId: params.requestId,
      action,
      userId: user.id,
    })

    // Get the request with trip details
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: params.requestId },
      include: {
        trip: true,
        requester: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    if (!tripRequest) {
      return NextResponse.json(
        {
          error: "Request not found",
          details: "The trip request does not exist",
        },
        { status: 404 },
      )
    }

    // Verify user is the receiver (trip handler)
    if (tripRequest.receiverClerkId !== user.id) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You can only respond to requests for your own trips",
        },
        { status: 403 },
      )
    }

    // Check if request is still pending
    if (tripRequest.status !== "PENDING") {
      return NextResponse.json(
        {
          error: "Request already processed",
          details: `This request has already been ${tripRequest.status.toLowerCase()}`,
        },
        { status: 400 },
      )
    }

    const newStatus = action === "accept" ? "ACCEPTED" : "REJECTED"

    // Start a transaction to update request and potentially add member
    const result = await prisma.$transaction(async (tx) => {
      // Update the request status
      const updatedRequest = await tx.tripRequest.update({
        where: { id: params.requestId },
        data: {
          status: newStatus,
          updatedAt: new Date(),
        },
        include: {
          trip: {
            select: {
              id: true,
              name: true,
            },
          },
          requester: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      })

      // If accepted, add user as trip member
      if (action === "accept") {
        await tx.tripMember.create({
          data: {
            tripId: tripRequest.tripId,
            userClerkId: tripRequest.requesterClerkId,
            role: "MEMBER",
          },
        })
        await tx.notification.create({
        data: {
          userClerkId:  tripRequest.requesterClerkId,
          type: "REQUEST_ACCEPTED",
          title: "Request Accepted",
          message: `Your request to join "${tripRequest.trip.name}" has been accepted.`,
          data: {
            tripId: tripRequest.tripId,
            tripName: tripRequest.trip.name,
            acceptedBy: user.id,
            acceptedAt: new Date().toISOString(),
          },
        },
      })
      }
      if (newStatus === "REJECTED") {
        await tx.notification.create({
        data: {
          userClerkId:  tripRequest.requesterClerkId,
          type: "REQUEST_REJECTED",
          title: "Request Rejected",
          message: `Your request to join "${tripRequest.trip.name}" has been rejected.`,
          data: {
            tripId: tripRequest.tripId,
            tripName: tripRequest.trip.name,
            rejectedBy: user.id,
            rejectedAt: new Date().toISOString(),
          },
        },
      })
      }

      return updatedRequest
    })

    console.log(`✅ Request ${action}ed successfully:`, result.id)

    return NextResponse.json({
      message: `Request ${action}ed successfully`,
      request: result,
    })
  } catch (error) {
    console.error(`❌ Error processing request:`, error)
    return NextResponse.json(
      {
        error: "Failed to process request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// DELETE - Cancel/delete a request
export async function DELETE(request: NextRequest, { params }: { params: { requestId: string } }) {
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

    console.log("🔄 Deleting trip request:", {
      requestId: params.requestId,
      userId: user.id,
    })

    // Get the request
    const tripRequest = await prisma.tripRequest.findUnique({
      where: { id: params.requestId },
    })

    if (!tripRequest) {
      return NextResponse.json(
        {
          error: "Request not found",
          details: "The trip request does not exist",
        },
        { status: 404 },
      )
    }

    // Verify user is the requester
    if (tripRequest.requesterClerkId !== user.id) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You can only cancel your own requests",
        },
        { status: 403 },
      )
    }

    // Delete the request
    await prisma.tripRequest.delete({
      where: { id: params.requestId },
    })

    console.log("✅ Request deleted successfully:", params.requestId)

    return NextResponse.json({
      message: "Request cancelled successfully",
    })
  } catch (error) {
    console.error("❌ Error deleting request:", error)
    return NextResponse.json(
      {
        error: "Failed to cancel request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
