"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { MapPin, Calendar, Users, Loader2, AlertTriangle, MessageCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface Trip {
  id: string
  name: string
  description: string
  handlerClerkId: string
  startingPoint: string
  startDate: string
  endDate: string
}

export default function JoinTripPage() {
  const params = useParams()
  const router = useRouter()
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [trip, setTrip] = useState<Trip | null>(null)
  const [message, setMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const { toast } = useToast()

  // Fetch trip details
  useEffect(() => {
    const fetchTripDetails = async () => {
      try {
        const response = await fetch(`/api/trips/join/${params.inviteCode}`)
        const data = await response.json()

        if (response.ok) {
          setTrip(data.trip)
        } else {
          setError(data.details || data.error || "🚫 Invalid invite code")
        }
      } catch (err) {
        console.error("Error fetching trip details:", err)
        setError("🚫 Failed to load trip details")
      } finally {
        setIsLoading(false)
      }
    }

    if (params.inviteCode) {
      fetchTripDetails()
    }
  }, [params.inviteCode])

  const sendJoinRequest = async () => {
    if (!clerkUser) {
      router.push(`/sign-in?redirect_url=${window.location.pathname}`)
      return
    }

    setIsJoining(true)
    setError("")

    try {
      const response = await fetch(`/api/trips/join/${params.inviteCode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.trim() || null }),
      })

      const data = await response.json()

      if (response.ok) {
        if (data.status === "member") {
          toast({
            title: "✅ Already a Member!",
            description: "You're already part of this trip.",
          })
          setTimeout(() => {
            router.push(`/trips/${data.trip.id}`)
          }, 1500)
        } else if (data.status === "pending") {
          toast({
            title: "📤 Request Already Sent!",
            description: "Your join request is pending approval.",
          })
          setSuccess("🕐 Your request is pending approval from the trip handler.")
        } else if (data.isNew) {
          toast({
            title: "📤 Request Sent!",
            description: "Your join request has been sent to the trip handler.",
          })
          setSuccess("🎉 Join request sent successfully! You'll be notified when it's approved.")
        }
      } else {
        toast({
          title: "❌ Request Failed",
          description: data.details || data.error || "Failed to send join request",
          variant: "destructive",
        })
        setError(data.details || data.error || "🚫 Failed to send join request")
      }
    } catch (err) {
      console.error("Error sending join request:", err)
      toast({
        title: "❌ Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
      setError("🚫 Something went wrong. Please try again.")
    } finally {
      setIsJoining(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto" />
          </div>
          <div className="space-y-2">
            <p className="text-white text-lg font-medium">Loading trip details...</p>
            <p className="text-gray-400 text-sm">Please wait while we fetch the trip information</p>
          </div>
        </div>
      </div>
    )
  }

  if (error && !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
        <Card className="w-full max-w-md bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl text-center">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">Invalid Invite</h3>
                <p className="text-gray-400">{error}</p>
              </div>
              <Button
                onClick={() => router.push("/trips")}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              >
                Go to My Trips
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!trip) return null

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Card className="w-full max-w-md bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <MapPin className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
            Join Trip Request
          </CardTitle>
          <CardDescription className="text-gray-400">Send a request to join this trip</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-500/50 bg-green-500/10">
              <AlertTriangle className="h-4 w-4 text-green-400" />
              <AlertDescription className="text-green-300">{success}</AlertDescription>
            </Alert>
          )}

          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white">{trip.name}</h2>
            <p className="text-gray-400">{trip.description || "No description"}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-300">
              <Users className="w-4 h-4 text-green-400" />
              <span>Request to join group expense tracking</span>
            </div>
            {trip.startingPoint && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <MapPin className="w-4 h-4 text-green-400" />
                <span>Starting from {trip.startingPoint}</span>
              </div>
            )}
            {trip.startDate && trip.endDate && (
              <div className="flex items-center gap-3 text-sm text-gray-300">
                <Calendar className="w-4 h-4 text-green-400" />
                <span>
                  {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>

          {!success && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="message" className="text-gray-300 flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-green-400" />
                  Optional Message
                </Label>
                <Textarea
                  id="message"
                  placeholder="Hi! I'd like to join your trip..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                  rows={3}
                />
              </div>

              {!isSignedIn ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-400 text-center">Sign in to send join request</p>
                  <Button
                    onClick={() => router.push(`/sign-in?redirect_url=${window.location.pathname}`)}
                    className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                  >
                    Sign In to Send Request
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={sendJoinRequest}
                  disabled={isJoining}
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending Request...
                    </>
                  ) : (
                    "Send Join Request"
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
