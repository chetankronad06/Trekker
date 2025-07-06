"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MapPin, User, Mail, Edit3, Save, X, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CustomUserButton } from "@/components/custom-user-button"

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

export default function ProfilePage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  // const { signOut } = useClerk()
  const router = useRouter()

  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
  })

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
      } finally {
        setIsLoading(false)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchUserData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const syncUserToDatabase = async () => {
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
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
    setSuccess("")
  }

  const handleSave = async () => {
    if (!editForm.firstName || !editForm.lastName || !editForm.email) {
      setError("🧳 All fields are required for your travel profile")
      return
    }

    setIsSaving(true)
    setError("")
    setSuccess("")

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
        setSuccess("✈️ Travel profile updated successfully!")

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
      }
    } catch (err) {
      console.error("Error updating user:", err)
      setError("🚫 Failed to update your travel profile")
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
    setSuccess("")
  }

  if (!isLoaded || isLoading) {
    return null // This will show loading.tsx
  }

  if (!isSignedIn) {
    return null // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="container mx-auto p-4 max-w-4xl ">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Travel Profile
              </h1>
              <p className="text-gray-400 text-sm">Manage your journey settings</p>
            </div>
          </div>

          {/* Custom User Button */}
          <CustomUserButton />
        </div>

        {/* Profile Card */}
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

            {success && (
              <Alert className="border-green-500/50 bg-green-500/10">
                <AlertTriangle className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-300">{success}</AlertDescription>
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
      </div>
    </div>
  )
}
