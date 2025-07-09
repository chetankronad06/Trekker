"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Users, Calendar, MapPin, AlertTriangle, Send, Copy, Check, X, Clock, Crown, Settings } from 'lucide-react'
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { CustomUserButton } from "@/components/custom-user-button"
import CreateTripDialog from "@/components/create-trip-dialog"
import { useToast } from "@/hooks/use-toast"

interface Trip {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  startingPoint: string
  status: string
  inviteCode: string
  createdAt: string
  handlerClerkId: string
  handler: {
    firstName: string
    lastName: string
  }
  _count: {
    members: number
  }
  isMember?: boolean
  isHandler?: boolean
  memberInfo?: {
    joinMethod: string
    joinedAt: string
    joinDetails?: string
  }
}

interface TripRequest {
  id: string
  status: string
  message: string
  createdAt: string
  trip: {
    id: string
    name: string
    description: string
    startingPoint: string
    startDate: string
    endDate: string
  }
  requester?: {
    firstName: string
    lastName: string
    email: string
    profileImageUrl: string
  }
  receiver?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function TripsPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [sentRequests, setSentRequests] = useState<TripRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<TripRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState("")
  const [joiningCode, setJoiningCode] = useState(false)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch all data
  useEffect(() => {
    const fetchData = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        // Fetch user's trips (where they are members) with enhanced info
        const tripsResponse = await fetch("/api/trips?enhanced=true")
        if (tripsResponse.ok) {
          const tripsData = await tripsResponse.json()
          setMyTrips(tripsData.trips)
        }

        // Fetch all available trips
        const allTripsResponse = await fetch("/api/trips/all")
        if (allTripsResponse.ok) {
          const allTripsData = await allTripsResponse.json()
          setAllTrips(allTripsData.trips)
        }

        // Fetch trip requests
        const requestsResponse = await fetch("/api/trip-requests")
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setSentRequests(requestsData.sentRequests || [])
          setReceivedRequests(requestsData.receivedRequests || [])
        }
      } catch (err) {
        console.error("Error fetching data:", err)
        setError("🚫 Failed to load data")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const handleTripCreated = (newTrip: Trip) => {
    setMyTrips([newTrip, ...myTrips])
    setAllTrips([newTrip, ...allTrips])
    setShowCreateDialog(false)
  }

  const handleJoinRequest = async (tripId: string) => {
    try {
      const response = await fetch("/api/trip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          tripId, 
          message: "I'd like to join this trip!",
          joinMethod: "REQUEST" // Track how they're joining
        }),
      })

      if (response.ok) {
        toast({
          title: "🎉 Request Sent!",
          description: "Your join request has been sent to the trip handler.",
        })
        // Refresh requests
        const requestsResponse = await fetch("/api/trip-requests")
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setSentRequests(requestsData.sentRequests || [])
        }
      } else {
        const errorData = await response.json()
        toast({
          title: "❌ Request Failed",
          description: errorData.details || "Failed to send join request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to send join request",
        variant: "destructive",
      })
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

        // Refresh data
        const requestsResponse = await fetch("/api/trip-requests")
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setReceivedRequests(requestsData.receivedRequests || [])
        }

        // Refresh trips if accepted
        if (action === "accept") {
          const tripsResponse = await fetch("/api/trips?enhanced=true")
          if (tripsResponse.ok) {
            const tripsData = await tripsResponse.json()
            setMyTrips(tripsData.trips)
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

  const handleJoinByCode = async () => {
    if (!inviteCode.trim()) {
      toast({
        title: "❌ Invalid Code",
        description: "Please enter a valid invite code",
        variant: "destructive",
      })
      return
    }

    setJoiningCode(true)
    try {
      const response = await fetch(`/api/trips/join/${inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: "Joining via invite code",
          joinMethod: "INVITE_CODE" // Track join method
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === "member") {
          toast({
            title: "ℹ️ Already a Member",
            description: "You are already a member of this trip!",
          })
          router.push(`/trips/${data.trip.id}`)
        } else if (data.status === "pending") {
          toast({
            title: "🎉 Request Sent!",
            description: "Your join request has been sent successfully.",
          })
          setInviteCode("")
          // Refresh requests
          const requestsResponse = await fetch("/api/trip-requests")
          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json()
            setSentRequests(requestsData.sentRequests || [])
          }
        }
      } else {
        toast({
          title: "❌ Join Failed",
          description: data.details || "Failed to join trip",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to join trip",
        variant: "destructive",
      })
    } finally {
      setJoiningCode(false)
    }
  }

  const getRequestStatus = (tripId: string) => {
    return sentRequests.find((req) => req.trip.id === tripId)
  }

  const isMemberOfTrip = (tripId: string) => {
    return myTrips.some((trip) => trip.id === tripId)
  }

  const isMyTrip = (trip: Trip) => {
    return trip.handlerClerkId === clerkUser?.id
  }

  // Filter trips for different categories
  const hostedTrips = myTrips.filter(trip => trip.handlerClerkId === clerkUser?.id)
  const joinedTrips = myTrips.filter(trip => trip.handlerClerkId !== clerkUser?.id)

  if (!isLoaded || isLoading) {
    return null
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Travel Hub
              </h1>
              <p className="text-gray-400 text-sm">Discover and join amazing trips</p>
            </div>
          </div>
          <CustomUserButton />
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Join by Invite Code */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Copy className="w-5 h-5 text-green-400" />
              Join Trip by Invite Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter invite code (e.g., ABC12345)"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400"
                maxLength={8}
              />
              <Button
                onClick={handleJoinByCode}
                disabled={joiningCode || !inviteCode.trim()}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                {joiningCode ? "Joining..." : "Join"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="my-trips" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border-gray-700">
            <TabsTrigger
              value="my-trips"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              My Trips ({myTrips.length})
            </TabsTrigger>
            <TabsTrigger
              value="discover"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              Discover Trips ({allTrips.filter((t) => !isMemberOfTrip(t.id) && !isMyTrip(t)).length})
            </TabsTrigger>
            <TabsTrigger
              value="sent-requests"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              My Requests ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="received-requests"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              Join Requests ({receivedRequests.length})
            </TabsTrigger>
          </TabsList>

          {/* Enhanced My Trips Tab with Sub-tabs */}
          <TabsContent value="my-trips">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">My Trips</h2>
              <Button
                onClick={() => setShowCreateDialog(true)}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Trip
              </Button>
            </div>

            {/* Sub-tabs for My Trips */}
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="grid w-full grid-cols-3 bg-gray-700/50 border-gray-600">
                <TabsTrigger
                  value="all"
                  className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
                >
                  All ({myTrips.length})
                </TabsTrigger>
                <TabsTrigger
                  value="hosted"
                  className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
                >
                  <Crown className="w-4 h-4 mr-1" />
                  Hosted ({hostedTrips.length})
                </TabsTrigger>
                <TabsTrigger
                  value="joined"
                  className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
                >
                  Joined ({joinedTrips.length})
                </TabsTrigger>
              </TabsList>

              {/* All Trips */}
              <TabsContent value="all">
                {myTrips.length === 0 ? (
                  <EmptyState 
                    icon={<MapPin className="w-8 h-8 text-gray-400" />}
                    title="No trips yet"
                    description="Create your first trip or join existing ones"
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {myTrips.map((trip) => (
                      <Link key={trip.id} href={`/trips/${trip.id}`}>
                        <EnhancedTripCard trip={trip} />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Hosted Trips */}
              <TabsContent value="hosted">
                {hostedTrips.length === 0 ? (
                  <EmptyState 
                    icon={<Crown className="w-8 h-8 text-gray-400" />}
                    title="No hosted trips"
                    description="Create your first trip to start hosting adventures"
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {hostedTrips.map((trip) => (
                      <Link key={trip.id} href={`/trips/${trip.id}`}>
                        <EnhancedTripCard trip={trip} showManageButton />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Joined Trips */}
              <TabsContent value="joined">
                {joinedTrips.length === 0 ? (
                  <EmptyState 
                    icon={<Users className="w-8 h-8 text-gray-400" />}
                    title="No joined trips"
                    description="Browse available trips or use invite codes to join adventures"
                  />
                ) : (
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {joinedTrips.map((trip) => (
                      <Link key={trip.id} href={`/trips/${trip.id}`}>
                        <EnhancedTripCard trip={trip} showJoinInfo />
                      </Link>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          {/* Other tabs remain the same */}
          <TabsContent value="discover">
            <h2 className="text-xl font-semibold text-white mb-4">Discover Available Trips</h2>

            {allTrips.filter((t) => !isMemberOfTrip(t.id) && !isMyTrip(t)).length === 0 ? (
              <EmptyState 
                icon={<MapPin className="w-8 h-8 text-gray-400" />}
                title="No trips available"
                description="Check back later for new trips to join"
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {allTrips
                  .filter((trip) => !isMemberOfTrip(trip.id) && !isMyTrip(trip))
                  .map((trip) => {
                    const requestStatus = getRequestStatus(trip.id)
                    return (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        showJoinButton={true}
                        requestStatus={requestStatus?.status}
                        onJoinRequest={() => handleJoinRequest(trip.id)}
                      />
                    )
                  })}
              </div>
            )}
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent-requests">
            <h2 className="text-xl font-semibold text-white mb-4">My Join Requests</h2>

            {sentRequests.length === 0 ? (
              <EmptyState 
                icon={<Send className="w-8 h-8 text-gray-400" />}
                title="No requests sent"
                description="Browse available trips and send join requests"
              />
            ) : (
              <div className="space-y-4">
                {sentRequests.map((request) => (
                  <RequestCard key={request.id} request={request} type="sent" />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received-requests">
            <h2 className="text-xl font-semibold text-white mb-4">Join Requests for My Trips</h2>

            {receivedRequests.length === 0 ? (
              <EmptyState 
                icon={<Users className="w-8 h-8 text-gray-400" />}
                title="No join requests"
                description="When people request to join your trips, they'll appear here"
              />
            ) : (
              <div className="space-y-4">
                {receivedRequests.map((request) => (
                  <RequestCard key={request.id} request={request} type="received" onAction={handleRequestAction} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <CreateTripDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTripCreated={handleTripCreated}
        />
      </div>
    </div>
  )
}

// Enhanced Trip Card Component with join method info
function EnhancedTripCard({
  trip,
  showManageButton = false,
  showJoinInfo = false,
}: {
  trip: Trip
  showManageButton?: boolean
  showJoinInfo?: boolean
}) {
  const getJoinMethodDisplay = (method: string) => {
    switch (method) {
      case "CREATED":
        return { text: "Trip Creator", color: "text-yellow-400", icon: <Crown className="w-3 h-3" /> }
      case "INVITE_CODE":
        return { text: "Joined via Code", color: "text-green-400", icon: <Copy className="w-3 h-3" /> }
      case "INVITE_LINK":
        return { text: "Joined via Link", color: "text-blue-400", icon: <MapPin className="w-3 h-3" /> }
      case "REQUEST":
        return { text: "Joined via Request", color: "text-purple-400", icon: <Send className="w-3 h-3" /> }
      case "INVITATION":
        return { text: "Invited by Handler", color: "text-pink-400", icon: <Users className="w-3 h-3" /> }
      default:
        return { text: "Member", color: "text-gray-400", icon: <Users className="w-3 h-3" /> }
    }
  }

  const joinMethodInfo = trip.memberInfo ? getJoinMethodDisplay(trip.memberInfo.joinMethod) : null

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer hover:border-green-500/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-white line-clamp-1">{trip.name}</CardTitle>
          <div className="flex gap-2">
            <Badge
              variant={trip.status === "ACTIVE" ? "default" : "secondary"}
              className={
                trip.status === "ACTIVE"
                  ? "bg-green-500/20 text-green-400 border-green-500/50"
                  : "bg-gray-600/20 text-gray-400 border-gray-600/50"
              }
            >
              {trip.status.toLowerCase()}
            </Badge>
            {trip.handlerClerkId === trip.handler?.firstName && (
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">
                <Crown className="w-3 h-3 mr-1" />
                Host
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {trip.startDate && trip.endDate && (
            <div className="flex items-center text-gray-300">
              <Calendar className="w-4 h-4 mr-2 text-green-400" />
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </div>
          )}
          {trip.startingPoint && (
            <div className="flex items-center text-gray-300">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              {trip.startingPoint}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-300">
              <Users className="w-4 h-4 mr-2 text-green-400" />
              {trip._count.members} member{trip._count.members !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">{trip.inviteCode}</div>
          </div>
          
          {/* Join Method Info */}
          {showJoinInfo && joinMethodInfo && (
            <div className={`flex items-center text-xs ${joinMethodInfo.color}`}>
              {joinMethodInfo.icon}
              <span className="ml-1">{joinMethodInfo.text}</span>
              {trip.memberInfo?.joinedAt && (
                <span className="ml-2 text-gray-500">
                  • {new Date(trip.memberInfo.joinedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          )}

          {trip.handler && (
            <div className="text-xs text-gray-400">
              Organized by {trip.handler.firstName} {trip.handler.lastName}
            </div>
          )}

          {/* Manage Button for Hosted Trips */}
          {showManageButton && (
            <div className="pt-2">
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  // This will be handled by the trip management sidebar
                }}
                size="sm"
                variant="outline"
                className="w-full border-blue-500/50 text-blue-400 hover:bg-blue-500/10 bg-transparent"
              >
                <Settings className="w-3 h-3 mr-1" />
                Manage Trip
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Empty State Component
function EmptyState({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center py-12">
      <CardContent>
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center">
            {icon}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-gray-400">{description}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Keep existing TripCard and RequestCard components unchanged
function TripCard({
  trip,
  showJoinButton,
  requestStatus,
  onJoinRequest,
}: {
  trip: Trip
  showJoinButton: boolean
  requestStatus?: string
  onJoinRequest?: () => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "ACCEPTED":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "REJECTED":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/50"
    }
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-green-500/10 transition-all duration-300 cursor-pointer hover:border-green-500/50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg text-white line-clamp-1">{trip.name}</CardTitle>
          <Badge
            variant={trip.status === "ACTIVE" ? "default" : "secondary"}
            className={
              trip.status === "ACTIVE"
                ? "bg-green-500/20 text-green-400 border-green-500/50"
                : "bg-gray-600/20 text-gray-400 border-gray-600/50"
            }
          >
            {trip.status.toLowerCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 text-sm">
          {trip.startDate && trip.endDate && (
            <div className="flex items-center text-gray-300">
              <Calendar className="w-4 h-4 mr-2 text-green-400" />
              {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
            </div>
          )}
          {trip.startingPoint && (
            <div className="flex items-center text-gray-300">
              <MapPin className="w-4 h-4 mr-2 text-green-400" />
              {trip.startingPoint}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center text-gray-300">
              <Users className="w-4 h-4 mr-2 text-green-400" />
              {trip._count.members} member{trip._count.members !== 1 ? "s" : ""}
            </div>
            <div className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">{trip.inviteCode}</div>
          </div>
          {trip.handler && (
            <div className="text-xs text-gray-400">
              Organized by {trip.handler.firstName} {trip.handler.lastName}
            </div>
          )}

          {showJoinButton && (
            <div className="pt-2">
              {requestStatus ? (
                <Badge className={getStatusColor(requestStatus)}>
                  {requestStatus === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                  {requestStatus === "ACCEPTED" && <Check className="w-3 h-3 mr-1" />}
                  {requestStatus === "REJECTED" && <X className="w-3 h-3 mr-1" />}
                  {requestStatus.toLowerCase()}
                </Badge>
              ) : (
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    onJoinRequest?.()
                  }}
                  size="sm"
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Request to Join
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Request Card Component (unchanged)
function RequestCard({
  request,
  type,
  onAction,
}: {
  request: TripRequest
  type: "sent" | "received"
  onAction?: (requestId: string, action: "accept" | "reject") => void
}) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
      case "ACCEPTED":
        return "bg-green-500/20 text-green-400 border-green-500/50"
      case "REJECTED":
        return "bg-red-500/20 text-red-400 border-red-500/50"
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/50"
    }
  }

  return (
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-white">{request.trip.name}</h3>
              <Badge className={getStatusColor(request.status)}>
                {request.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                {request.status === "ACCEPTED" && <Check className="w-3 h-3 mr-1" />}
                {request.status === "REJECTED" && <X className="w-3 h-3 mr-1" />}
                {request.status.toLowerCase()}
              </Badge>
            </div>

            {request.trip.startingPoint && (
              <div className="flex items-center text-gray-300 text-sm mb-2">
                <MapPin className="w-3 h-3 mr-1 text-green-400" />
                {request.trip.startingPoint}
              </div>
            )}

            {type === "received" && request.requester && (
              <div className="text-sm text-gray-400 mb-2">
                From: {request.requester.firstName} {request.requester.lastName}
              </div>
            )}

            {request.message && (
              <div className="text-sm text-gray-300 bg-gray-700/30 p-2 rounded mb-2">"{request.message}"</div>
            )}

            <div className="text-xs text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</div>
          </div>

          {type === "received" && request.status === "PENDING" && onAction && (
            <div className="flex gap-2 ml-4">
              <Button
                onClick={() => onAction(request.id, "accept")}
                size="sm"
                className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
              >
                <Check className="w-3 h-3 mr-1" />
                Accept
              </Button>
              <Button
                onClick={() => onAction(request.id, "reject")}
                size="sm"
                variant="outline"
                className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
              >
                <X className="w-3 h-3 mr-1" />
                Reject
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
