"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea" // Ensure Textarea is imported
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, UploadCloud, X, ImageIcon, Video } from "lucide-react"
import { toast } from "sonner"
import { uploadTripPhotos } from "@/app/api/trips/[tripId]/photos/route"

interface TripPhotoUploadProps {
  tripId: string
  onUploadSuccess?: () => void // Callback to refresh gallery after upload
}

interface FileWithMetadata {
  id: string // Unique ID for React keying and tracking
  file: File
  preview: string
  caption: string
  location: string
}

export function TripPhotoUpload({ tripId, onUploadSuccess }: TripPhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithMetadata[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [currentFileIndex, setCurrentFileIndex] = useState<number | null>(null) // Index of the file being edited
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const MAX_FILES = 5

  // Clean up object URLs when component unmounts or files are removed
  useEffect(() => {
    return () => {
      selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview))
    }
  }, [selectedFiles])

  const handleFiles = (files: FileList | null) => {
    if (!files) return

    const newFilesToAdd: FileWithMetadata[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (selectedFiles.length + newFilesToAdd.length >= MAX_FILES) {
        toast.warning(`You can upload a maximum of ${MAX_FILES} files at a time.`)
        break
      }
      if (file.type.startsWith("image/") || file.type.startsWith("video/")) {
        newFilesToAdd.push({
          id: `${file.name}-${Date.now()}-${Math.random()}`, // Unique ID
          file: file,
          preview: URL.createObjectURL(file),
          caption: "",
          location: "",
        })
      } else {
        toast.warning(`File type not supported: ${file.name}. Only images and videos are allowed.`)
      }
    }

    setSelectedFiles((prev) => {
      const updatedFiles = [...prev, ...newFilesToAdd]
      if (updatedFiles.length > 0 && currentFileIndex === null) {
        setCurrentFileIndex(0) // Select the first file for editing if none is selected
      }
      return updatedFiles
    })
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    if (fileInputRef.current) {
      fileInputRef.current.value = "" // Clear input to allow re-uploading same files
    }
  }

  const handleRemoveFile = (idToRemove: string) => {
    setSelectedFiles((prev) => {
      const newFiles = prev.filter((f) => f.id !== idToRemove)
      const fileToRemove = prev.find((f) => f.id === idToRemove)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview) // Revoke object URL
      }

      // Adjust currentFileIndex if the removed file was the selected one
      if (currentFileIndex !== null) {
        if (prev[currentFileIndex]?.id === idToRemove) {
          // If the removed file was the current one, select the next or previous
          if (newFiles.length > 0) {
            setCurrentFileIndex(Math.min(currentFileIndex, newFiles.length - 1))
          } else {
            setCurrentFileIndex(null) // No files left
          }
        } else if (currentFileIndex > newFiles.findIndex((f) => f.id === prev[currentFileIndex]?.id)) {
          // If a file before the current one was removed, adjust index
          setCurrentFileIndex(currentFileIndex - 1)
        }
      }
      return newFiles
    })
  }

  const handleCaptionChange = (value: string) => {
    if (currentFileIndex === null) return
    setSelectedFiles((prev) => prev.map((file, i) => (i === currentFileIndex ? { ...file, caption: value } : file)))
  }

  const handleLocationChange = (value: string) => {
    if (currentFileIndex === null) return
    setSelectedFiles((prev) => prev.map((file, i) => (i === currentFileIndex ? { ...file, location: value } : file)))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (selectedFiles.length === 0) {
      toast.error("Please select at least one image or video to upload.")
      return
    }

    setIsUploading(true)
    const formData = new FormData()
    formData.append("tripId", tripId)

    selectedFiles.forEach((item) => {
      formData.append("files", item.file) // Append the actual File object
      formData.append("captions", item.caption)
      formData.append("locations", item.location)
    })

    try {
      const result = await uploadTripPhotos(formData)
      if (result.success) {
        toast.success(result.message || "Photos uploaded successfully!")
        selectedFiles.forEach((file) => URL.revokeObjectURL(file.preview)) // Clean up previews
        setSelectedFiles([]) // Clear form after successful upload
        setCurrentFileIndex(null)
        onUploadSuccess?.() // Trigger refresh in parent
      } else {
        toast.error(result.error || "Failed to upload photos.")
      }
    } catch (error) {
      console.error("Error uploading photos:", error)
      toast.error("An unexpected error occurred during upload.")
    } finally {
      setIsUploading(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.add("border-green-500")
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove("border-green-500")
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (dropZoneRef.current) {
      dropZoneRef.current.classList.remove("border-green-500")
    }
    handleFiles(event.dataTransfer.files)
  }

  const currentFile = currentFileIndex !== null ? selectedFiles[currentFileIndex] : null

  return (
    <Card className="w-full max-w-md mx-auto bg-gray-800/90 backdrop-blur-sm border-gray-700 shadow-2xl flex flex-col max-h-[85vh]">
      <CardHeader className="flex-shrink-0">
        <CardTitle className="text-white">Upload Trip Photos & Videos</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-600 rounded-md cursor-pointer hover:border-green-500/70 transition-colors text-gray-400"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            ref={dropZoneRef}
          >
            <UploadCloud className="h-8 w-8 mb-2" />
            <span>Drag & drop files here or click to browse</span>
            <span className="text-xs mt-1">Max {MAX_FILES} files (images/videos)</span>
            <Input
              id="picture"
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              ref={fileInputRef}
              multiple
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">
                Selected Files ({selectedFiles.length}/{MAX_FILES})
              </h3>
              {/* Horizontal Scrollable Thumbnails */}
              <div className="flex overflow-x-auto gap-3 pb-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-800">
                {selectedFiles.map((item, index) => (
                  <div
                    key={item.id}
                    className={`relative flex-shrink-0 w-24 h-24 rounded-md overflow-hidden cursor-pointer border-2 ${
                      index === currentFileIndex ? "border-green-500" : "border-gray-700"
                    } hover:border-green-500/70 transition-colors`}
                    onClick={() => setCurrentFileIndex(index)}
                  >
                    {item.file.type.startsWith("image/") ? (
                      <Image
                        src={item.preview || "/placeholder.svg"}
                        alt={`Preview of ${item.file.name}`}
                        layout="fill"
                        objectFit="cover"
                      />
                    ) : (
                      <video src={item.preview} className="w-full h-full object-cover" controls={false} muted />
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 right-1 rounded-full bg-background/80 hover:bg-background h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation() // Prevent selecting the file when removing
                        handleRemoveFile(item.id)
                      }}
                    >
                      <X className="h-3 w-3 text-red-400" />
                    </Button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 flex items-center justify-center">
                      {item.file.type.startsWith("image/") ? (
                        <ImageIcon className="h-3 w-3 mr-1" />
                      ) : (
                        <Video className="h-3 w-3 mr-1" />
                      )}
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>

              {/* Caption and Location Inputs for the currently selected file */}
              {currentFile && (
                <Card className="bg-gray-700/50 border-gray-600 p-4 space-y-3">
                  <h4 className="text-md font-semibold text-white">Details for File {currentFileIndex! + 1}</h4>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="caption" className="text-gray-300">
                      Caption (Optional)
                    </Label>
                    <Textarea
                      id="caption"
                      placeholder="Add a caption for your photo..."
                      value={currentFile.caption}
                      onChange={(e) => handleCaptionChange(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                  <div className="grid w-full items-center gap-1.5">
                    <Label htmlFor="location" className="text-gray-300">
                      Location (Optional)
                    </Label>
                    <Input
                      id="location"
                      placeholder="e.g., Eiffel Tower, Paris"
                      value={currentFile.location}
                      onChange={(e) => handleLocationChange(e.target.value)}
                      className="bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 text-sm"
                    />
                  </div>
                </Card>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white"
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Upload Selected Files"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
