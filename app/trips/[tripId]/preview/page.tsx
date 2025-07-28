"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, Users, Send, Copy, ArrowLeft, Clock, CheckCircle, X } from "lucide-react"
import { CustomUserButton } from "@/components/custom-user-button"
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
  message: string
  createdAt: string
}

export default function TripPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const { toast } = useToast()

  const [trip, setTrip] = useState<Trip | null>(null)
  const [existingRequest, setExistingRequest] = useState<TripRequest | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [message, setMessage] = useState("")

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
        // Get public trip info
        const tripResponse = await fetch(`/api/trips/${params.tripId}/public`)
        if (tripResponse.ok) {
          const tripData = await tripResponse.json()
          setTrip(tripData.trip)

          // Check for existing request
          const requestsResponse = await fetch("/api/trip-requests?type=sent")
          if (requestsResponse.ok) {
            const requestsData = await requestsResponse.json()
            const request = requestsData.requests.find((req: any) => req.tripId === params.tripId)
            setExistingRequest(request || null)
          }
        } else {
          router.push("/")
        }
      } catch (error) {
        console.error("Error fetching trip details:", error)
        router.push("/")
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn && params.tripId) {
      fetchTripDetails()
    }
  }, [isLoaded, isSignedIn, clerkUser, params.tripId, router])

  const handleJoinRequest = async () => {
    if (!trip) return

    setIsSending(true)
    try {
      const response = await fetch("/api/trip-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tripId: trip.id,
          message: message || `I'd like to join "${trip.name}" trip!`,
          method: "by_browsing",
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setExistingRequest({
          id: data.request.id,
          status: "PENDING",
          message: data.request.message,
          createdAt: data.request.createdAt,
        })
        toast({
          title: "🎉 Request Sent!",
          description: "Your join request has been sent to the trip organizer.",
        })
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
    } finally {
      setIsSending(false)
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading trip details...</p>
        </div>
      </div>
    )
  }

  if (!isSignedIn || !trip) {
    return null
  }

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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <CustomUserButton />
        </div>

        {/* Trip Details Card */}
        <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-white mb-2">{trip.name}</CardTitle>
                <p className="text-gray-400">{trip.description || "No description available"}</p>
              </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {trip.startDate && trip.endDate && (
                <div className="flex items-center text-gray-300">
                  <Calendar className="w-5 h-5 mr-3 text-green-400" />
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
                  <MapPin className="w-5 h-5 mr-3 text-green-400" />
                  <div>
                    <div className="font-medium">Starting Point</div>
                    <div className="text-gray-400">{trip.startingPoint}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center text-gray-300">
                <Users className="w-5 h-5 mr-3 text-green-400" />
                <div>
                  <div className="font-medium">Members</div>
                  <div className="text-gray-400">
                    {trip._count.members} traveler{trip._count.members !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
              <div className="flex items-center text-gray-300">
                <div className="w-5 h-5 mr-3 text-green-400 font-bold">#</div>
                <div>
                  <div className="font-medium">Invite Code</div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400 font-mono">{trip.inviteCode}</span>
                    <Button
                      onClick={copyInviteCode}
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-gray-400 hover:text-green-400"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <div className="text-sm text-gray-400">
                Organized by{" "}
                <span className="text-white font-medium">
                  {trip.handler.firstName} {trip.handler.lastName}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Request Status or Form */}
        {existingRequest ? (
          <Card className={`border ${getStatusColor(existingRequest.status).split(" ")[0]}/50 mb-6`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                {existingRequest.status === "PENDING" && <Clock className="w-6 h-6 text-yellow-400" />}
                {existingRequest.status === "ACCEPTED" && <CheckCircle className="w-6 h-6 text-green-400" />}
                {existingRequest.status === "REJECTED" && <X className="w-6 h-6 text-red-400" />}
                <div>
                  <h3 className={`font-semibold ${getStatusColor(existingRequest.status).split(" ")[1]}`}>
                    Request {existingRequest.status.toLowerCase()}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {existingRequest.status === "PENDING" && "Your join request is waiting for approval."}
                    {existingRequest.status === "ACCEPTED" && "Your request was accepted! You can now access the trip."}
                    {existingRequest.status === "REJECTED" && "Your request was declined by the trip organizer."}
                  </p>
                </div>
              </div>
              {existingRequest.message && (
                <div className="bg-gray-700/30 p-3 rounded text-sm text-gray-300 mb-3">
                  <strong>Your message:</strong> "{existingRequest.message}"
                </div>
              )}
              <div className="text-xs text-gray-500">
                Sent on {new Date(existingRequest.createdAt).toLocaleDateString()}
              </div>
              {existingRequest.status === "ACCEPTED" && (
                <Button
                  onClick={() => router.push(`/trips/${trip.id}`)}
                  className="mt-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Access Trip
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-white">Request to Join Trip</CardTitle>
              <p className="text-gray-400 text-sm">Send a request to the trip organizer to join this adventure.</p>
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
      </div>
    </div>
  )
}
