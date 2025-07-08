"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Users, Calendar, Crown, Clock, TrendingUp, Plus, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"
import { CustomUserButton } from "@/components/custom-user-button"
import CreateTripDialog from "@/components/create-trip-dialog"

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
  _count: {
    members: number
  }
}

interface DashboardStats {
  totalTrips: number
  hostedTrips: number
  joinedTrips: number
  activeTrips: number
}

export default function DashboardPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [hostedTrips, setHostedTrips] = useState<Trip[]>([])
  const [joinedTrips, setJoinedTrips] = useState<Trip[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalTrips: 0,
    hostedTrips: 0,
    joinedTrips: 0,
    activeTrips: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const response = await fetch("/api/trips")
        if (response.ok) {
          const data = await response.json()
          const allTrips = data.trips || []

          // Separate hosted and joined trips
          const hosted = allTrips.filter((trip: Trip) => trip.handlerClerkId === clerkUser.id)
          const joined = allTrips.filter((trip: Trip) => trip.handlerClerkId !== clerkUser.id)

          setTrips(allTrips)
          setHostedTrips(hosted)
          setJoinedTrips(joined)

          // Calculate stats
          setStats({
            totalTrips: allTrips.length,
            hostedTrips: hosted.length,
            joinedTrips: joined.length,
            activeTrips: allTrips.filter((trip: Trip) => trip.status === "ACTIVE").length,
          })
        } else if (response.status === 404) {
          setError("🧳 User not found in database. Please try signing out and signing in again.")
        } else {
          setError("🚫 Failed to load dashboard data")
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err)
        setError("🚫 Failed to load dashboard data")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchDashboardData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const handleTripCreated = (newTrip: Trip) => {
    setTrips([newTrip, ...trips])
    setHostedTrips([newTrip, ...hostedTrips])
    setStats((prev) => ({
      ...prev,
      totalTrips: prev.totalTrips + 1,
      hostedTrips: prev.hostedTrips + 1,
    }))
    setShowCreateDialog(false)
  }

  if (!isLoaded || isLoading) {
    return null
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-400 text-sm">Welcome back, {clerkUser?.firstName}!</p>
            </div>
          </div>
          <CustomUserButton />
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="border-red-500/50 bg-red-500/10 mb-6">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <AlertDescription className="text-red-300">{error}</AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Trips</p>
                  <p className="text-2xl font-bold text-white">{stats.totalTrips}</p>
                </div>
                <MapPin className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Hosted</p>
                  <p className="text-2xl font-bold text-white">{stats.hostedTrips}</p>
                </div>
                <Crown className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Joined</p>
                  <p className="text-2xl font-bold text-white">{stats.joinedTrips}</p>
                </div>
                <Users className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Active</p>
                  <p className="text-2xl font-bold text-white">{stats.activeTrips}</p>
                </div>
                <Clock className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New Trip
            </Button>
            <Button
              onClick={() => router.push("/trips")}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              <MapPin className="w-4 h-4 mr-2" />
              View All Trips
            </Button>
          </div>
        </div>

        {/* Trips Tabs */}
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border-gray-700">
            <TabsTrigger
              value="all"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
            >
              All Trips ({stats.totalTrips})
            </TabsTrigger>
            <TabsTrigger
              value="hosted"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400 text-gray-400"
            >
              <Crown className="w-4 h-4 mr-2" />
              Hosted ({stats.hostedTrips})
            </TabsTrigger>
            <TabsTrigger
              value="joined"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-gray-400"
            >
              <Users className="w-4 h-4 mr-2" />
              Joined ({stats.joinedTrips})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-6">
            <TripGrid trips={trips} />
          </TabsContent>

          <TabsContent value="hosted" className="mt-6">
            <TripGrid trips={hostedTrips} emptyMessage="You haven't hosted any trips yet" />
          </TabsContent>

          <TabsContent value="joined" className="mt-6">
            <TripGrid trips={joinedTrips} emptyMessage="You haven't joined any trips yet" />
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

// Trip Grid Component
function TripGrid({ trips, emptyMessage = "No trips found" }: { trips: Trip[]; emptyMessage?: string }) {
  if (trips.length === 0) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center py-12">
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center">
              <MapPin className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{emptyMessage}</h3>
              <p className="text-gray-400">Create or join a trip to get started</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {trips.map((trip) => (
        <Link key={trip.id} href={`/trips/${trip.id}`}>
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
              <CardDescription className="text-gray-400 line-clamp-2">
                {trip.description || "No description"}
              </CardDescription>
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
                  <div className="text-xs text-green-400 font-mono bg-green-500/10 px-2 py-1 rounded">
                    {trip.inviteCode}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
