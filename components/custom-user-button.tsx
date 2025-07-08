"use client"

import { useUser, useClerk } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings, Users, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"

export function CustomUserButton() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full border-2 border-green-500/30 hover:border-green-500/50"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={user.imageUrl || "/placeholder.svg"} alt={user.firstName || "User"} />
            <AvatarFallback className="bg-green-500/20 text-green-400">
              {user.firstName?.charAt(0) || user.emailAddresses[0]?.emailAddress.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-800/95 backdrop-blur-sm border-gray-700" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">
              {user.firstName} {user.lastName}
            </p>
            <p className="text-xs leading-none text-gray-400">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <TrendingUp className="mr-2 h-4 w-4" />
          <span>Dashboard</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
          onClick={() => router.push("/profile")}
        >
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
          onClick={() => router.push("/trips")}
        >
          <Users className="mr-2 h-4 w-4" />
          <span>My Trips</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-gray-300 hover:bg-gray-700 hover:text-white cursor-pointer"
          onClick={() => router.push("/settings")}
        >
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-700" />
        <DropdownMenuItem
          className="text-red-400 hover:bg-red-500/10 hover:text-red-300 cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
