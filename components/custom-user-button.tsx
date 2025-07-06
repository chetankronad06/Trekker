"use client"

import { useState } from "react"
import { useUser, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, } from "lucide-react"
import Image from "next/image"

export function CustomUserButton() {
  const { user } = useUser()
  const { signOut } = useClerk()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = firstName?.charAt(0) || ""
    const last = lastName?.charAt(0) || ""
    return (first + last).toUpperCase() || "U"
  }

  const getDisplayName = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    if (user.firstName) {
      return user.firstName
    }
    if (user.lastName) {
      return user.lastName
    }
    return user.emailAddresses[0]?.emailAddress || "Traveler"
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 p-2 h-auto bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded-lg"
        >
          {/* Avatar */}
          <div className="relative">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl || "/placeholder.svg"}
                alt="Profile"
                width={32}
                height={32}
                className="rounded-full border-2 border-green-500/50"
              />
            ) : (
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {getInitials(user.firstName, user.lastName)}
              </div>
            )}
          </div>

          {/* Name and Email - Hidden on mobile */}
          <div className="hidden sm:flex flex-col items-start min-w-0">
            <span className="text-white text-sm font-medium truncate max-w-[120px]">{getDisplayName()}</span>
            <span className="text-gray-400 text-xs truncate max-w-[120px]">{user.emailAddresses[0]?.emailAddress}</span>
          </div>

          {/* <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" /> */}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">{getDisplayName()}</p>
            <p className="text-xs leading-none text-gray-400">{user.emailAddresses[0]?.emailAddress}</p>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* <DropdownMenuItem
          onClick={() => {
            setIsOpen(false)
            // Profile is already the current page, so we don't need to navigate
          }}
          className="cursor-pointer"
        >
          <User className="mr-2 h-4 w-4 text-green-400" />
          <span>Profile Settings</span>
        </DropdownMenuItem> */}

        {/* <DropdownMenuItem
          onClick={() => {
            setIsOpen(false)
            // You can add more settings here in the future
          }}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4 text-green-400" />
          <span>Preferences</span>
        </DropdownMenuItem> */}

        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-red-400 focus:text-red-300">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sign Out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
