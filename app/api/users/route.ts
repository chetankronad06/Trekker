import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { clerkId, email, firstName, lastName, profileImageUrl } = body

    // Create or update user
    const user = await prisma.user.upsert({
      where: { clerkId },
      update: {
        email,
        firstName,
        lastName,
        profileImageUrl,
      },
      create: {
        clerkId,
        email,
        firstName,
        lastName,
        profileImageUrl,
      },
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error creating/updating user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
