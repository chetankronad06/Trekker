import { Loader2, MapPin, LogIn } from "lucide-react"

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
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

        {/* Text */}
        <div className="space-y-2">
          <p className="text-white text-lg font-medium">Welcome back, traveler</p>
          <p className="text-gray-400 text-sm">Preparing your sign-in experience</p>
        </div>

        {/* Sign-in icon */}
        <div className="flex justify-center">
          <LogIn className="w-6 h-6 text-green-400 animate-pulse" />
        </div>
      </div>
    </div>
  )
}
