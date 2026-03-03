"use client"
import { useEffect, useRef } from "react"
import Image from "next/image"
import { Dialog, DialogContent ,DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, User, MapPin, CalendarDays } from "lucide-react"
import { format } from "date-fns"

interface PhotoViewerModalProps {
  photos: {
    id: string
    imageUrl: string
    caption: string | null
    location: string | null
    date: Date | null
    createdAt: Date
    uploadedBy: {
      firstName: string
      lastName: string
      profileImageUrl: string | null
    }
  }[]
  currentIndex: number
  onClose: () => void
  onNavigate: (direction: "prev" | "next") => void
}

export function PhotoViewerModal({ photos, currentIndex, onClose, onNavigate }: PhotoViewerModalProps) {
  const currentPhoto = photos[currentIndex]
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        onNavigate("prev")
      } else if (event.key === "ArrowRight") {
        onNavigate("next")
      } else if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onNavigate, onClose])

  useEffect(() => {
    // Pause video when navigating away from it
    if (videoRef.current && !currentPhoto.imageUrl.match(/\.(mp4|mov|webm)$/i)) {
      videoRef.current.pause()
    }
  }, [currentPhoto])

  if (!currentPhoto) return null

  const isVideo = currentPhoto.imageUrl.match(/\.(mp4|mov|webm)$/i)

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogTitle>Photo Viewer</DialogTitle>
      <DialogContent className="max-w-5xl h-[90vh] p-0 bg-transparent border-none flex flex-col">
        <div className="relative flex-1 flex items-center justify-center bg-black/90 rounded-lg overflow-hidden">
          {isVideo ? (
            <video
              ref={videoRef}
              src={currentPhoto.imageUrl}
              className="max-h-full max-w-full object-contain"
              controls
              autoPlay
              loop
            />
          ) : (
            <Image
              src={currentPhoto.imageUrl || "/placeholder.svg"}
              alt={currentPhoto.caption || "Trip photo"}
              layout="fill"
              objectFit="contain"
              className="rounded-lg"
            />
          )}

          {/* Navigation Buttons */}
          {photos.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full h-10 w-10 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate("prev")
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white rounded-full h-10 w-10 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  onNavigate("next")
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 text-white rounded-full h-8 w-8 z-10"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Photo Info */}
        <div className="bg-gray-900/90 backdrop-blur-sm p-4 rounded-b-lg text-white flex-shrink-0">
          {currentPhoto.caption && <p className="text-lg font-semibold mb-2">{currentPhoto.caption}</p>}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-300">
            <div className="flex items-center gap-1">
              <User className="h-4 w-4 text-green-400" />
              <span>
                Uploaded by {currentPhoto.uploadedBy?.firstName || "Unknown"} {currentPhoto.uploadedBy?.lastName || ""}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarDays className="h-4 w-4 text-green-400" />
              <span>{format(new Date(currentPhoto.createdAt), "PPP 'at' p")}</span>
            </div>
            {currentPhoto.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4 text-green-400" />
                <span>{currentPhoto.location}</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
