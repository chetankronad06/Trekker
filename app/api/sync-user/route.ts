import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function POST(request: NextRequest) {
  try {
    const { clerkId, email, firstName, lastName, profileImageUrl } = await request.json()

    if (!clerkId || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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
    return NextResponse.json(
      {
        error: "Failed to sync user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// GET endpoint to fetch user data
export async function GET() {
  try {
    const user = await currentUser()

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    console.log("🔍 Fetching user data for:", user.id)

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: user.id },
    })

    if (!dbUser) {
      // If user doesn't exist in DB, create them
      console.log("👤 User not found in DB, creating new user...")

      const newUser = await prisma.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0]?.emailAddress || "",
          firstName: user.firstName || "Unknown",
          lastName: user.lastName || "User",
          profileImageUrl: user.imageUrl || null,
        },
      })

      console.log("✅ New user created from GET request:", newUser.id)

      return NextResponse.json({
        user: newUser,
        isNew: true,
      })
    }

    console.log("✅ User data fetched successfully:", dbUser.id)

    return NextResponse.json({
      user: dbUser,
      isNew: false,
    })
  } catch (error) {
    console.error("❌ Error fetching user:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
