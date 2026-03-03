"use server"

import { currentUser } from "@clerk/nextjs/server"
import { prisma } from "@/lib/prisma" // Assuming you have your Prisma client initialized here
import { revalidatePath } from "next/cache"
import { v2 as cloudinary } from "cloudinary"
import { Readable } from "stream" // Import Readable from Node.js stream module
import { error } from "console"
import { use } from "react"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Helper to convert ArrayBuffer to Readable stream
const bufferToStream = (buffer: ArrayBuffer): Readable => {
  const readable = new Readable()
  readable._read = () => {} // No-op
  readable.push(Buffer.from(buffer))
  readable.push(null)
  return readable
}

export async function uploadTripPhotos(formData: FormData) {
  const user = await currentUser()
  if (!user) {
    return { success: false, error: "User not authenticated." }
  }
  const userId = user.id

  const tripId = formData.get("tripId") as string
  const files = formData.getAll("files") as File[]
  const captions = formData.getAll("captions") as string[]
  const locations = formData.getAll("locations") as string[]

  if (!files || files.length === 0 || !tripId) {
    return { success: false, error: "Missing files or trip ID." }
  }

  try {
    const uploadPromises = files.map(async (file, index) => {
      if (file.size === 0) {
        return { success: false, error: `Uploaded file ${file.name} is empty.` }
      }

      // Convert File to ArrayBuffer, then to Readable stream
      const arrayBuffer = await file.arrayBuffer()
      const stream = bufferToStream(arrayBuffer)

      return new Promise<{ success: boolean; error?: string }>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `trip-tracker/${tripId}`,
            resource_type: "auto", // Automatically detect image or video
            public_id: `${tripId}-${Date.now()}-${file.name.replace(/\s/g, "_")}`, // Unique public ID
          },
          async (error, result) => {
            if (error) {
              console.error(`Cloudinary upload error for ${file.name}:`, error)
              resolve({ success: false, error: `Failed to upload ${file.name}` })
            } else if (result && result.secure_url) {
              try {
                await prisma.tripPhoto.create({
                  data: {
                    tripId,
                    uploadedByClerkId: userId,
                    imageUrl: result.secure_url,
                    caption: captions[index] || "",
                    location: locations[index] || "",
                    date: new Date(), // Default to current date, can be made editable later
                  },
                })
                resolve({ success: true })
              } catch (dbError) {
                console.error(`Database save error for ${file.name}:`, dbError)
                resolve({ success: false, error: `Failed to save ${file.name} to database` })
              }
            } else {
              resolve({ success: false, error: `Unknown Cloudinary upload issue for ${file.name}` })
            }
          },
        )
        stream.pipe(uploadStream)
      })
    })

    const results = await Promise.all(uploadPromises)

    const successfulUploads = results.filter((result) => result.success).length
    if (successfulUploads > 0) {
      revalidatePath(`/trips/${tripId}/memories`) // Revalidate the memories page
      return { success: true, message: `${successfulUploads} photo(s)/video(s) uploaded successfully!` }
    } else {
      const errors = results
        .filter((result) => !result.success)
        .map((result) => result.error)
        .join(", ")
      return { success: false, error: `No files were uploaded successfully. Errors: ${errors}` }
    }
  } catch (error) {
    console.error("Error in uploadTripPhotos server action:", error)
    return { success: false, error: "An unexpected error occurred during upload." }
  }
}

export async function getTripPhotos(tripId: string) {
  const user = await currentUser()

  if (!user) {
    return { photos: [], error: "User not authenticated." }
  }
  try {
    // Verify user is a member of the trip
    const isMember = await prisma.tripMember.findUnique({
      where: {
        tripId_userClerkId: {
          tripId: tripId,
          userClerkId: user.id,
        },
      },
    })

    if (!isMember) {
      return { photos: [], error: "You are not authorized to view photos for this trip." }
    }

    const photos = await prisma.tripPhoto.findMany({
      where: { tripId },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: {
          select: {
            firstName: true,
            lastName: true,
            profileImageUrl: true,
          },
        },
      },
    })
    return { photos, error: null }
  } catch (error) {
    console.error("Error fetching trip photos:", error)
    return { photos: [], error: "Failed to fetch trip photos." }
  }
}

export async function getTripHighlightPhoto(tripId: string): Promise<string | null> {
  try {
    const photo = await prisma.tripPhoto.findFirst({
      where: { tripId },
      orderBy: { createdAt: "desc" }, // Get the most recent photo
      select: { imageUrl: true },
    })
    return photo?.imageUrl || null
  } catch (error) {
    console.error("Error fetching trip highlight photo:", error)
    return null
  }
}
