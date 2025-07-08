import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { Server } from "socket.io"
import { PrismaClient } from "@prisma/client"

const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error("Error occurred handling", req.url, err)
      res.statusCode = 500
      res.end("internal server error")
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  })

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id)

    socket.on("join-trip", (tripId) => {
      socket.join(`trip-${tripId}`)
      console.log(`User ${socket.id} joined trip ${tripId}`)
    })

    socket.on("leave-trip", (tripId) => {
      socket.leave(`trip-${tripId}`)
      console.log(`User ${socket.id} left trip ${tripId}`)
    })

    socket.on("send-message", async (data) => {
      const { tripId, message, userId } = data

      try {
        // Save message to database using Prisma
        const prisma = new PrismaClient()

        const savedMessage = await prisma.tripMessage.create({
          data: {
            tripId,
            userClerkId: userId, // Using clerkId
            message,
          },
          include: {
            user: true,
          },
        })

        // Broadcast to all users in the trip room
        io.to(`trip-${tripId}`).emit("new-message", {
          id: savedMessage.id,
          message: savedMessage.message,
          userId: savedMessage.userClerkId,
          userName: savedMessage.user.firstName || savedMessage.user.email,
          createdAt: savedMessage.createdAt.toISOString(),
        })

        await prisma.$disconnect()
      } catch (error) {
        console.error("Error saving message:", error)
      }
    })

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)
    })
  })

  httpServer
    .once("error", (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})
