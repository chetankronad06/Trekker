"use client"
import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import { getTripPhotos } from "@/app/api/trips/[tripId]/photos/route"
import { TripPhotoUpload } from "@/components/trip-photo-upload"
import { Card, CardDescription, CardTitle } from "@/components/ui/card"
import { MapPin, User, ImageIcon, Video, Loader2, PlusCircle } from "lucide-react"
import { format } from "date-fns"
import { PhotoViewerModal } from "@/components/photo-viewer-modal"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CardContent } from "./card"

interface TripMemoriesGalleryProps {
  tripId: string
}

interface TripPhoto {
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
}

export function TripMemoriesGallery({ tripId }: TripMemoriesGalleryProps) {
  const [photos, setPhotos] = useState<TripPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null)
  const [showUploadDialog, setShowUploadDialog] = useState(false)

  const fetchPhotos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { photos: fetchedPhotos, error: fetchError } = await getTripPhotos(tripId)
    if (fetchError) {
      setError(fetchError)
    } else {
      setPhotos(fetchedPhotos as TripPhoto[])
    }
    setIsLoading(false)
  }, [tripId])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  const openPhotoViewer = (index: number) => {
    setSelectedPhotoIndex(index)
  }

  const closePhotoViewer = () => {
    setSelectedPhotoIndex(null)
  }

  const navigatePhoto = (direction: "prev" | "next") => {
    if (selectedPhotoIndex === null) return
    let newIndex = selectedPhotoIndex
    if (direction === "next") {
      newIndex = (selectedPhotoIndex + 1) % photos.length
    } else {
      newIndex = (selectedPhotoIndex - 1 + photos.length) % photos.length
    }
    setSelectedPhotoIndex(newIndex)
  }

  const handleUploadSuccess = () => {
    setShowUploadDialog(false) // Close dialog on success
    fetchPhotos() // Re-fetch photos to update the gallery
  }

    if (isLoading) {
    return (
      <Card className="bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-full">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mx-auto mb-2" />
            <p className="text-gray-400">Loading memories...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return <div className="text-center text-red-500 mt-8">Error: {error}</div>
  }

  return (
    <div className="space-y-6">
      {/* Upload Button Section */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowUploadDialog(true)}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
        >
          <PlusCircle className="h-4 w-4 mr-2" /> Upload New Memories
        </Button>
      </div>

      {/* Photos Display Section - now full width */}
      <div>
        {photos.length === 0 ? (
          <Card className="p-6 text-center bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl h-full flex flex-col justify-center">
            <CardTitle className="text-xl text-white">No memories yet!</CardTitle>
            <CardDescription className="mt-2 text-gray-400">
              Be the first to upload a photo or video for this trip.
            </CardDescription>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {photos.map((photo, index) => (
              <Card
                key={photo.id}
                className="overflow-hidden bg-gray-800/90 border-gray-700 shadow-lg group cursor-pointer hover:shadow-green-500/10 transition-all duration-300"
                onClick={() => openPhotoViewer(index)}
              >
                <div className="relative w-full h-48 bg-gray-700">
                  {photo.imageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                    <video
                      src={photo.imageUrl}
                      className="w-full h-full object-cover"
                      controls={false}
                      muted
                      loop
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={photo.imageUrl || "/placeholder.svg"}
                      alt={photo.caption || "Trip photo"}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                    <div className="text-white text-xs space-y-1">
                      {photo.caption && <p className="font-medium line-clamp-1">{photo.caption}</p>}
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          {photo.uploadedBy?.firstName || "Unknown"} {photo.uploadedBy?.lastName || ""}
                        </span>
                      </div>
                      {photo.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{photo.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="absolute top-2 left-2 bg-gray-900/70 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                    {photo.imageUrl.match(/\.(mp4|mov|webm)$/i) ? (
                      <Video className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    <span>{format(new Date(photo.createdAt), "MMM dd")}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {selectedPhotoIndex !== null && (
        <PhotoViewerModal
          photos={photos}
          currentIndex={selectedPhotoIndex}
          onClose={closePhotoViewer}
          onNavigate={navigatePhoto}
        />
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent
          className="sm:max-w-[700px] p-0 border-none bg-transparent max-h-[90vh] overflow-hidden" // DialogContent clips overflow
        >
          <DialogHeader className="hidden">
            <DialogTitle>Upload Trip Photos & Videos</DialogTitle>
          </DialogHeader>
          <TripPhotoUpload tripId={tripId} onUploadSuccess={handleUploadSuccess} />
        </DialogContent>
      </Dialog>    </div>
  )
}
