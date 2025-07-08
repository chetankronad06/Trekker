"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, UserPlus, Loader2, AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface InviteUsersProps {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function InviteUsers({ tripId, open, onOpenChange }: InviteUsersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const searchUsers = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()
      if (response.ok) {
        setSearchResults(data.users)
      } else {
        setError(data.details || data.error || "Failed to search users")
      }
    } catch (error) {
      console.error("Error searching users:", error)
      setError("Failed to search users")
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserSelection = (userClerkId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userClerkId) ? prev.filter((id) => id !== userClerkId) : [...prev, userClerkId],
    )
  }

  const inviteUsers = async () => {
    if (selectedUsers.length === 0) return

    setIsInviting(true)
    setError("")

    try {
      console.log("🔄 Sending invites:", {
        tripId,
        userCount: selectedUsers.length,
        userIds: selectedUsers,
      })

      const response = await fetch(`/api/trips/${tripId}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userClerkIds: selectedUsers }),
      })

      const data = await response.json()
      console.log("📤 Invite response:", { status: response.status, data })

      if (response.ok) {
        toast({
          title: "🎉 Invites Sent Successfully!",
          description: `${selectedUsers.length} user${selectedUsers.length !== 1 ? "s" : ""} invited to the trip.`,
        })
        setSelectedUsers([])
        setSearchQuery("")
        setSearchResults([])
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      } else {
        console.error("❌ Invite failed:", data)
        toast({
          title: "❌ Failed to Send Invites",
          description: data.details || data.error || "Something went wrong while sending invites.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("❌ Error inviting users:", error)
      toast({
        title: "❌ Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsInviting(false)
    }
  }

  const handleClose = () => {
    if (!isInviting) {
      setSelectedUsers([])
      setSearchQuery("")
      setSearchResults([])
      setError("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800/95 backdrop-blur-sm border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
            Invite Users to Trip
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Search and invite existing users to join this trip
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="search" className="text-gray-300">
              Search Users
            </Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
              />
              <Button
                onClick={searchUsers}
                disabled={isLoading}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              <Label className="text-gray-300">Select Users to Invite</Label>
              {searchResults.map((user) => (
                <div
                  key={user.clerkId}
                  className="flex items-center space-x-3 p-3 rounded-lg border border-gray-700 bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                >
                  <Checkbox
                    checked={selectedUsers.includes(user.clerkId)}
                    onCheckedChange={() => toggleUserSelection(user.clerkId)}
                    className="border-gray-500 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                  />
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user.profileImageUrl || "/placeholder.svg"} />
                    <AvatarFallback className="bg-green-500/20 text-green-400">
                      {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium text-white">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isInviting}
            className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
          >
            Cancel
          </Button>
          <Button
            onClick={inviteUsers}
            disabled={selectedUsers.length === 0 || isInviting}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
          >
            {isInviting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Sending Invites...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite {selectedUsers.length} User{selectedUsers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
