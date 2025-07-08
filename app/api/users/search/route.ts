import { auth } from "@clerk/nextjs/server"
import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q")

    if (!query) {
      return NextResponse.json({ users: [] })
    }

    // Search users by email or name
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            NOT: {
              clerkId: userId, // Exclude current user
            },
          },
          {
            OR: [
              {
                email: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                firstName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
              {
                lastName: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            ],
          },
        ],
      },
      select: {
        clerkId: true,
        email: true,
        firstName: true,
        lastName: true,
        profileImageUrl: true,
      },
      take: 10,
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error searching users:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
