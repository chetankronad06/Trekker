"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useSignUp, useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Eye, EyeOff, Mountain, Mail, Lock, User, Check, X, Loader2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function SignUpPage() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const { user, isSignedIn } = useUser()
  const router = useRouter()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [pendingVerification, setPendingVerification] = useState(false)
  const [code, setCode] = useState("")

  // Redirect if user is already signed in
  useEffect(() => {
    if (isSignedIn && user) {
      router.push("/dashboard")
    }
  }, [isSignedIn, user, router])

  // Show loading while checking authentication status
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Loading...</span>
        </div>
      </div>
    )
  }

  // If user is signed in, show redirect message
  if (isSignedIn && !pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-2xl border-0">
          <CardContent className="p-6 text-center">
            <div className="mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
            </div>
            <p className="text-gray-600">You&apos;re already signed in. Redirecting to dashboard...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Password strength validation
  const getPasswordStrength = (password: string) => {
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }

    const score = Object.values(checks).filter(Boolean).length
    return { checks, score }
  }

  const passwordStrength = getPasswordStrength(formData.password)
  const isPasswordValid = passwordStrength.score >= 4
  const doPasswordsMatch = formData.password === formData.confirmPassword && formData.confirmPassword !== ""

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isLoaded) return
    if (!isPasswordValid) {
      setError("Password does not meet strength requirements")
      return
    }
    if (!doPasswordsMatch) {
      setError("Passwords do not match")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await signUp.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        emailAddress: formData.email,
        password: formData.password,
      })

      await signUp.prepareEmailAddressVerification({ strategy: "email_code" })
      setPendingVerification(true)
    } catch (err: unknown) {
      console.error("Error:", err)
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoaded) return

    setIsLoading(true)
    setError("")

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      })

      if (completeSignUp.status === "complete") {
        await setActive({ session: completeSignUp.createdSessionId })

        // Sync user data to Supabase
        try {
          await fetch("/api/sync-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              clerkId: completeSignUp.createdUserId,
              email: formData.email,
              firstName: formData.firstName,
              lastName: formData.lastName,
            }),
          })
        } catch (syncError) {
          console.error("User sync error:", syncError)
          // Don't block the flow if sync fails
        }

        // Redirect to sign-in page as intended
        router.push("/sign-in")
      }
    } catch (err: unknown) {
      console.error("Error:", err)
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignUp = async () => {
    if (!isLoaded) return

    try {
      await signUp.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sso-callback",
        redirectUrlComplete: "/sign-in", // Changed from /dashboard to /sign-in
      })
    } catch (err: unknown) {
      console.error("Error:", err)
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
    }
  }

  if (pendingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Verify Your Email
            </CardTitle>
            <CardDescription>We&apos;ve sent a verification code to {formData.email}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerification} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-700">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  name="code"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="text-center text-lg tracking-widest"
                  maxLength={6}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify Email"
                )}
              </Button>
            </form>

            {/* CAPTCHA container for Clerk */}
            <div id="clerk-captcha" className="mt-4"></div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Card className="w-full max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
            <Mountain className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Join Trekker
          </CardTitle>
          <CardDescription>Start tracking your travel expenses today</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          <Button
            onClick={handleGoogleSignUp}
            variant="outline"
            className="w-full border-gray-300 hover:bg-gray-50 bg-transparent"
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
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">Or continue with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert className="border-red-200 bg-red-50">
                <AlertDescription className="text-red-700">{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a strong password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>

              {formData.password && (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Password Strength:</span>
                    <span
                      className={`font-medium ${
                        passwordStrength.score >= 4
                          ? "text-green-600"
                          : passwordStrength.score >= 3
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {passwordStrength.score >= 4 ? "Strong" : passwordStrength.score >= 3 ? "Medium" : "Weak"}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {Object.entries({
                      length: "At least 8 characters",
                      uppercase: "One uppercase letter",
                      lowercase: "One lowercase letter",
                      number: "One number",
                      special: "One special character",
                    }).map(([key, label]) => (
                      <div key={key} className="flex items-center gap-2">
                        {passwordStrength.checks[key as keyof typeof passwordStrength.checks] ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <X className="h-3 w-3 text-red-600" />
                        )}
                        <span
                          className={
                            passwordStrength.checks[key as keyof typeof passwordStrength.checks]
                              ? "text-green-600"
                              : "text-gray-500"
                          }
                        >
                          {label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {formData.confirmPassword && (
                <div className="flex items-center gap-2 text-sm">
                  {doPasswordsMatch ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <X className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              className="w-full text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              disabled={isLoading || !isPasswordValid || !doPasswordsMatch}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            {/* CAPTCHA container for Clerk */}
            <div id="clerk-captcha" className="mt-4"></div>
          </form>

          <div className="text-center text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/sign-in" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
