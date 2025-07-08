"use client"

import { io, type Socket } from "socket.io-client"

let socket: Socket | null = null

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000", {
      autoConnect: false,
    })
  }
  return socket
}

export const connectSocket = (userId: string) => {
  const socketInstance = getSocket()
  if (!socketInstance.connected) {
    socketInstance.auth = { userId }
    socketInstance.connect()
  }
  return socketInstance
}

export const disconnectSocket = () => {
  if (socket?.connected) {
    socket.disconnect()
  }
}
