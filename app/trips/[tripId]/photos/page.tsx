import { getTripPhotos } from "@/app/api/trips/[tripId]/photos/route"
import { TripPhotoUpload } from "@/components/trip-photo-upload"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import Image from "next/image"
import { format } from "date-fns"
import { MapPin, CalendarDays, User } from "lucide-react"

interface TripPhotosPageProps {
  params: {
    tripId: string
  }
}

export default async function TripPhotosPage({ params }: TripPhotosPageProps) {
  const { tripId } = params
  const { photos, error } = await getTripPhotos(tripId)

  if (error) {
    return <div className="text-center text-red-500 mt-8">Error: {error}</div>
  }

  return (
    <main className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Trip Memories</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Photo Upload Section */}
        <div className="md:col-span-1 lg:col-span-1">
          <TripPhotoUpload tripId={tripId} />
        </div>

        {/* Photos Display Section */}
        <div className="md:col-span-1 lg:col-span-2">
          {photos.length === 0 ? (
            <Card className="p-6 text-center">
              <CardTitle className="text-xl">No photos yet!</CardTitle>
              <CardDescription className="mt-2">Be the first to upload a memory for this trip.</CardDescription>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {photos.map((photo) => (
                <Card key={photo.id} className="overflow-hidden">
                  <div className="relative w-full h-48">
                    <Image
                      src={photo.imageUrl || "/placeholder.svg"}
                      alt={photo.caption || "Trip photo"}
                      layout="fill"
                      objectFit="cover"
                      className="rounded-t-lg"
                    />
                  </div>
                  <CardContent className="p-4">
                    {photo.caption && <p className="text-sm font-medium mb-2">{photo.caption}</p>}
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>
                          Uploaded by {photo.uploadedBy?.firstName || "Unknown"} {photo.uploadedBy?.lastName || ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        <span>{format(new Date(photo.createdAt), "PPP")}</span>
                      </div>
                      {photo.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>{photo.location}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
