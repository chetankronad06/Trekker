import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { currentUser } from "@clerk/nextjs/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { tripId } = await params

    // Verify user is a member of this trip
    const membership = await prisma.tripMember.findFirst({
      where: {
        tripId: tripId,
        userClerkId: user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You are not a member of this trip",
        },
        { status: 403 },
      )
    }

    const { message } = await request.json()
    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      )
    }

    const newMessage = await prisma.tripMessage.create({
      data: {
        tripId: tripId,
        userClerkId: user.id,
        message: message.trim(),
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    const formattedMessage = {
      id: newMessage.id,
      message: newMessage.message,
      userId: newMessage.userClerkId,
      userName: newMessage.user.firstName || newMessage.user.email,
      createdAt: newMessage.createdAt.toISOString(),
    }

    // Broadcast message via Supabase Realtime Broadcast channel
    try {
      const channel = supabase.channel(`trip-${tripId}`)
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.send({
            type: "broadcast",
            event: "new-message",
            payload: formattedMessage,
          }).then(() => {
            supabase.removeChannel(channel)
          })
        }
      })
    } catch (realtimeErr) {
      console.error("❌ Failed to broadcast message via Supabase Realtime:", realtimeErr)
    }

    return NextResponse.json({
      message: formattedMessage,
    })
  } catch (error) {
    console.error("❌ Error sending message:", error)
    return NextResponse.json(
      {
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ tripId: string }> }) {
  try {
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { tripId } = await params

    // Verify user is a member of this trip
    const membership = await prisma.tripMember.findFirst({
      where: {
        tripId: tripId,
        userClerkId: user.id,
      },
    })

    if (!membership) {
      return NextResponse.json(
        {
          error: "Access denied",
          details: "You are not a member of this trip",
        },
        { status: 403 },
      )
    }

    console.log("🔍 Fetching messages for trip:", tripId)

    // Fetch messages with user details
    const messages = await prisma.tripMessage.findMany({
      where: {
        tripId: tripId,
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Format messages for frontend
    const formattedMessages = messages.map((message) => ({
      id: message.id,
      message: message.message,
      userId: message.userClerkId,
      userName: message.user.firstName || message.user.email,
      createdAt: message.createdAt.toISOString(),
    }))

    console.log("✅ Found messages:", formattedMessages.length)

    return NextResponse.json({ messages: formattedMessages })
  } catch (error) {
    console.error("❌ Error fetching messages:", error)
    return NextResponse.json(
      {
        error: "Failed to fetch messages",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
