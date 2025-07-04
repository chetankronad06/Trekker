import { currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mountain, User, Database, CheckCircle } from "lucide-react"
import { UserButton } from "@clerk/nextjs"

async function syncUserToDatabase() {
  try {
    const user = await currentUser()

    if (!user) {
      return {
        success: false,
        message: "User not authenticated",
      }
    }

    // Try to sync user to database
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
    const response = await fetch(`${baseUrl}/api/sync-user`, {
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
      return {
        success: true,
        isNew: data.isNew,
        user: data.user,
        message: data.isNew ? "New user created in database" : "User already exists in database",
      }
    } else {
      return {
        success: false,
        message: "Failed to sync user to database",
      }
    }
  } catch (error) {
    console.error("Error syncing user:", error)
    return {
      success: false,
      message: "Failed to sync user to database",
    }
  }
}

export default async function Dashboard() {
  const user = await currentUser()

  if (!user) {
    redirect("/sign-in")
  }

  // Ensure user is synced to database
  const syncResult = await syncUserToDatabase()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Mountain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Trekker Dashboard
              </h1>
              <p className="text-gray-600">Welcome back, {user.firstName || "User"}!</p>
            </div>
          </div>
          <UserButton
            afterSignOutUrl="/sign-in"
            appearance={{
              elements: {
                avatarBox: "w-10 h-10",
              },
            }}
          />
        </div>

        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">User Info</CardTitle>
              <User className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-900">
                {user.firstName || "Unknown"} {user.lastName || "User"}
              </div>
              <p className="text-xs text-gray-500">{user.emailAddresses[0]?.emailAddress}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Database Status</CardTitle>
              <Database className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-900">{syncResult.success ? "✅ Connected" : "❌ Error"}</div>
              <p className="text-xs text-gray-500">Prisma ORM</p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Sync Status</CardTitle>
              <CheckCircle className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-gray-900">{syncResult.isNew ? "🆕 New" : "✅ Existing"}</div>
              <p className="text-xs text-gray-500">User in database</p>
            </CardContent>
          </Card>
        </div>

        {/* Status Message */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5 text-blue-600" />
              Database Sync Status
            </CardTitle>
            <CardDescription>User synchronization with Supabase via Prisma</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className={`flex items-center gap-3 p-4 rounded-lg ${syncResult.success ? "bg-green-50" : "bg-red-50"}`}
            >
              <CheckCircle className={`h-5 w-5 ${syncResult.success ? "text-green-600" : "text-red-600"}`} />
              <div>
                <p className={`font-medium ${syncResult.success ? "text-green-800" : "text-red-800"}`}>
                  {syncResult.message}
                </p>
                <p className={`text-sm ${syncResult.success ? "text-green-600" : "text-red-600"}`}>
                  Clerk ID: {user.id}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coming Soon */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle>🚀 Coming Soon</CardTitle>
            <CardDescription>Features we'll add step by step</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Trip Management</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Expense Tracking</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <span>Analytics & Reports</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
