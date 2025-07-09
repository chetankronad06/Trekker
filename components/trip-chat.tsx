"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, MessageCircle, Users, Clock, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { connectSocket, disconnectSocket } from "@/lib/socket"
import type { Socket } from "socket.io-client"

interface Message {
  id: string
  message: string
  createdAt: string
  user?: {
    clerkId: string
    firstName: string
    lastName: string
    profileImageUrl: string | null
  }
  // Fallback fields for older message format
  userId?: string
  userName?: string
}

interface TripChatProps {
  tripId: string
}

export default function TripChat({ tripId }: TripChatProps) {
  const { user: clerkUser } = useUser()
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])
  const [socket, setSocket] = useState<Socket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await fetch(`/api/trips/${tripId}/messages`)
        if (response.ok) {
          const data = await response.json()
          setMessages(data.messages || [])
        }
      } catch (error) {
        console.error("Error fetching messages:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMessages()
  }, [tripId])

  // Socket connection
  useEffect(() => {
    if (!clerkUser) return

    const socketInstance = connectSocket(clerkUser.id)
    setSocket(socketInstance)

    socketInstance.emit("join-trip", tripId)

    socketInstance.on("new-message", (message: Message) => {
      setMessages((prev) => {
        const messageExists = prev.some((existingMessage) => existingMessage.id === message.id)
        if (messageExists) return prev
        return [...prev, message]
      })
    })

    socketInstance.on("online-users", (users: string[]) => {
      setOnlineUsers(users)
    })

    return () => {
      socketInstance.emit("leave-trip", tripId)
      disconnectSocket()
    }
  }, [tripId, clerkUser])

  // Auto scroll on new messages
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/trips/${tripId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      })

      if (response.ok) {
        setNewMessage("")
      } else {
        toast({
          title: "❌ Failed to send message",
          description: "Please try again",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
    }
  }

  const getInitials = (firstName?: string, lastName?: string, fallbackName?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]?.toUpperCase() || ""}${lastName[0]?.toUpperCase() || ""}`
    }
    if (fallbackName) {
      const parts = fallbackName.split(" ")
      if (parts.length >= 2) {
        return `${parts[0][0]?.toUpperCase() || ""}${parts[1][0]?.toUpperCase() || ""}`
      }
      return fallbackName[0]?.toUpperCase() || "U"
    }
    return "U"
  }

  const getUserId = (message: Message) => {
    return message.user?.clerkId || message.userId || ""
  }

  const getUserName = (message: Message) => {
    if (message.user?.firstName && message.user?.lastName) {
      return `${message.user.firstName} ${message.user.lastName}`
    }
    return message.userName || "Unknown User"
  }

  const isMyMessage = (message: Message) => {
    const messageUserId = getUserId(message)
    return messageUserId === clerkUser?.id
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading messages...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-full flex flex-col">
      <CardHeader className="pb-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-green-400" />
            <CardTitle className="text-white text-lg">Group Chat</CardTitle>
          </div>
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50 text-xs">
                <Users className="w-3 h-3 mr-1" />
                {onlineUsers.length} online
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>

      {/* Messages Container */}
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No messages yet</h3>
              <p className="text-gray-400">Start the conversation with your travel companions!</p>
            </div>
          ) : (
            messages.map((message, index) => {
              const isMe = isMyMessage(message)
              const currentUserId = getUserId(message)
              const previousUserId = index > 0 ? getUserId(messages[index - 1]) : null
              const nextUserId = index < messages.length - 1 ? getUserId(messages[index + 1]) : null

              const showAvatar = currentUserId !== previousUserId
              const showTimestamp =
                currentUserId !== nextUserId ||
                (index < messages.length - 1 &&
                  new Date(messages[index + 1].createdAt).getTime() - new Date(message.createdAt).getTime() >
                    5 * 60 * 1000)

              const userName = getUserName(message)

              return (
                <div key={message.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div className={`flex max-w-[70%] ${isMe ? "flex-row-reverse" : "flex-row"} gap-2`}>
                    {/* Avatar */}
                    <div className={`flex-shrink-0 ${showAvatar ? "visible" : "invisible"}`}>
                      {message.user?.profileImageUrl ? (
                        <img
                          src={message.user.profileImageUrl || "/placeholder.svg"}
                          alt={userName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium text-white ${
                            isMe ? "bg-green-500" : "bg-blue-500"
                          }`}
                        >
                          {getInitials(message.user?.firstName, message.user?.lastName, userName)}
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      {/* Name */}
                      {showAvatar && !isMe && <span className="text-xs text-gray-400 mb-1 px-3">{userName}</span>}

                      {/* Message Bubble */}
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-full break-words ${
                          isMe
                            ? "bg-gradient-to-r from-green-500 to-green-600 text-white rounded-br-md"
                            : "bg-gray-700 text-white rounded-bl-md"
                        }`}
                      >
                        <p className="text-sm leading-relaxed">{message.message}</p>
                      </div>

                      {/* Timestamp */}
                      {showTimestamp && (
                        <div className={`flex items-center gap-1 mt-1 px-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                          <Clock className="w-3 h-3 text-gray-500" />
                          <span className="text-xs text-gray-500">{formatTime(message.createdAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t border-gray-700 p-4">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
              disabled={isSending}
              maxLength={500}
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4"
            >
              {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </form>
          {newMessage.length > 400 && (
            <p className="text-xs text-gray-400 mt-1 text-right">{500 - newMessage.length} characters remaining</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
