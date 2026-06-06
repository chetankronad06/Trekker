import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { clerkId },
    })

    if (existingUser) {
      // Update existing user with latest info
      const updatedUser = await prisma.user.update({
        where: { clerkId },
        data: {
          email,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          profileImageUrl: profileImageUrl || existingUser.profileImageUrl,
        },
      })

      console.log("✅ User updated successfully:", updatedUser.id)

      return NextResponse.json({
        message: "User updated successfully",
        user: updatedUser,
        isNew: false,
      })
    }

    // Create new user in database
    const user = await prisma.user.create({
      data: {
        clerkId,
        email,
        firstName: firstName || "Unknown",
        lastName: lastName || "User",
        profileImageUrl: profileImageUrl || null,
      },
    })

    console.log("🎉 New user created successfully:", user.id)

    return NextResponse.json({
      message: "User created successfully",
      user,
      isNew: true,
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
