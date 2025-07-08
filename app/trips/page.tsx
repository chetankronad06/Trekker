"use client"
import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Plus, Users, Calendar, MapPin, AlertTriangle } from "lucide-react"
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
  _count: {
    members: number
  }
}

export default function TripsPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [trips, setTrips] = useState<Trip[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch trips
  useEffect(() => {
    const fetchTrips = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const response = await fetch("/api/trips")
        if (response.ok) {
          const data = await response.json()
          setTrips(data.trips)
        } else if (response.status === 404) {
          setError("🧳 User not found in database. Please try signing out and signing in again.")
        } else {
          setError("🚫 Failed to load your trips")
        }
      } catch (err) {
        console.error("Error fetching trips:", err)
        setError("🚫 Failed to load your trips")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchTrips()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const handleTripCreated = (newTrip: Trip) => {
    setTrips([newTrip, ...trips])
    setShowCreateDialog(false)
    // Remove setSuccess call - toast is now handled in CreateTripDialog
  }

  if (!isLoaded || isLoading) {
    return null // This will show loading.tsx
  }

  if (!isSignedIn) {
    return null // Will redirect via useEffect
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
                My Trips
              </h1>
              <p className="text-gray-400 text-sm">Manage your travel expenses with friends</p>
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

        {/* Create Trip Button */}
        <div className="mb-6">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New Trip
          </Button>
        </div>

        {/* Trips Grid */}
        {trips.length === 0 ? (
          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center">
                  <MapPin className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">No trips yet</h3>
                  <p className="text-gray-400">Create your first trip to start tracking expenses with friends</p>
                </div>
                <Button
                  onClick={() => setShowCreateDialog(true)}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
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
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {trip.startDate && trip.endDate && (
                        <div className="flex items-center text-gray-300">
                          <Calendar className="w-4 h-4 mr-2 text-green-400" />
                          {new Date(trip.startDate).toLocaleDateString()} -{" "}
                          {new Date(trip.endDate).toLocaleDateString()}
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
        )}

        <CreateTripDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onTripCreated={handleTripCreated}
        />
      </div>
    </div>
  )
}
