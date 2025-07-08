"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MapPin, Calendar, FileText, Loader2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"

interface CreateTripDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTripCreated: (trip: any) => void
}

export default function CreateTripDialog({ open, onOpenChange, onTripCreated }: CreateTripDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startingPoint: "",
    startDate: "",
    endDate: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { toast } = useToast()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      setError("🧳 Trip name is required for your journey!")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Use toast instead of success state
        toast({
          title: "🎉 Trip Created Successfully!",
          description: `${data.trip.name} is ready for your adventure. Share invite code: ${data.trip.inviteCode}`,
        })

        onTripCreated(data.trip)
        setFormData({
          name: "",
          description: "",
          startingPoint: "",
          startDate: "",
          endDate: "",
        })
      } else {
        setError(data.details || data.error || "🚫 Failed to create trip")
      }
    } catch (err) {
      console.error("Error creating trip:", err)
      setError("🚫 Something went wrong. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        name: "",
        description: "",
        startingPoint: "",
        startDate: "",
        endDate: "",
      })
      setError("")
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-gray-800/95 backdrop-blur-sm border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl bg-gradient-to-r from-green-400 to-green-500 bg-clip-text text-transparent">
            Create New Trip
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Set up a new trip to track expenses with your travel companions
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert className="border-red-500/50 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-300">{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name" className="text-gray-300">
              Trip Name *
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                name="name"
                placeholder="e.g., Goa Beach Adventure"
                value={formData.name}
                onChange={handleInputChange}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-gray-300">
              Description
            </Label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Textarea
                id="description"
                name="description"
                placeholder="Brief description of your trip..."
                value={formData.description}
                onChange={handleInputChange}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500 min-h-[80px]"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startingPoint" className="text-gray-300">
              Starting Point
            </Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="startingPoint"
                name="startingPoint"
                placeholder="e.g., Mumbai Airport"
                value={formData.startingPoint}
                onChange={handleInputChange}
                className="pl-10 bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-400 focus:border-green-500 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-gray-300">
                Start Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-gray-300">
                End Date
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="pl-10 bg-gray-700/50 border-gray-600 text-white focus:border-green-500 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
              className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Trip"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
