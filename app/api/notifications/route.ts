import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const unreadOnly = searchParams.get("unread") === "true"

    console.log("🔍 Fetching notifications for user:", user.id)

    const notifications = await prisma.notification.findMany({
      where: {
        userClerkId: user.id,
        ...(unreadOnly && { read: false }),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent 50 notifications
    })

    console.log("✅ Found notifications:", notifications.length)

    return NextResponse.json({ notifications })
  } catch (error) {
    console.error("❌ Error fetching notifications:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { notificationId, markAllAsRead } = body

    if (markAllAsRead) {
      // Mark all notifications as read
      await prisma.notification.updateMany({
        where: {
          userClerkId: user.id,
          read: false,
        },
        data: {
          read: true,
        },
      })

      return NextResponse.json({ message: "All notifications marked as read" })
    } else if (notificationId) {
      // Mark specific notification as read
      await prisma.notification.update({
        where: {
          id: notificationId,
          userClerkId: user.id,
        },
        data: {
          read: true,
        },
      })

      return NextResponse.json({ message: "Notification marked as read" })
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("❌ Error updating notifications:", error)
    return NextResponse.json(
      {
        error: "Failed to update notifications",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
