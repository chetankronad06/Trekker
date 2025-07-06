"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSignIn, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, MapPin, Mail, Lock, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignInPage() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { user, isSignedIn } = useUser()
  const router = useRouter()

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Redirect if user is already signed in
  useEffect(() => {
    if (isSignedIn && user) {
      router.push("/profile")
    }
  }, [isSignedIn, user, router])

  if (!isLoaded) {
    return null // This will show loading.tsx
  }

  // If user is signed in, don't render the form
  if (isSignedIn) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
  }

  const checkUserExistsInDatabase = async (clerkId: string): Promise<boolean> => {
    try {
      const response = await fetch("/api/user/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId }),
      })

      if (response.ok) {
        const data = await response.json()
        return data.exists
      }
      return false
    } catch (error) {
      console.error("Error checking user:", error)
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return

    setIsLoading(true)
    setError("")

    try {
      const result = await signIn.create({
        identifier: formData.email,
        password: formData.password,
      })

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId })

        // Check if user exists in our database
        const userExists = await checkUserExistsInDatabase(result.createdSessionId)

        if (!userExists) {
          setError("🧳 Ready to start your journey? Please create your traveler account first!")
          return
        }

        router.push("/profile")
      }
    } catch (err: unknown) {
      console.error("Sign in error:", err)

      // Handle specific error cases with travel-friendly messages
      if (err && typeof err === "object" && "errors" in err) {
        const errors = err.errors as Array<{ code?: string; message?: string }>
        const firstError = errors[0]

        if (firstError?.code === "form_identifier_not_found") {
          setError("🗺️ No traveler found with this email. Ready to join? Sign up to start your journey!")
        } else if (firstError?.code === "form_password_incorrect") {
          setError("🔐 Incorrect password. Double-check your travel credentials!")
        } else {
          setError(firstError?.message || "🚫 Unable to sign in. Please check your details and try again.")
        }
      } else {
        setError("🚫 Something went wrong. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (!isLoaded) return

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/sso-callback",
      })
    } catch (err: unknown) {
      console.error("Google sign in error:", err)
      setError("🌐 Google sign-in failed. Please try again or use email.")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-gray-800/90 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4 pb-6">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
            Welcome Back, Traveler
          </CardTitle>
          <CardDescription className="text-gray-300">Continue your journey with Trekker</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full border-gray-600 hover:bg-gray-700 bg-gray-700/50 text-white hover:text-white"
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
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
            Continue with Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full bg-gray-600" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-800 px-2 text-gray-400">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-500/50 bg-red-500/10">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <AlertDescription className="text-red-300">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-300">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-300">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                "Start Journey"
              )}
            </Button>

            {/* CAPTCHA container for Clerk */}
            <div id="clerk-captcha"></div>
          </form>

          <div className="text-center text-sm text-gray-400">
            {"New traveler? "}
            <Link href="/sign-up" className="font-medium text-green-400 hover:text-green-300">
              Create your account
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
