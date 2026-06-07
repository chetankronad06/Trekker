import { type NextRequest, NextResponse } from "next/server"
import { syncUserToDb } from "@/lib/user"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clerkId, email, firstName, lastName, profileImageUrl } = body

    if (!clerkId || !email) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          required: ["clerkId", "email"],
        },
        { status: 400 },
      )
    }

    console.log("🔄 Syncing user to database:", {
      clerkId,
      email,
      firstName: firstName || "Unknown",
      lastName: lastName || "User",
    })

    const user = await syncUserToDb({
      clerkId,
      email,
      firstName: firstName || "Unknown",
      lastName: lastName || "User",
      profileImageUrl: profileImageUrl || null,
    })

    console.log("🎉 User synced successfully:", user.id)

    return NextResponse.json({
      message: "User synced successfully",
      user,
      isNew: false,
    })
  } catch (error) {
    console.error("❌ Error syncing user:", error)

    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes("Unique constraint")) {
        return NextResponse.json(
          {
            error: "User already exists",
            details: "A user with this email or Clerk ID already exists",
          },
          { status: 409 },
        )
      }
    }

    return NextResponse.json(
      {
        error: "Failed to sync user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
