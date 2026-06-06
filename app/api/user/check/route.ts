import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const { clerkId } = body

    if (!clerkId) {
      return NextResponse.json(
        {
          error: "Missing clerkId",
          required: ["clerkId"],
        },
        { status: 400 },
      )
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    })

    return NextResponse.json({ exists: !!user })
  } catch (error) {
    console.error("❌ Error checking user:", error)
    return NextResponse.json(
      {
        error: "Failed to check user",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
