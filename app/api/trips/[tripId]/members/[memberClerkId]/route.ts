import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function DELETE(request: NextRequest, { params }: { params: { tripId: string; memberClerkId: string } }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Removing member:", params.memberClerkId, "from trip:", params.tripId)

    // Check if user is the trip handler
    const trip = await prisma.trip.findUnique({
      where: { id: params.tripId },
      select: { handlerClerkId: true, name: true },
    })

    if (!trip || trip.handlerClerkId !== user.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 })
    }

    // Cannot remove the trip handler
    if (params.memberClerkId === user.id) {
      return NextResponse.json(
        {
          error: "Cannot remove handler",
          details: "Trip handler cannot be removed from the trip",
        },
        { status: 400 },
      )
    }

    // Check if member exists
    const member = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId: params.tripId,
          userClerkId: params.memberClerkId,
        },
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    if (!member) {
      return NextResponse.json(
        {
          error: "Member not found",
          details: "This user is not a member of this trip",
        },
        { status: 404 },
      )
    }

    console.log("🔄 Removing member from database...")

    // Remove member and create notification using transaction
    await prisma.$transaction(async (tx) => {
      // Remove trip member
      await tx.tripMember.delete({
        where: {
          tripId_userClerkId: {
            tripId: params.tripId,
            userClerkId: params.memberClerkId,
          },
        },
      })

      // Create notification for the removed member
      await tx.notification.create({
        data: {
          userClerkId: params.memberClerkId,
          type: "MEMBER_REMOVED",
          title: "Removed from Trip",
          message: `You have been removed from "${trip.name}" by the trip organizer.`,
          data: {
            tripId: params.tripId,
            tripName: trip.name,
            removedBy: user.id,
            removedAt: new Date().toISOString(),
          },
        },
      })

      console.log("✅ Member removed and notification created")
    })

    console.log("🎉 Member removal completed:", {
      tripName: trip.name,
      removedMember: `${member.user.firstName} ${member.user.lastName}`,
      removedBy: user.id,
    })

    return NextResponse.json({
      message: "Member removed successfully",
      success: true,
    })
  } catch (error) {
    console.error("❌ Error removing member:", error)
    return NextResponse.json(
      {
        error: "Failed to remove member",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
