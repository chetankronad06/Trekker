"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Search, X, AlertTriangle, UserPlus, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const { user: clerkUser } = useUser()
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [inviteMessage, setInviteMessage] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState("")
  const [isInviting, setIsInviting] = useState(false)

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      setError("")

      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          // Filter out current user and already selected users
          const filteredUsers = data.users.filter(
            (user: User) =>
              user.clerkId !== clerkUser?.id && !selectedUsers.some((selected) => selected.clerkId === user.clerkId),
          )
          setSearchResults(filteredUsers)
        } else {
          setError("Failed to search users")
        }
      } catch (error) {
        setError("Failed to search users")
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, clerkUser?.id, selectedUsers])

  const handleSelectUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user])
    setSearchResults(searchResults.filter((u) => u.clerkId !== user.clerkId))
    setSearchQuery("")
  }

  const handleRemoveUser = (userClerkId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.clerkId !== userClerkId))
  }

  const inviteUsers = async () => {
    if (selectedUsers.length === 0) return

    setIsInviting(true)
    setError("")

    try {
      console.log("🔄 Sending invite requests:", {
        tripId,
        userCount: selectedUsers.length,
        userIds: selectedUsers,
      })

      // Send individual requests for each user instead of auto-adding
      const invitePromises = selectedUsers.map((user) =>
        fetch("/api/trip-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            targetUserClerkId: user.clerkId,
            message: inviteMessage || `You've been invited to join this trip!`,
            type: "INVITE", // Mark as invitation request
          }),
        }),
      )

      const responses = await Promise.all(invitePromises)
      const successCount = responses.filter((r) => r.ok).length
      const failCount = responses.length - successCount

      console.log("📤 Invite results:", { successCount, failCount })

      if (successCount > 0) {
        toast({
          title: "🎉 Invitations Sent!",
          description: `${successCount} invitation${successCount !== 1 ? "s" : ""} sent successfully${
            failCount > 0 ? `. ${failCount} failed.` : ""
          }`,
        })
      }

      if (failCount === responses.length) {
        toast({
          title: "❌ All Invitations Failed",
          description: "Failed to send invitations. Please try again.",
          variant: "destructive",
        })
      }

      // Reset form on success
      if (successCount > 0) {
        setSelectedUsers([])
        setSearchQuery("")
        setSearchResults([])
        setTimeout(() => {
          onOpenChange(false)
        }, 1000)
      }
    } catch (error) {
      console.error("❌ Error sending invitations:", error)
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
    setSelectedUsers([])
    setInviteMessage("")
    setSearchQuery("")
    setSearchResults([])
    setError("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Invite Users to Trip</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Error Alert */}
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="search" className="text-sm font-medium text-gray-300">
              Search Users
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
              />
            </div>
          </div>

          {/* Search Results */}
          {searchQuery.length >= 2 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">Search Results</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 custom-scrollbar">
                {isSearching ? (
                  <div className="text-center py-4 text-gray-400">Searching...</div>
                ) : searchResults.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">No users found</div>
                ) : (
                  searchResults.map((user) => (
                    <Card
                      key={user.clerkId}
                      className="bg-gray-700/50 border-gray-600 cursor-pointer hover:bg-gray-700/70 transition-colors"
                      onClick={() => handleSelectUser(user)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {user.firstName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{user.email}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="text-green-400 hover:text-green-300">
                            Select
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-300">Selected Users ({selectedUsers.length})</Label>
              <div className="flex flex-wrap gap-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.clerkId}
                    className="bg-green-500/20 text-green-400 border-green-500/50 px-3 py-1 flex items-center gap-2"
                  >
                    <span>
                      {user.firstName} {user.lastName}
                    </span>
                    <button
                      onClick={() => handleRemoveUser(user.clerkId)}
                      className="text-green-300 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Invite Message */}
          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-gray-300">
              Invitation Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal message to your invitation..."
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-700">
          <Button
            onClick={handleClose}
            variant="outline"
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
                Sending Invitations...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Send {selectedUsers.length} Invitation{selectedUsers.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
