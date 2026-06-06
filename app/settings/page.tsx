"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { 
  Settings, 
  User, 
  Lock, 
  Volume2, 
  MapPin, 
  HelpCircle, 
  ArrowLeft, 
  Globe, 
  Shield, 
  Coins,
  CheckCircle,
  ExternalLink
} from "lucide-react"
import { CustomUserButton } from "@/components/custom-user-button"
import { useToast } from "@/hooks/use-toast"

export default function SettingsPage() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const router = useRouter()
  const { toast } = useToast()

  const [preferences, setPreferences] = useState({
    currency: "INR",
    notifications: true,
    realtimeSync: true,
    language: "en-US",
  })
  
  const [isSaving, setIsSaving] = useState(false)

  // Redirect if not signed in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in")
    }
  }, [isLoaded, isSignedIn, router])

  // Load local settings if any (from localStorage)
  useEffect(() => {
    const savedCurrency = localStorage.getItem("trekker_currency")
    const savedNotifications = localStorage.getItem("trekker_notifications")
    const savedRealtime = localStorage.getItem("trekker_realtime")

    setPreferences({
      currency: savedCurrency || "INR",
      notifications: savedNotifications !== "false",
      realtimeSync: savedRealtime !== "false",
      language: "en-US",
    })
  }, [])

  const handleSavePreferences = () => {
    setIsSaving(true)
    
    // Save to local storage for persistence
    localStorage.setItem("trekker_currency", preferences.currency)
    localStorage.setItem("trekker_notifications", preferences.notifications.toString())
    localStorage.setItem("trekker_realtime", preferences.realtimeSync.toString())

    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "✅ Preferences Saved",
        description: "Your local preferences have been updated.",
      })
    }, 800)
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto p-4 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => router.back()} 
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                Settings
              </h1>
              <p className="text-gray-400 text-sm">Manage preferences and account settings</p>
            </div>
          </div>
          <CustomUserButton />
        </div>

        {/* Settings Layout */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Settings Navigation */}
          <div className="space-y-2">
            <Card className="bg-gray-800/90 border-gray-700 p-4 space-y-1">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-green-400 bg-green-500/10 hover:bg-green-500/20"
              >
                <Settings className="w-4 h-4 mr-2" />
                General Preferences
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50"
                onClick={() => router.push("/profile")}
              >
                <User className="w-4 h-4 mr-2" />
                Travel Profile
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-300 hover:text-white hover:bg-gray-700/50"
                onClick={() => {
                  // Direct link to Clerk user profile page
                  window.open("https://accounts.clerk.com", "_blank")
                }}
              >
                <Shield className="w-4 h-4 mr-2" />
                Account Security <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </Button>
            </Card>
          </div>

          {/* Settings Fields */}
          <div className="md:col-span-2 space-y-6">
            {/* Travel Preferences */}
            <Card className="bg-gray-800/90 border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-green-400" />
                  Travel Preferences
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Configure default settings for your trip expense splitting
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="currency" className="text-gray-300">Default Currency</Label>
                  <Select 
                    value={preferences.currency} 
                    onValueChange={(value) => setPreferences(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger className="bg-gray-700/50 border-gray-600 text-white">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 text-white">
                      <SelectItem value="INR" className="focus:bg-gray-700 focus:text-white">INR (₹) - Indian Rupee</SelectItem>
                      <SelectItem value="USD" className="focus:bg-gray-700 focus:text-white">USD ($) - US Dollar</SelectItem>
                      <SelectItem value="EUR" className="focus:bg-gray-700 focus:text-white">EUR (€) - Euro</SelectItem>
                      <SelectItem value="GBP" className="focus:bg-gray-700 focus:text-white">GBP (£) - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">Expenses scanned or parsed will default to this currency.</p>
                </div>

                <div className="flex items-center justify-between space-x-2 pt-4 border-t border-gray-700">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Realtime Synchronization</Label>
                    <p className="text-xs text-gray-500">Allows instant group updates when chat messages or expenses are logged.</p>
                  </div>
                  <Switch 
                    checked={preferences.realtimeSync}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, realtimeSync: checked }))}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="flex items-center justify-between space-x-2 pt-4 border-t border-gray-700">
                  <div className="space-y-0.5">
                    <Label className="text-gray-300">Push Notifications</Label>
                    <p className="text-xs text-gray-500">Receive alerts when added to trips or when expenses are split.</p>
                  </div>
                  <Switch 
                    checked={preferences.notifications}
                    onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, notifications: checked }))}
                    className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-600"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <Button 
                    onClick={handleSavePreferences} 
                    disabled={isSaving}
                    className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                  >
                    {isSaving ? "Saving..." : "Save Preferences"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Clerk Account Overview */}
            <Card className="bg-gray-800/90 border-gray-700 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-blue-400" />
                  Account Authentication
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Logged in with Clerk authentication system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-gray-300">
                <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-md">
                  <div>
                    <span className="font-semibold text-white">Security & Login Details</span>
                    <p className="text-xs text-gray-400 mt-1">Configure MFA, email settings, or reset your password.</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 bg-transparent flex items-center gap-1"
                    onClick={() => {
                      window.open("https://accounts.clerk.com", "_blank")
                    }}
                  >
                    Manage Account
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
