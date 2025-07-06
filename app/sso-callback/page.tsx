"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Loader2, MapPin } from "lucide-react"

export default function SSOCallback() {
  const { user, isLoaded, isSignedIn } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [syncStatus, setSyncStatus] = useState("Completing sign-in...")

  useEffect(() => {
    const handleGoogleAuth = async () => {
      if (isLoaded && isSignedIn && user) {
        console.log("🔄 Processing Google OAuth user:", user.id)
        setSyncStatus("Checking account status...")

        try {
          // First check if user exists in our database
          const checkResponse = await fetch("/api/user/check", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clerkId: user.id }),
          })

          if (checkResponse.ok) {
            const checkData = await checkResponse.json()

            if (checkData.exists) {
              // User exists - this is a sign-in, redirect to profile
              console.log("✅ Existing user signing in")
              setSyncStatus("Welcome back! Redirecting to profile...")
              router.push("/profile")
              return
            }
          }

          // User doesn't exist - this is a sign-up, sync to database
          console.log("🔄 New Google user, syncing to database...")
          setSyncStatus("Creating your account...")

          const syncResponse = await fetch("/api/user/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkId: user.id,
              email: user.emailAddresses[0]?.emailAddress || "",
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              profileImageUrl: user.imageUrl || null,
            }),
          })

          if (syncResponse.ok) {
            const syncData = await syncResponse.json()
            console.log("✅ Google user synced:", syncData.message)
            setSyncStatus("Account created! Signing out and redirecting to sign-in...")
          } else {
            console.error("❌ Failed to sync Google user:", syncResponse.status)
            setSyncStatus("Signing out and redirecting to sign-in...")
          }

          // For new sign-ups, sign out and redirect to sign-in
          console.log("🔄 Signing out new user to redirect to sign-in...")
          await signOut()

          setTimeout(() => {
            router.push("/sign-in")
          }, 1000)
        } catch (error) {
          console.error("❌ Error processing Google user:", error)
          setSyncStatus("Error occurred. Redirecting to sign-in...")

          await signOut()
          setTimeout(() => {
            router.push("/sign-in")
          }, 1000)
        }
      } else if (isLoaded && !isSignedIn) {
        router.push("/sign-in")
      }
    }

    handleGoogleAuth()
  }, [isLoaded, isSignedIn, user, router, signOut])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="text-center space-y-6">
        {/* Logo/Icon */}
        <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
          <MapPin className="w-8 h-8 text-white" />
        </div>

        {/* Spinner */}
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-green-500 mx-auto" />
          <div className="absolute inset-0 h-12 w-12 border-2 border-green-500/20 rounded-full mx-auto"></div>
        </div>

        {/* Dynamic status text */}
        <div className="space-y-2">
          <p className="text-white text-lg font-medium">Completing your journey</p>
          <p className="text-gray-400 text-sm">{syncStatus}</p>
        </div>

        {/* Google OAuth icon */}
        <div className="flex justify-center">
          <svg className="w-6 h-6 animate-pulse" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
        </div>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
