"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Users, Share2, MessageCircle, MapPin, Calendar, AlertTriangle, Copy } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CustomUserButton } from "@/components/custom-user-button"
import TripChat from "@/components/trip-chat"
import TripMembers from "@/components/trip-members"
import InviteUsers from "@/components/invite-users"
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
  handlerClerkId: string
  _count: {
    members: number
  }
}

export default function TripDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const { toast } = useToast()

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch trip details
  useEffect(() => {
    const fetchTripDetails = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const response = await fetch(`/api/trips/${params.tripId}`)
        const data = await response.json()

        if (response.ok) {
          setTrip(data.trip)
        } else if (response.status === 404) {
          setError("🗺️ Trip not found or you don't have access to it")
        } else {
          setError(data.details || data.error || "🚫 Failed to load trip details")
        }
      } catch (err) {
        console.error("Error fetching trip details:", err)
        setError("🚫 Failed to load trip details")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn && params.tripId) {
      fetchTripDetails()
    }
  }, [isLoaded, isSignedIn, clerkUser, params.tripId])

  const shareTrip = async () => {
    if (!trip) return

    const shareUrl = `${window.location.origin}/join/${trip.inviteCode}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${trip.name}`,
          text: `You're invited to join "${trip.name}" trip! Use invite code: ${trip.inviteCode}`,
          url: shareUrl,
        })
        toast({
          title: "🎉 Invite Shared!",
          description: "Trip invitation shared successfully.",
        })
      } catch (error) {
        console.log("Share cancelled or failed")
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast({
          title: "🔗 Link Copied!",
          description: "Invite link copied to clipboard.",
        })
      } catch (error) {
        toast({
          title: "❌ Copy Failed",
          description: "Failed to copy invite link.",
          variant: "destructive",
        })
      }
    }
  }

  const copyInviteCode = async () => {
    if (!trip) return

    try {
      await navigator.clipboard.writeText(trip.inviteCode)
      toast({
        title: "📋 Code Copied!",
        description: "Invite code copied to clipboard.",
      })
    } catch (error) {
      toast({
        title: "❌ Copy Failed",
        description: "Failed to copy invite code.",
        variant: "destructive",
      })
    }
  }

  if (!isLoaded || isLoading) {
    return null // This will show loading.tsx
  }

  if (!isSignedIn) {
    return null // Will redirect via useEffect
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="container mx-auto p-4 max-w-4xl">
          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Trip Not Found</h3>
                  <p className="text-gray-400">
                    The trip you're looking for doesn't exist or you don't have access to it.
                  </p>
                </div>
                <Button
                  onClick={() => router.push("/trips")}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Back to Trips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const isHandler = clerkUser?.id === trip.handlerClerkId

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white line-clamp-1">{trip.name}</h1>
              <p className="text-gray-400 text-sm">{trip.description || "No description"}</p>
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

        {/* Trip Info Card */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
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
                {isHandler && <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Trip Handler</Badge>}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={shareTrip}
                  variant="outline"
                  size="sm"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 bg-transparent"
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                {isHandler && (
                  <Button
                    onClick={() => setShowInviteDialog(true)}
                    variant="outline"
                    size="sm"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              {trip.startDate && trip.endDate && (
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-4 h-4 mr-2 text-green-400" />
                  <div>
                    <div className="font-medium">Duration</div>
                    <div className="text-gray-400">
                      {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              )}
              {trip.startingPoint && (
                <div className="flex items-center text-gray-300">
                  <MapPin className="w-4 h-4 mr-2 text-green-400" />
                  <div>
                    <div className="font-medium">Starting Point</div>
                    <div className="text-gray-400">{trip.startingPoint}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center text-gray-300">
                <Users className="w-4 h-4 mr-2 text-green-400" />
                <div>
                  <div className="font-medium">Members</div>
                  <div className="text-gray-400">
                    {trip._count.members} traveler{trip._count.members !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-300">Invite Code</div>
                  <div className="text-lg font-mono text-green-400">{trip.inviteCode}</div>
                </div>
                <Button
                  onClick={copyInviteCode}
                  variant="outline"
                  size="sm"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs with Fixed Height */}
        <div className="h-[600px] flex flex-col">
          <Tabs defaultValue="chat" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border-gray-700 flex-shrink-0">
              <TabsTrigger
                value="chat"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger
                value="members"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
              >
                <Users className="w-4 h-4 mr-2" />
                Members
              </TabsTrigger>
              <TabsTrigger
                value="expenses"
                className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
              >
                💰 Expenses
              </TabsTrigger>
            </TabsList>

            <TabsContent value="chat" className="flex-1 mt-6">
              <TripChat tripId={trip.id} />
            </TabsContent>

            <TabsContent value="members" className="flex-1 mt-6">
              <TripMembers tripId={trip.id} />
            </TabsContent>

            <TabsContent value="expenses" className="flex-1 mt-6">
              <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-full">
                <CardHeader>
                  <CardTitle className="text-white">Expenses</CardTitle>
                  <CardDescription className="text-gray-400">Track and manage trip expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl">💰</span>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Expense Tracking Coming Soon</h3>
                    <p className="text-gray-400">
                      UPI screenshot upload and automatic expense splitting will be available soon!
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <InviteUsers tripId={trip.id} open={showInviteDialog} onOpenChange={setShowInviteDialog} />
      </div>
    </div>
  )
}
