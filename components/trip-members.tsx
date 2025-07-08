"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Users, Crown, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Member {
  id: string
  role: string
  joinedAt: string
  user: {
    clerkId: string
    email: string
    firstName: string
    lastName: string
    profileImageUrl: string | null
  }
}

interface TripMembersProps {
  tripId: string
}

export default function TripMembers({ tripId }: TripMembersProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchMembers()
  }, [tripId])

  const fetchMembers = async () => {
    if (!tripId) return

    try {
      setIsLoading(true)
      setError("")
      console.log("🔄 Loading members for trip:", tripId)

      const response = await fetch(`/api/trips/${tripId}/members`)

      if (response.ok) {
        const data = await response.json()
        console.log("✅ Loaded members:", data.members?.length || 0)
        setMembers(data.members || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("❌ Failed to load members:", response.status, errorData)
        setError(errorData.details || errorData.error || `Failed to load members (${response.status})`)
      }
    } catch (error) {
      console.error("❌ Error fetching members:", error)
      setError("Network error: Failed to load members")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
        <CardContent className="flex justify-center items-center h-64">
          <div className="text-center">
            <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-500" />
            <p className="text-gray-400">Loading members...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
        <CardContent className="p-6">
          <Alert className="border-red-500/50 bg-red-500/10">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-green-400" />
          Trip Members ({members.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
            <p className="text-gray-400">No members found</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 rounded-lg border border-gray-700 bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.user.profileImageUrl || "/placeholder.svg"} />
                    <AvatarFallback className="bg-green-500/20 text-green-400 font-medium">
                      {member.user.firstName?.charAt(0) || member.user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-white">
                      {member.user.firstName} {member.user.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{member.user.email}</p>
                    <p className="text-xs text-gray-500">Joined {new Date(member.joinedAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge
                    variant={member.role === "HANDLER" ? "default" : "secondary"}
                    className={
                      member.role === "HANDLER"
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/50"
                        : "bg-gray-600/20 text-gray-400 border-gray-600/50"
                    }
                  >
                    {member.role === "HANDLER" && <Crown className="w-3 h-3 mr-1" />}
                    {member.role.toLowerCase()}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
