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
  Bell,
  BellOff,
  Check,
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

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  createdAt: string
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

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loadingNotifications, setLoadingNotifications] = useState(false)

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

  const fetchNotifications = useCallback(async () => {
    if (!clerkUser) return

    setLoadingNotifications(true)
    try {
      const response = await fetch("/api/notifications")
      if (response.ok) {
        const data = await response.json()
        setNotifications(data.notifications || [])
        setUnreadCount(data.notifications?.filter((n: Notification) => !n.read).length || 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoadingNotifications(false)
    }
  }, [clerkUser])

  useEffect(() => {
    if (isLoaded && clerkUser) {
      syncUserToDatabase()
      fetchRequests()
      fetchNotifications()
    }
  }, [isLoaded, clerkUser, syncUserToDatabase, fetchRequests, fetchNotifications])

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
      setError("🚫 All fields are required")
      return
    }

    setIsSaving(true)
    try {
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
          title: "✅ Profile Updated",
          description: "Your travel profile has been updated successfully.",
        })
      } else {
        const errorData = await response.json()
        setError(errorData.details || "🚫 Failed to update profile")
      }
    } catch (err) {
      console.error("Error updating profile:", err)
      setError("🚫 Failed to update profile")
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

  // Request handling functions
  const handleRequestAction = async (requestId: string, action: "accept" | "reject") => {
    setProcessingRequests((prev) => new Set(prev).add(requestId))

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
        await fetchRequests()
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
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev)
        newSet.delete(requestId)
        return newSet
      })
    }
  }

  const handleDeleteRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to delete this request?")) return

    setProcessingRequests((prev) => new Set(prev).add(requestId))

    try {
      const response = await fetch(`/api/trip-requests/${requestId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "🗑️ Request Deleted",
          description: "Your join request has been deleted.",
        })

        // Refresh requests
        await fetchRequests()
      } else {
        const errorData = await response.json()
        toast({
          title: "❌ Delete Failed",
          description: errorData.details || "Failed to delete request",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to delete request",
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

  // Notification functions
  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      })

      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const markAllNotificationsAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllAsRead: true }),
      })

      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
      setUnreadCount(0)
      toast({
        title: "✅ All Notifications Read",
        description: "All notifications have been marked as read.",
      })
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "MEMBER_REMOVED":
        return <XCircle className="w-5 h-5 text-red-400" />
      case "MEMBER_JOINED":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "REQUEST_ACCEPTED":
        return <CheckCircle className="w-5 h-5 text-green-400" />
      case "REQUEST_REJECTED":
        return <XCircle className="w-5 h-5 text-red-400" />
      case "TRIP_DELETED":
        return <Trash2 className="w-5 h-5 text-red-400" />
      default:
        return <Bell className="w-5 h-5 text-blue-400" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      return "Just now"
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hour${Math.floor(diffInHours) !== 1 ? "s" : ""} ago`
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) !== 1 ? "s" : ""} ago`
    } else {
      return date.toLocaleDateString()
    }
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

  if (!isLoaded || !isSignedIn) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-400 to-blue-500 bg-clip-text text-transparent">
                Travel Profile
              </h1>
              <p className="text-gray-400 text-sm">Manage your travel profile and requests</p>
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

        {/* Profile Tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-gray-800/50 border-gray-700">
            <TabsTrigger
              value="profile"
              className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </TabsTrigger>
            <TabsTrigger
              value="sent-requests"
              className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400"
            >
              Sent ({sentRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="received-requests"
              className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"
            >
              Received ({receivedRequests.length})
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400 relative"
            >
              <Bell className="w-4 h-4 mr-2" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs min-w-[1.25rem] h-5 flex items-center justify-center p-0">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">Personal Information</CardTitle>
                    <CardDescription className="text-gray-400">Manage your travel profile information</CardDescription>
                  </div>
                  {!isEditing && (
                    <Button
                      onClick={() => setIsEditing(true)}
                      variant="outline"
                      size="sm"
                      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 bg-transparent"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {dbUser ? (
                  <>
                    {/* Profile Picture */}
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        {clerkUser?.imageUrl ? (
                          <img
                            src={clerkUser.imageUrl || "/placeholder.svg"}
                            alt="Profile"
                            className="w-20 h-20 rounded-full object-cover border-2 border-gray-600"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                            <User className="w-8 h-8 text-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {dbUser.firstName} {dbUser.lastName}
                        </h3>
                        <p className="text-gray-400">{dbUser.email}</p>
                        <p className="text-sm text-gray-500">
                          Member since {new Date(dbUser.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Editable Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                            className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-500"
                          />
                        ) : (
                          <div className="p-3 bg-gray-700/30 rounded-md text-white">{dbUser.firstName}</div>
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
                            className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-500"
                          />
                        ) : (
                          <div className="p-3 bg-gray-700/30 rounded-md text-white">{dbUser.lastName}</div>
                        )}
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="email" className="text-gray-300">
                          Email Address
                        </Label>
                        {isEditing ? (
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={editForm.email}
                            onChange={handleInputChange}
                            className="bg-gray-700/50 border-gray-600 text-white focus:border-blue-500"
                          />
                        ) : (
                          <div className="p-3 bg-gray-700/30 rounded-md text-white flex items-center">
                            <Mail className="w-4 h-4 mr-2 text-gray-400" />
                            {dbUser.email}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    {isEditing && (
                      <div className="flex gap-3 pt-4">
                        <Button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white"
                        >
                          {isSaving ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              Save Changes
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={handleCancel}
                          variant="outline"
                          className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400">Loading profile...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Sent Requests Tab */}
          <TabsContent value="sent-requests">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Sent Join Requests</CardTitle>
                <CardDescription className="text-gray-400">Track your requests to join trips</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400">Loading requests...</p>
                  </div>
                ) : sentRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MapPin className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No requests sent</h3>
                    <p className="text-gray-400">Browse available trips and send join requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sentRequests.map((request) => (
                      <Card key={request.id} className="bg-gray-700/50 border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-white">{request.trip.name}</h3>
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                                  {request.status === "ACCEPTED" && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {request.status === "REJECTED" && <XCircle className="w-3 h-3 mr-1" />}
                                  {request.status.toLowerCase()}
                                </Badge>
                              </div>

                              {request.trip.startingPoint && (
                                <div className="flex items-center text-gray-300 text-sm mb-2">
                                  <MapPin className="w-3 h-3 mr-1 text-green-400" />
                                  {request.trip.startingPoint}
                                </div>
                              )}

                              {request.trip.startDate && request.trip.endDate && (
                                <div className="flex items-center text-gray-300 text-sm mb-2">
                                  <Calendar className="w-3 h-3 mr-1 text-blue-400" />
                                  {new Date(request.trip.startDate).toLocaleDateString()} -{" "}
                                  {new Date(request.trip.endDate).toLocaleDateString()}
                                </div>
                              )}

                              {request.message && (
                                <div className="text-sm text-gray-300 bg-gray-600/30 p-2 rounded mb-2">
                                  "{request.message}"
                                </div>
                              )}

                              <div className="text-xs text-gray-500">
                                Sent on {new Date(request.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            {request.status === "PENDING" && (
                              <Button
                                onClick={() => handleDeleteRequest(request.id)}
                                disabled={processingRequests.has(request.id)}
                                size="sm"
                                variant="ghost"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-4"
                              >
                                {processingRequests.has(request.id) ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Received Requests Tab */}
          <TabsContent value="received-requests">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white">Received Join Requests</CardTitle>
                <CardDescription className="text-gray-400">Manage requests to join your trips</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400">Loading requests...</p>
                  </div>
                ) : receivedRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No join requests</h3>
                    <p className="text-gray-400">When people request to join your trips, they'll appear here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedRequests.map((request) => (
                      <Card key={request.id} className="bg-gray-700/50 border-gray-600">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-white">{request.trip.name}</h3>
                                <Badge className={getStatusColor(request.status)}>
                                  {request.status === "PENDING" && <Clock className="w-3 h-3 mr-1" />}
                                  {request.status === "ACCEPTED" && <CheckCircle className="w-3 h-3 mr-1" />}
                                  {request.status === "REJECTED" && <XCircle className="w-3 h-3 mr-1" />}
                                  {request.status.toLowerCase()}
                                </Badge>
                              </div>

                              {request.requester && (
                                <div className="flex items-center gap-3 mb-3">
                                  {request.requester.profileImageUrl ? (
                                    <img
                                      src={request.requester.profileImageUrl || "/placeholder.svg"}
                                      alt={`${request.requester.firstName} ${request.requester.lastName}`}
                                      className="w-8 h-8 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                      {request.requester.firstName?.[0]?.toUpperCase() ||
                                        request.requester.email[0].toUpperCase()}
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-sm font-medium text-white">
                                      {request.requester.firstName} {request.requester.lastName}
                                    </p>
                                    <p className="text-xs text-gray-400">{request.requester.email}</p>
                                  </div>
                                </div>
                              )}

                              {request.message && (
                                <div className="text-sm text-gray-300 bg-gray-600/30 p-2 rounded mb-2">
                                  "{request.message}"
                                </div>
                              )}

                              <div className="text-xs text-gray-500">
                                Received on {new Date(request.createdAt).toLocaleDateString()}
                              </div>
                            </div>

                            {request.status === "PENDING" && (
                              <div className="flex gap-2 ml-4">
                                <Button
                                  onClick={() => handleRequestAction(request.id, "accept")}
                                  disabled={processingRequests.has(request.id)}
                                  size="sm"
                                  className="bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30"
                                >
                                  {processingRequests.has(request.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-3 h-3" />
                                  )}
                                </Button>
                                <Button
                                  onClick={() => handleRequestAction(request.id, "reject")}
                                  disabled={processingRequests.has(request.id)}
                                  size="sm"
                                  variant="outline"
                                  className="bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30"
                                >
                                  {processingRequests.has(request.id) ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-400" />
                      Notifications
                      {unreadCount > 0 && <Badge className="bg-red-500 text-white">{unreadCount}</Badge>}
                    </CardTitle>
                    <CardDescription className="text-gray-400">Stay updated with your trip activities</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button
                      onClick={markAllNotificationsAsRead}
                      variant="outline"
                      size="sm"
                      className="border-orange-500/50 text-orange-400 hover:bg-orange-500/10 bg-transparent"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark All Read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {loadingNotifications ? (
                  <div className="text-center py-8">
                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto mb-2" />
                    <p className="text-gray-400">Loading notifications...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <BellOff className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">No notifications</h3>
                    <p className="text-gray-400">You're all caught up! Notifications will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {notifications.map((notification) => (
                      <Card
                        key={notification.id}
                        className={`border transition-all duration-200 cursor-pointer ${
                          notification.read
                            ? "bg-gray-700/30 border-gray-600"
                            : "bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20"
                        }`}
                        onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 mt-0.5">{getNotificationIcon(notification.type)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="text-sm font-medium text-white truncate">{notification.title}</h4>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0 ml-2" />
                                )}
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{notification.message}</p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">{formatDate(notification.createdAt)}</span>
                                {notification.data?.tripName && (
                                  <Badge className="bg-gray-600/50 text-gray-300 text-xs">
                                    {notification.data.tripName}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
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
