"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, MessageCircle, Loader2 } from "lucide-react"
import { connectSocket, disconnectSocket } from "@/lib/socket"
import type { Socket } from "socket.io-client"

interface Message {
  id: string
  message: string
  userId: string
  userName: string
  createdAt: string
}

interface TripChatProps {
  tripId: string
}

export default function TripChat({ tripId }: TripChatProps) {
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load existing messages when component mounts or tripId changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!tripId) return

      try {
        setIsLoading(true)
        setError("")
        console.log("🔄 Loading messages for trip:", tripId)

        const response = await fetch(`/api/trips/${tripId}/messages`)
        if (response.ok) {
          const data = await response.json()
          console.log("✅ Loaded messages:", data.messages?.length || 0)
          setMessages(data.messages || [])
        } else {
          const errorData = await response.json()
          console.error("❌ Failed to load messages:", errorData)
          setError("Failed to load chat history")
        }
      } catch (error) {
        console.error("❌ Error loading messages:", error)
        setError("Failed to load chat history")
      } finally {
        setIsLoading(false)
      }
    }

    loadMessages()
  }, [tripId])

  // Setup socket connection
  useEffect(() => {
    if (user && tripId) {
      const socketInstance = connectSocket(user.id)
      setSocket(socketInstance)

      socketInstance.emit("join-trip", tripId)

      socketInstance.on("new-message", (message: Message) => {
        console.log("📨 Received new message:", message)
        setMessages((prev) => {
          const messageExists = prev.some((existingMessage) => existingMessage.id === message.id)
          if (messageExists) {
            console.log("⚠️ Message already exists, skipping:", message.id)
            return prev
          }
          console.log("✅ Adding new message to chat")
          return [...prev, message]
        })
      })

      return () => {
        socketInstance.emit("leave-trip", tripId)
        disconnectSocket()
      }
    }
  }, [user, tripId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !socket || !user) return

    socket.emit("send-message", {
      tripId,
      message: newMessage,
      userId: user.id,
      userName: user.firstName || user.emailAddresses[0]?.emailAddress || "Unknown",
    })

    setNewMessage("")
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-[500px] flex flex-col">
      <CardHeader className="flex-shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageCircle className="w-5 h-5 text-green-400" />
          Group Chat
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-4 min-h-0">
        {/* Messages Container - FIXED HEIGHT */}
        <div className="flex-1 min-h-0 mb-4">
          <div className="h-full overflow-y-auto pr-2 space-y-3" style={{ maxHeight: "350px" }}>
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-500" />
                  <p>Loading chat history...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
                  <p>{error}</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <div
                    key={`${message.id}-${index}`}
                    className={`flex gap-3 ${message.userId === user?.id ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-green-500/20 text-green-400 text-xs">
                        {message.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[70%] rounded-lg p-3 break-words word-wrap ${
                        message.userId === user?.id
                          ? "bg-green-500/20 text-green-100 border border-green-500/30"
                          : "bg-gray-700/50 text-gray-100 border border-gray-600/30"
                      }`}
                      style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
                    >
                      <p className="text-xs font-medium mb-1 opacity-80">{message.userName}</p>
                      <p className="text-sm" style={{ wordBreak: "break-word" }}>
                        {message.message}
                      </p>
                      <p className="text-xs opacity-60 mt-1">{new Date(message.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>
        </div>

        {/* Message Input - FIXED AT BOTTOM */}
        <div className="flex-shrink-0 border-t border-gray-700 pt-3">
          <form onSubmit={sendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-shrink-0"
              disabled={isLoading || !newMessage.trim()}
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  )
}
