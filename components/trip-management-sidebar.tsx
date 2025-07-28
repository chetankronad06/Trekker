"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Settings, Users, UserPlus, UserMinus, Crown, Clock, Check, X, Search } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface TripMember {
  id: string
  userClerkId: string
  role: string
  joinedAt: string
  user: {
    firstName: string
    lastName: string
    email: string
    profileImageUrl: string | null
  }
}

interface TripRequest {
  id: string
  status: string
  message: string
  createdAt: string
  requester: {
    firstName: string
    lastName: string
    email: string
    profileImageUrl: string | null
  }
}

interface User {
  clerkId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

interface TripManagementSidebarProps {
  tripId: string
  tripName: string
  isHandler: boolean
}

export default function TripManagementSidebar({ tripId, tripName, isHandler }: TripManagementSidebarProps) {
  const { user: clerkUser } = useUser()
  const { toast } = useToast()

  const [members, setMembers] = useState<TripMember[]>([])
  const [requests, setRequests] = useState<TripRequest[]>([])
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUsers, setSelectedUsers] = useState<User[]>([])
  const [inviteMessage, setInviteMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Fetch trip data
  useEffect(() => {
    const fetchTripData = async () => {
      if (!isHandler) return

      try {
        // Fetch members
        const membersResponse = await fetch(`/api/trips/${tripId}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData.members || [])
        }

        // Fetch pending requests
        const requestsResponse = await fetch(`/api/trip-requests?type=received&tripId=${tripId}`)
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setRequests(requestsData.requests || [])
        }
      } catch (error) {
        console.error("Error fetching trip data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTripData()
  }, [tripId, isHandler])

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        return
      }

      setIsSearching(true)
      try {
        const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`)
        if (response.ok) {
          const data = await response.json()
          // Filter out current user and existing members
          const filteredUsers = data.users.filter(
            (user: User) =>
              user.clerkId !== clerkUser?.id &&
              !members.some((member) => member.userClerkId === user.clerkId) &&
              !selectedUsers.some((selected) => selected.clerkId === user.clerkId),
          )
          setSearchResults(filteredUsers)
        }
      } catch (error) {
        console.error("Error searching users:", error)
      } finally {
        setIsSearching(false)
      }
    }

    const debounceTimer = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounceTimer)
  }, [searchQuery, clerkUser?.id, members, selectedUsers])

  const handleSelectUser = (user: User) => {
    setSelectedUsers([...selectedUsers, user])
    setSearchResults(searchResults.filter((u) => u.clerkId !== user.clerkId))
    setSearchQuery("")
  }

  const handleRemoveUser = (userClerkId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.clerkId !== userClerkId))
  }

  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return

    setIsSending(true)
    try {
      const invitePromises = selectedUsers.map((user) =>
        fetch("/api/trip-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tripId,
            targetUserClerkId: user.clerkId,
            message: inviteMessage || `You've been invited to join "${tripName}"!`,
            type: "INVITE",
          }),
        }),
      )

      const responses = await Promise.all(invitePromises)
      const successCount = responses.filter((r) => r.ok).length

      if (successCount > 0) {
        toast({
          title: "🎉 Invitations Sent!",
          description: `${successCount} invitation${successCount !== 1 ? "s" : ""} sent successfully.`,
        })
        setSelectedUsers([])
        setInviteMessage("")
        setShowInviteDialog(false)
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to send invitations",
        variant: "destructive",
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleRequestAction = async (requestId: string, action: "accept" | "reject") => {
    try {
      const response = await fetch(`/api/trip-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })

      if (response.ok) {
        toast({
          title: action === "accept" ? "✅ Request Accepted" : "❌ Request Rejected",
          description: `Join request has been ${action}ed successfully.`,
        })

        // Refresh requests
        const requestsResponse = await fetch(`/api/trip-requests?type=received&tripId=${tripId}`)
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setRequests(requestsData.requests || [])
        }

        // Refresh members if accepted
        if (action === "accept") {
          const membersResponse = await fetch(`/api/trips/${tripId}/members`)
          if (membersResponse.ok) {
            const membersData = await membersResponse.json()
            setMembers(membersData.members || [])
          }
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "❌ Action Failed",
          description: errorData.details || `Failed to ${action} request`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: `Failed to ${action} request`,
        variant: "destructive",
      })
    }
  }

  const handleRemoveMember = async (memberClerkId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this trip?`)) return

    try {
      const response = await fetch(`/api/trips/${tripId}/members/${memberClerkId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "✅ Member Removed",
          description: `${memberName} has been removed from the trip.`,
        })

        // Refresh members
        const membersResponse = await fetch(`/api/trips/${tripId}/members`)
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData.members || [])
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "❌ Remove Failed",
          description: errorData.details || "Failed to remove member",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to remove member",
        variant: "destructive",
      })
    }
  }

  if (!isHandler) {
    return null
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 bg-transparent"
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Trip
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] bg-gray-800 border-gray-700 text-white overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-400" />
            Manage Trip
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Manage members, invitations, and trip settings for "{tripName}"
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <Tabs defaultValue="members" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-700/50">
              <TabsTrigger
                value="members"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
              >
                Members ({members.length})
              </TabsTrigger>
              <TabsTrigger
                value="requests"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
              >
                Requests ({requests.filter((r) => r.status === "PENDING").length})
              </TabsTrigger>
              <TabsTrigger
                value="invite"
                className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
              >
                Invite
              </TabsTrigger>
            </TabsList>

            {/* Members Tab */}
            <TabsContent value="members" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Trip Members</h3>
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </Badge>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {members.map((member) => (
                  <Card key={member.id} className="bg-gray-700/50 border-gray-600">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {member.user.profileImageUrl ? (
                            <img
                              src={member.user.profileImageUrl || "/placeholder.svg"}
                              alt={`${member.user.firstName} ${member.user.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                              {member.user.firstName?.[0]?.toUpperCase() || member.user.email[0].toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-white truncate">
                                {member.user.firstName} {member.user.lastName}
                              </p>
                              {member.userClerkId === clerkUser?.id && (
                                <Crown className="w-4 h-4 text-yellow-400" title="Trip Handler" />
                              )}
                            </div>
                            <p className="text-xs text-gray-400 truncate">{member.user.email}</p>
                            <p className="text-xs text-gray-500">
                              Joined {new Date(member.joinedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {member.userClerkId !== clerkUser?.id && (
                          <Button
                            onClick={() =>
                              handleRemoveMember(member.userClerkId, `${member.user.firstName} ${member.user.lastName}`)
                            }
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <UserMinus className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {members.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No members yet</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Join Requests</h3>
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50">
                  {requests.filter((r) => r.status === "PENDING").length} pending
                </Badge>
              </div>

              <div className="space-y-3 max-h-[400px] overflow-y-auto custom-scrollbar">
                {requests
                  .filter((request) => request.status === "PENDING")
                  .map((request) => (
                    <Card key={request.id} className="bg-gray-700/50 border-gray-600">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3 flex-1">
                            {request.requester.profileImageUrl ? (
                              <img
                                src={request.requester.profileImageUrl || "/placeholder.svg"}
                                alt={`${request.requester.firstName} ${request.requester.lastName}`}
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-medium">
                                {request.requester.firstName?.[0]?.toUpperCase() ||
                                  request.requester.email[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white">
                                {request.requester.firstName} {request.requester.lastName}
                              </p>
                              <p className="text-xs text-gray-400 truncate">{request.requester.email}</p>
                              {request.message && (
                                <p className="text-xs text-gray-300 mt-1 bg-gray-600/30 p-2 rounded">
                                  "{request.message}"
                                </p>
                              )}
                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex gap-2 ml-2">
                            <Button
                              onClick={() => handleRequestAction(request.id, "accept")}
                              size="sm"
                              className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => handleRequestAction(request.id, "reject")}
                              size="sm"
                              variant="outline"
                              className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                {requests.filter((r) => r.status === "PENDING").length === 0 && (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                    <p className="text-gray-400">No pending requests</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Invite Tab */}
            <TabsContent value="invite" className="space-y-4">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Invite Users</h3>

                {/* Search Users */}
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
                      className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Search Results */}
                {searchQuery.length >= 2 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-300">Search Results</Label>
                    <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
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
                                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {user.firstName?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {user.firstName} {user.lastName}
                                  </p>
                                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                </div>
                                <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300">
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
                          className="bg-blue-500/20 text-blue-400 border-blue-500/50 px-3 py-1 flex items-center gap-2"
                        >
                          <span>
                            {user.firstName} {user.lastName}
                          </span>
                          <button
                            onClick={() => handleRemoveUser(user.clerkId)}
                            className="text-blue-300 hover:text-red-400 transition-colors"
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
                    className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 resize-none"
                    rows={3}
                  />
                </div>

                {/* Send Invites Button */}
                <Button
                  onClick={handleSendInvites}
                  disabled={selectedUsers.length === 0 || isSending}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                >
                  {isSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
