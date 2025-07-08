"use client"

import { useState, useEffect } from "react"
import { useUser } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { MapPin, Menu, Plus } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { CustomUserButton } from "@/components/custom-user-button"

interface DatabaseUser {
  id: number
  clerkId: string
  email: string
  firstName: string
  lastName: string
  profileImageUrl: string | null
}

export function Navbar() {
  const { user: clerkUser, isLoaded, isSignedIn } = useUser()
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Fetch user data from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (!isSignedIn || !clerkUser) return

      try {
        const response = await fetch("/api/user")
        if (response.ok) {
          const data = await response.json()
          setDbUser(data.user)
        }
      } catch (err) {
        console.error("Error fetching user:", err)
      }
    }

    if (isLoaded && isSignedIn) {
      fetchUserData()
    }
  }, [isLoaded, isSignedIn, clerkUser])

  const navItems = [
    { name: "Home", href: "/" },
    { name: "How It Works", href: "/#how-it-works" },
    { name: "Features", href: "/#features" },
    { name: "About", href: "/#about" },
  ]

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-gray-800/50 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
              Trekker
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`text-sm font-medium transition-colors hover:text-green-400 ${
                  isActive(item.href) ? "text-green-400" : "text-gray-300"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoaded && isSignedIn ? (
              <div className="flex items-center space-x-4">
                <Button
                  onClick={() => router.push("/trips")}
                  variant="outline"
                  size="sm"
                  className="border-green-500/50 text-green-400 hover:bg-green-500/10 bg-transparent"
                >
                  My Trips
                </Button>
                <Button
                  onClick={() => router.push("/dashboard")}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Host Trip
                </Button>
                <CustomUserButton />
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  onClick={() => router.push("/sign-in")}
                  variant="ghost"
                  size="sm"
                  className="text-gray-300 hover:text-white hover:bg-gray-800"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => router.push("/sign-up")}
                  size="sm"
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                >
                  Get Started
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-300 hover:text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] bg-gray-900/95 backdrop-blur border-gray-800">
                <div className="flex flex-col h-full">
                  {/* Mobile Header */}
                  <div className="flex items-center justify-between pb-6 border-b border-gray-800">
                    <Link href="/" className="flex items-center space-x-2" onClick={() => setIsOpen(false)}>
                      <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-white" />
                      </div>
                      <span className="text-xl font-bold bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
                        Trekker
                      </span>
                    </Link>
                  </div>

                  {/* Mobile Navigation */}
                  <div className="flex flex-col space-y-4 py-6">
                    {navItems.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        className={`text-base font-medium transition-colors hover:text-green-400 ${
                          isActive(item.href) ? "text-green-400" : "text-gray-300"
                        }`}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>

                  {/* Mobile Auth */}
                  <div className="mt-auto pt-6 border-t border-gray-800">
                    {isLoaded && isSignedIn ? (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 rounded-lg bg-gray-800/50">
                          <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                            <span className="text-green-400 font-medium">
                              {dbUser?.firstName?.charAt(0) || clerkUser?.firstName?.charAt(0) || "U"}
                            </span>
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {dbUser?.firstName || clerkUser?.firstName} {dbUser?.lastName || clerkUser?.lastName}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {dbUser?.email || clerkUser?.emailAddresses[0]?.emailAddress}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => {
                            router.push("/trips")
                            setIsOpen(false)
                          }}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        >
                          Host a Trip
                        </Button>
                        <Button
                          onClick={() => {
                            router.push("/dashboard")
                            setIsOpen(false)
                          }}
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        >
                          Dashboard
                        </Button>
                        <Button
                          onClick={() => {
                            router.push("/profile")
                            setIsOpen(false)
                          }}
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        >
                          Profile
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Button
                          onClick={() => {
                            router.push("/sign-in")
                            setIsOpen(false)
                          }}
                          variant="outline"
                          className="w-full border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                        >
                          Sign In
                        </Button>
                        <Button
                          onClick={() => {
                            router.push("/sign-up")
                            setIsOpen(false)
                          }}
                          className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
                        >
                          Get Started
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  )
}
