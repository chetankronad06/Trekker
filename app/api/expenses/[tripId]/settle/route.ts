import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { tripId } = await params
    const body = await request.json().catch(() => ({}))
    const { debtorClerkId, creditorClerkId } = body

    if (!debtorClerkId || !creditorClerkId) {
      return NextResponse.json(
        { error: "Missing required fields: debtorClerkId and creditorClerkId" },
        { status: 400 }
      )
    }

    // Verify the caller is a member of the trip
    const membership = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId,
          userClerkId: userId,
        },
      },
    })

    if (!membership) {
      return NextResponse.json({ error: "Not a member of this trip" }, { status: 403 })
    }

    console.log(`💸 Settle request: ${debtorClerkId} owes ${creditorClerkId} in trip ${tripId}`)

    // Update all unsettled expense splits matching the criteria
    const updateResult = await prisma.expenseSplit.updateMany({
      where: {
        userClerkId: debtorClerkId,
        settled: false,
        expense: {
          tripId: tripId,
          paidByClerkId: creditorClerkId,
        },
      },
      data: {
        settled: true,
        settledAt: new Date(),
      },
    })

    console.log(`✅ Settled ${updateResult.count} splits from ${debtorClerkId} to ${creditorClerkId}`)

    return NextResponse.json({
      success: true,
      settledCount: updateResult.count,
      message: `Successfully settled ${updateResult.count} expense split(s) between members.`,
    })
  } catch (error) {
    console.error("❌ Error in settle API endpoint:", error)
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
