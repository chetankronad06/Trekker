"use client"

import { AuthenticateWithRedirectCallback } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function SSOCallback() {
  const { user, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const [syncStatus, setSyncStatus] = useState("Completing sign-in...")

  useEffect(() => {
    const syncGoogleUser = async () => {
      // Wait for user to be fully loaded and signed in
      if (isLoaded && isSignedIn && user) {
        console.log("🔄 Syncing Google OAuth user:", user.id)
        setSyncStatus("Syncing your account...")

        try {
          const response = await fetch("/api/sync-user", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              clerkId: user.id,
              email: user.emailAddresses[0]?.emailAddress || "",
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              profileImageUrl: user.imageUrl || null,
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log("✅ Google user synced:", data.message)
            setSyncStatus("Account synced! Redirecting to sign-in...")
          } else {
            console.error("❌ Failed to sync Google user:", response.status)
            setSyncStatus("Redirecting to sign-in...")
          }
        } catch (error) {
          console.error("❌ Error syncing Google user:", error)
          setSyncStatus("Redirecting to sign-in...")
        }

        // Redirect to sign-in page instead of dashboard
        setTimeout(() => {
          router.push("/sign-in")
        }, 1500)
      } else if (isLoaded && !isSignedIn) {
        // If not signed in after loading, redirect to sign-in
        router.push("/sign-in")
      }
    }

    syncGoogleUser()
  }, [isLoaded, isSignedIn, user, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">{syncStatus}</p>
        <p className="text-sm text-gray-500 mt-2">Please wait...</p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  )
}
