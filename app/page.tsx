"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { MapPin, Calendar, Users, Search, Send, Clock, CheckCircle, X } from "lucide-react"
import { CustomUserButton } from "@/components/custom-user-button"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

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
}

interface TripRequest {
  id: string
  status: string
  tripId: string
  trip: {
    name: string
  }
}

export default function HomePage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [allTrips, setAllTrips] = useState<Trip[]>([])
  const [myTrips, setMyTrips] = useState<Trip[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [sentRequests, setSentRequests] = useState<TripRequest[]>([])

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        // Fetch all public trips
        const allTripsResponse = await fetch("/api/trips/public")
        if (allTripsResponse.ok) {
          const allTripsData = await allTripsResponse.json()
          setAllTrips(allTripsData.trips)
        }

        // Fetch user's trips
        const myTripsResponse = await fetch("/api/trips")
        if (myTripsResponse.ok) {
          const myTripsData = await myTripsResponse.json()
          setMyTrips(myTripsData.trips)
        }

        // Fetch sent requests
        const requestsResponse = await fetch("/api/trip-requests?type=sent")
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setSentRequests(requestsData.requests || [])
        }
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const handleJoinRequest = async (tripId: string, tripName: string) => {
    try {
      const response = await fetch("/api/trip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId,
          message: `I'd like to join "${tripName}" trip!`,
          method: "by_browsing",
        }),
      })

      if (response.ok) {
        toast({
          title: "🎉 Request Sent!",
          description: "Your join request has been sent to the trip handler.",
        })

        // Refresh sent requests
        const requestsResponse = await fetch("/api/trip-requests?type=sent")
        if (requestsResponse.ok) {
          const requestsData = await requestsResponse.json()
          setSentRequests(requestsData.requests || [])
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

  const getRequestStatus = (tripId: string) => {
    return sentRequests.find((req) => req.tripId === tripId)
  }

  const isMemberOfTrip = (tripId: string) => {
    return myTrips.some((trip) => trip.id === tripId)
  }

  const isMyTrip = (trip: Trip) => {
    return trip.handlerClerkId === clerkUser?.id
  }

  const filteredTrips = allTrips.filter((trip) => {
    const matchesSearch =
      trip.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trip.startingPoint?.toLowerCase().includes(searchQuery.toLowerCase())

    // Show trips that user is not a member of and didn't create
    return matchesSearch && !isMemberOfTrip(trip.id) && !isMyTrip(trip)
  })

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
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
                Trekker
              </h1>
              <p className="text-gray-400 text-sm">Discover amazing travel experiences</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/trips")}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              My Trips
            </Button>
            <Button
              onClick={() => router.push("/profile")}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              Profile
            </Button>
            <CustomUserButton />
          </div>
        </div>

        {/* Welcome Section */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl mb-6">
          <CardContent className="p-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Welcome back, {clerkUser?.firstName}! 👋</h2>
              <p className="text-gray-400 mb-4">Discover new adventures and connect with fellow travelers</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="text-green-400 font-semibold text-lg">{myTrips.length}</div>
                  <div className="text-gray-300">My Trips</div>
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="text-blue-400 font-semibold text-lg">{allTrips.length}</div>
                  <div className="text-gray-300">Available Trips</div>
                </div>
                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                  <div className="text-purple-400 font-semibold text-lg">{sentRequests.length}</div>
                  <div className="text-gray-300">Pending Requests</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browse Trips Section */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-green-400" />
                Discover Trips
              </CardTitle>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/50">
                {filteredTrips.length} available
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search trips by name, description, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500"
                />
              </div>
            </div>

            {/* Trips Grid */}
            {filteredTrips.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">
                  {searchQuery ? "No trips found" : "No trips available"}
                </h3>
                <p className="text-gray-400">
                  {searchQuery ? "Try adjusting your search terms" : "Check back later for new adventures"}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTrips.map((trip) => {
                  const requestStatus = getRequestStatus(trip.id)
                  return (
                    <TripBrowseCard
                      key={trip.id}
                      trip={trip}
                      requestStatus={requestStatus?.status}
                      onJoinRequest={() => handleJoinRequest(trip.id, trip.name)}
                    />
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// Trip Browse Card Component
function TripBrowseCard({
  trip,
  requestStatus,
  onJoinRequest,
}: {
  trip: Trip
  requestStatus?: string
  onJoinRequest: () => void
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
    <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl hover:shadow-green-500/10 transition-all duration-300 hover:border-green-500/50">
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
        {trip.description && <p className="text-gray-400 text-sm line-clamp-2">{trip.description}</p>}
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

          <div className="pt-2 flex gap-2">
            <Link href={`/trips/${trip.id}/preview`} className="flex-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
              >
                View Details
              </Button>
            </Link>

            {requestStatus ? (
              <Badge className={`${getStatusColor(requestStatus)} flex-shrink-0`}>
                {requestStatus === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                {requestStatus === "ACCEPTED" && <CheckCircle className="w-3 h-3 mr-1" />}
                {requestStatus === "REJECTED" && <X className="w-3 h-3 mr-1" />}
                {requestStatus.toLowerCase()}
              </Badge>
            ) : (
              <Button
                onClick={(e) => {
                  e.preventDefault()
                  onJoinRequest()
                }}
                size="sm"
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white flex-shrink-0"
              >
                <Send className="w-3 h-3 mr-1" />
                Request
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
