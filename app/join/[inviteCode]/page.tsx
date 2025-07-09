"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, Send, AlertTriangle, CheckCircle, Clock, X } from "lucide-react"
import { CustomUserButton } from "@/components/custom-user-button"
import { useToast } from "@/hooks/use-toast"

interface Trip {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  startingPoint: string
  handlerClerkId: string
  handler: {
    firstName: string
    lastName: string
  }
}

interface ExistingRequest {
  id: string
  status: string
  message: string
  createdAt: string
}

export default function JoinTripPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const { toast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [existingRequest, setExistingRequest] = useState<ExistingRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setSending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [joinStatus, setJoinStatus] = useState<"none" | "member" | "pending" | "rejected">("none")

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`)
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch trip info and check status
  useEffect(() => {
    const fetchTripInfo = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        // Get trip info
        const tripResponse = await fetch(`/api/trips/join/${params.inviteCode}`)

        if (!tripResponse.ok) {
          const errorData = await tripResponse.json()
          setError(errorData.details || "Invalid invite code")
          return
        }

        const tripData = await tripResponse.json()
        setTrip(tripData.trip)

        // Check if user is already a member or has existing request
        const statusResponse = await fetch(`/api/trips/join/${params.inviteCode}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkOnly: true }),
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()

          if (statusData.status === "member") {
            setJoinStatus("member")
          } else if (statusData.status === "pending") {
            setJoinStatus("pending")
            setExistingRequest(statusData.request)
          } else if (statusData.status === "rejected") {
            setJoinStatus("rejected")
            setExistingRequest(statusData.request)
          }
        }
      } catch (error) {
        console.error("Error fetching trip info:", error)
        setError("Failed to load trip information")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn && params.inviteCode) {
      fetchTripInfo()
    }
  }, [isLoaded, isSignedIn, clerkUser, params.inviteCode])

  const handleJoinRequest = async () => {
    if (!trip) return

    setSending(true)
    try {
      const response = await fetch(`/api/trips/join/${params.inviteCode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message || `I'd like to join "${trip.name}" trip!`,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === "member") {
          toast({
            title: "🎉 Welcome!",
            description: "You're already a member of this trip!",
          })
          router.push(`/trips/${trip.id}`)
        } else if (data.status === "pending") {
          setJoinStatus("pending")
          setExistingRequest(data.request)
          toast({
            title: "🎉 Request Sent!",
            description: "Your join request has been sent to the trip organizer.",
          })
        }
      } else {
        toast({
          title: "❌ Request Failed",
          description: data.details || "Failed to send join request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to send join request",
        variant: "destructive",
      })
    } finally {
      setSending(false)
    }
  }

  if (!isLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trip information...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="container mx-auto p-4 max-w-2xl">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Join Trip</h1>
            <CustomUserButton />
          </div>

          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Invalid Invite</h3>
                  <p className="text-gray-400">{error || "This invite link is invalid or has expired."}</p>
                </div>
                <Button
                  onClick={() => router.push("/trips")}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Browse Trips
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Join Trip</h1>
          <CustomUserButton />
        </div>

        {/* Trip Info Card */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl mb-6">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl text-white">{trip.name}</CardTitle>
                <p className="text-gray-400">{trip.description || "No description"}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
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
            </div>
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400">
                Organized by{" "}
                <span className="text-white font-medium">
                  {trip.handler.firstName} {trip.handler.lastName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status Card */}
        {joinStatus === "member" && (
          <Card className="bg-green-500/10 border-green-500/50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-400" />
                <div>
                  <h3 className="font-semibold text-green-400">You're already a member!</h3>
                  <p className="text-green-300 text-sm">You can access all trip features.</p>
                </div>
              </div>
              <Button
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="w-full mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                Go to Trip
              </Button>
            </CardContent>
          </Card>
        )}

        {joinStatus === "pending" && existingRequest && (
          <Card className="bg-yellow-500/10 border-yellow-500/50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-6 h-6 text-yellow-400" />
                <div>
                  <h3 className="font-semibold text-yellow-400">Request Pending</h3>
                  <p className="text-yellow-300 text-sm">Your join request is waiting for approval.</p>
                </div>
              </div>
              {existingRequest.message && (
                <div className="mt-3 p-3 bg-gray-700/30 rounded text-sm text-gray-300">
                  <strong>Your message:</strong> "{existingRequest.message}"
                </div>
              )}
              <div className="text-xs text-gray-500 mt-2">
                Sent on {new Date(existingRequest.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}

        {joinStatus === "rejected" && existingRequest && (
          <Card className="bg-red-500/10 border-red-500/50 mb-6">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <X className="w-6 h-6 text-red-400" />
                <div>
                  <h3 className="font-semibold text-red-400">Request Declined</h3>
                  <p className="text-red-300 text-sm">Your previous join request was declined.</p>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Declined on {new Date(existingRequest.createdAt).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Join Request Form */}
        {joinStatus === "none" && (
          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Request to Join</CardTitle>
              <p className="text-gray-400 text-sm">Send a request to the trip organizer to join this trip.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="message" className="text-gray-300">
                  Message (Optional)
                </Label>
                <Textarea
                  id="message"
                  placeholder="Tell the organizer why you'd like to join this trip..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 focus:border-green-500 resize-none"
                  rows={3}
                  maxLength={500}
                />
                {message.length > 400 && (
                  <p className="text-xs text-gray-400 text-right">{500 - message.length} characters remaining</p>
                )}
              </div>

              <Button
                onClick={handleJoinRequest}
                disabled={isSending}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                {isSending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending Request...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Join Request
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Back Button */}
        <div className="text-center mt-6">
          <Button
            onClick={() => router.push("/trips")}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
          >
            Back to Trips
          </Button>
        </div>
      </div>
    </div>
  )
}
