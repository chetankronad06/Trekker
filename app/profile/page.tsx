"use client"

import type React from "react"
import { useUser } from "@clerk/nextjs"
import { useEffect, useCallback, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Edit3,
  Save,
  X,
  AlertTriangle,
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CustomUserButton } from "@/components/custom-user-button"
import { useToast } from "@/hooks/use-toast"

interface DatabaseUser {
  id: number
  clerkId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
  createdAt: string
  updatedAt: string
}

interface TripRequest {
  id: string
  status: "PENDING" | "ACCEPTED" | "REJECTED"
  message: string | null
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
    profileImageUrl: string | null
  }
  receiver?: {
    firstName: string
    lastName: string
    email: string
  }
}

export default function ProfilePage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  // Profile editing state
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })

  // Trip requests state
  const [sentRequests, setSentRequests] = useState<TripRequest[]>([])
  const [receivedRequests, setReceivedRequests] = useState<TripRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set())

  // Common state
  const [error, setError] = useState("")

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Fetch user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const response = await fetch("/api/user")
        if (response.ok) {
          const data = await response.json()
          setDbUser(data.user)
          setEditForm({
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            email: data.user.email,
          })
        } else if (response.status === 404) {
          // User not found in database, sync them
          await syncUserToDatabase()
        } else {
          setError("🚫 Failed to load your travel profile")
        }
      } catch (err) {
        console.error("Error fetching user:", err)
        setError("🚫 Failed to load your travel profile")
      }
    }

    if (isLoaded && isSignedIn) {
      fetchUserData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const syncUserToDatabase = useCallback(async () => {
    if (!clerkUser) return

    try {
      const response = await fetch("/api/user/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress || "",
          firstName: clerkUser.firstName || "",
          lastName: clerkUser.lastName || "",
          profileImageUrl: clerkUser.imageUrl || null,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDbUser(data.user)
        setEditForm({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          email: data.user.email,
        })
      }
    } catch (err) {
      console.error("Error syncing user:", err)
    }
  }, [clerkUser])

  const fetchRequests = useCallback(async () => {
    if (!clerkUser) return

    try {
      // Fetch both sent and received requests
      const [sentResponse, receivedResponse] = await Promise.all([
        fetch("/api/trip-requests?type=sent"),
        fetch("/api/trip-requests?type=received"),
      ])

      if (sentResponse.ok) {
        const sentData = await sentResponse.json()
        setSentRequests(sentData.requests || [])
      }

      if (receivedResponse.ok) {
        const receivedData = await receivedResponse.json()
        setReceivedRequests(receivedData.requests || [])
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
      toast({
        title: "❌ Error",
        description: "Failed to load trip requests",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [clerkUser, toast])

  useEffect(() => {
    if (isLoaded && clerkUser) {
      syncUserToDatabase()
      fetchRequests()
    }
  }, [isLoaded, clerkUser, syncUserToDatabase, fetchRequests])

  // Profile editing functions
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
  }

  const handleSave = async () => {
    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      setError("🧳 All fields are required for your travel profile")
      return
    }

    setIsSaving(true)
    setError("")

    try {
      // Update in database
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      })

      if (response.ok) {
        const data = await response.json()
        setDbUser(data.user)
        setIsEditing(false)
        toast({
          title: "✅ Profile Updated!",
          description: "Your travel profile has been updated successfully.",
        })

        // Update Clerk user
        try {
          await clerkUser?.update({
            firstName: editForm.firstName,
            lastName: editForm.lastName,
          })
          // Update primary email if changed
          if (editForm.email !== clerkUser?.emailAddresses[0]?.emailAddress) {
            await clerkUser?.createEmailAddress({ email: editForm.email })
          }
        } catch (clerkError) {
          console.error("Error updating Clerk user:", clerkError)
          // Don't show error to user as database update succeeded
        }
      } else {
        setError("🚫 Failed to update your travel profile")
        toast({
          title: "❌ Update Failed",
          description: "Failed to update your travel profile",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error updating user:", err)
      setError("🚫 Failed to update your travel profile")
      toast({
        title: "❌ Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (dbUser) {
      setEditForm({
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        email: dbUser.email,
      })
    }
    setIsEditing(false)
    setError("")
  }

  // Trip request functions
  const handleRequestAction = async (requestId: string, action: "accept" | "reject") => {
    setProcessingRequests((prev) => new Set(prev).add(requestId))

    try {
      const response = await fetch(`/api/trip-requests/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action }),
      })

      const data = await response.json()

      if (response.ok) {
        toast({
          title: action === "accept" ? "✅ Request Accepted!" : "❌ Request Rejected",
          description: `Trip request has been ${action}ed successfully.`,
        })

        // Update the request in the list
        setReceivedRequests((prev) =>
          prev.map((req) =>
            req.id === requestId ? { ...req, status: action === "accept" ? "ACCEPTED" : "REJECTED" } : req,
          ),
        )
      } else {
        toast({
          title: "❌ Error",
          description: data.details || data.error || `Failed to ${action} request`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error(`Error ${action}ing request:`, error)
      toast({
        title: "❌ Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const cancelRequest = async (requestId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId))

    try {
      const response = await fetch(`/api/trip-requests/${requestId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "🗑️ Request Cancelled",
          description: "Your trip request has been cancelled.",
        })

        // Remove the request from the list
        setSentRequests((prev) => prev.filter((req) => req.id !== requestId))
      } else {
        const data = await response.json()
        toast({
          title: "❌ Error",
          description: data.details || data.error || "Failed to cancel request",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error cancelling request:", error)
      toast({
        title: "❌ Network Error",
        description: "Please check your connection and try again.",
        variant: "destructive",
      })
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  if (!isLoaded || isLoading) {
    return null
  }

  if (!isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Travel Profile
              </h1>
              <p className="text-gray-400 text-sm">Manage your account and trip requests</p>
            </div>
          </div>
          <CustomUserButton />
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800/50 border-gray-700">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="sent-requests"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
            >
              <Clock className="w-4 h-4 mr-2" />
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="received-requests"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400 text-gray-400"
            >
              <Users className="w-4 h-4 mr-2" />
              Received ({receivedRequests.filter((r) => r.status === "PENDING").length})
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-white">
                      <User className="h-5 w-5 text-green-400" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-gray-400">Your traveler details and preferences</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-green-500/50 text-green-400 hover:bg-green-500/10 w-full sm:w-auto"
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {error && (
                  <Alert className="border-red-500/50 bg-red-500/10">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <AlertDescription className="text-red-300">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-gray-300">
                      First Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="firstName"
                        name="firstName"
                        value={editForm.firstName}
                        onChange={handleInputChange}
                        placeholder="Enter first name"
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    ) : (
                      <div className="p-3 bg-gray-700/30 rounded-md border border-gray-600 text-white">
                        {dbUser?.firstName || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-gray-300">
                      Last Name
                    </Label>
                    {isEditing ? (
                      <Input
                        id="lastName"
                        name="lastName"
                        value={editForm.lastName}
                        onChange={handleInputChange}
                        placeholder="Enter last name"
                        className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                      />
                    ) : (
                      <div className="p-3 bg-gray-700/30 rounded-md border border-gray-600 text-white">
                        {dbUser?.lastName || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="email" className="text-gray-300">
                      Email Address
                    </Label>
                    {isEditing ? (
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={editForm.email}
                          onChange={handleInputChange}
                          placeholder="Enter email address"
                          className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-700/30 rounded-md border border-gray-600 flex items-center gap-2 text-white">
                        <Mail className="h-4 w-4 text-gray-400" />
                        {dbUser?.email || "Not set"}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Member Since</Label>
                    <div className="p-3 bg-gray-700/30 rounded-md border border-gray-600 flex items-center gap-2 text-white">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {clerkUser?.createdAt ? new Date(clerkUser.createdAt).toLocaleDateString() : "Unknown"}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-300">Account Status</Label>
                    <div className="p-3 bg-gray-700/30 rounded-md border border-gray-600 flex items-center gap-2 text-white">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Active Traveler
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {isEditing && (
                  <div className="flex flex-col sm:flex-row gap-3 pt-4">
                    <Button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4 mr-2" />
                          Save Changes
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={handleCancel}
                      variant="outline"
                      disabled={isSaving}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent-requests" className="mt-6">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Sent Trip Requests</CardTitle>
                <CardDescription className="text-gray-400">Trip requests you've sent to trip handlers</CardDescription>
              </CardHeader>
              <CardContent>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No sent requests yet</p>
                    <p className="text-gray-500 text-sm">Join trips using invite codes to see requests here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sentRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border border-gray-700 bg-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-white">{request.trip.name}</h3>
                            <p className="text-sm text-gray-400">{request.trip.description}</p>
                            {request.trip.startingPoint && (
                              <div className="flex items-center gap-1 mt-1">
                                <MapPin className="w-3 h-3 text-green-400" />
                                <span className="text-xs text-gray-500">{request.trip.startingPoint}</span>
                              </div>
                            )}
                            {request.message && (
                              <p className="text-xs text-gray-500 mt-1 italic">"{request.message}"</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">
                              Sent {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={request.status === "ACCEPTED" ? "default" : "secondary"}
                              className={
                                request.status === "ACCEPTED"
                                  ? "bg-green-500/20 text-green-400 border-green-500/50"
                                  : request.status === "REJECTED"
                                    ? "bg-red-500/20 text-red-400 border-red-500/50"
                                    : "bg-yellow-500/20 text-yellow-400 border-yellow-500/50"
                              }
                            >
                              {request.status.toLowerCase()}
                            </Badge>
                            {request.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => cancelRequest(request.id)}
                                disabled={processingRequests.has(request.id)}
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received-requests" className="mt-6">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Received Trip Requests</CardTitle>
                <CardDescription className="text-gray-400">
                  Trip requests from users wanting to join your trips
                </CardDescription>
              </CardHeader>
              <CardContent>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 mx-auto mb-4 text-gray-600" />
                    <p className="text-gray-400">No received requests yet</p>
                    <p className="text-gray-500 text-sm">Trip join requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedRequests.map((request) => (
                      <div key={request.id} className="p-4 rounded-lg border border-gray-700 bg-gray-700/30">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-medium text-white">{request.trip.name}</h3>
                              <span className="text-gray-400">•</span>
                              <span className="text-sm text-green-400">
                                {request.requester?.firstName} {request.requester?.lastName}
                              </span>
                            </div>
                            <p className="text-sm text-gray-400">{request.requester?.email}</p>
                            {request.message && (
                              <p className="text-sm text-gray-300 mt-2 p-2 bg-gray-600/30 rounded italic">
                                "{request.message}"
                              </p>
                            )}
                            <p className="text-xs text-gray-500 mt-2">
                              Requested {new Date(request.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          {request.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleRequestAction(request.id, "accept")}
                                disabled={processingRequests.has(request.id)}
                                className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4 mr-1" />
                                    Accept
                                  </>
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRequestAction(request.id, "reject")}
                                disabled={processingRequests.has(request.id)}
                                className="border-red-500/50 text-red-400 hover:bg-red-500/10 bg-transparent"
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4 mr-1" />
                                    Decline
                                  </>
                                )}
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant={request.status === "ACCEPTED" ? "default" : "secondary"}
                              className={
                                request.status === "ACCEPTED"
                                  ? "bg-green-500/20 text-green-400 border-green-500/50"
                                  : "bg-red-500/20 text-red-400 border-red-500/50"
                              }
                            >
                              {request.status.toLowerCase()}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
