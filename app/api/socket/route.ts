import type { NextRequest } from "next/server"
import { Server } from "socket.io"

let io: Server

export async function GET(request: NextRequest) {
  if (!io) {
    const httpServer = (global as any).httpServer
    io = new Server(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      socket.on("join-trip", (tripId: string) => {
        socket.join(`trip-${tripId}`)
        console.log(`User ${socket.id} joined trip ${tripId}`)
      })

      socket.on("leave-trip", (tripId: string) => {
        socket.leave(`trip-${tripId}`)
        console.log(`User ${socket.id} left trip ${tripId}`)
      })

      socket.on("send-message", (data) => {
        const { tripId, message, userId, userName } = data
        io.to(`trip-${tripId}`).emit("new-message", {
          id: Date.now().toString(),
          message,
          userId,
          userName,
          createdAt: new Date().toISOString(),
        })
      })

      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)
      })
    })
  }

  return new Response("Socket.IO server initialized")
}
