import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/toaster"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Trekker - Smart Trip Expense Tracking",
  description: "Upload UPI screenshots, let AI handle the math. Smart expense tracking for group trips.",
  keywords: "trip expenses, group travel, UPI, expense tracking, travel app",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  )
}
