// components/plot-management/ImageUploadPreview.jsx
"use client"

import { useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, X, Upload, AlertCircle, Image as ImageIcon } from "lucide-react"
import { uploadToCloudinary } from "@/lib/cloudinary"

/**
 * ImageUploadPreview - Handles single or multiple image uploads with preview
 *
 * @prop {Array<{url: string, name?: string}>} images - Current images list
 * @prop {Function} onChange - Callback when images change
 * @prop {boolean} multiple - Allow multiple images (default: true)
 * @prop {number} maxSize - Max file size in MB (default: 5)
 * @prop {string} accept - File type filter (default: image/*)
 */
export function ImageUploadPreview({
  images = [],
  onChange,
  multiple = true,
  maxSize = 5,
  accept = "image/*",
}) {
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [dragActive, setDragActive] = useState(false)

  const handleRemoveImage = useCallback(
    (index) => {
      const updated = images.filter((_, i) => i !== index)
      onChange(updated)
    },
    [images, onChange]
  )

  const processFile = async (file) => {
    // Validation
    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file")
      return
    }

    if (file.size > maxSize * 1024 * 1024) {
      setUploadError(`File size must be less than ${maxSize}MB`)
      return
    }

    try {
      setUploadError(null)
      setUploading(true)
      const url = await uploadToCloudinary(file)
      const newImages = [
        ...images,
        {
          url,
          name: file.name,
          uploadedAt: new Date().toISOString(),
        },
      ]
      onChange(newImages)
    } catch (error) {
      setUploadError(`Upload failed: ${error.message}`)
      console.error("Upload error:", error)
    } finally {
      setUploading(false)
    }
  }

  const handleFileInput = (e) => {
    const files = Array.from(e.target.files || [])
    // If not multiple, only take first file
    if (!multiple && files.length > 0) {
      processFile(files[0])
    } else if (multiple) {
      files.forEach((file) => processFile(file))
    }
    e.target.value = "" // Reset input
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    const files = Array.from(e.dataTransfer.files || [])
    if (!multiple && files.length > 0) {
      processFile(files[0])
    } else if (multiple) {
      files.forEach((file) => processFile(file))
    }
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative rounded-lg border-2 border-dashed transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInput}
          disabled={uploading}
          className="hidden"
          id="plot-image-input"
        />
        <label
          htmlFor="plot-image-input"
          className={`block p-8 text-center cursor-pointer ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <div className="flex flex-col items-center gap-2">
            <div className={`${ dragActive ? "text-primary" : "text-muted-foreground"}`}>
              {uploading ? (
                <Loader2 className="h-10 w-10 animate-spin mx-auto" />
              ) : (
                <Upload className="h-10 w-10 mx-auto" />
              )}
            </div>
            <div>
              <p className="font-medium">
                {uploading
                  ? "Uploading..."
                  : `Drag and drop ${
                      multiple ? "images" : "an image"
                    } here, or click to select`}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {multiple
                  ? `PNG, JPG, GIF up to ${maxSize}MB each`
                  : `PNG, JPG, GIF up to ${maxSize}MB`}
              </p>
            </div>
          </div>
        </label>
      </div>

      {/* Error Display */}
      {uploadError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{uploadError}</AlertDescription>
        </Alert>
      )}

      {/* Preview Grid */}
      {images.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-3">
            {images.length} image{images.length !== 1 ? "s" : ""} selected
          </p>
          <div className={`grid gap-3 ${multiple ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4" : "grid-cols-1"}`}>
            {images.map((image, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden bg-muted aspect-square"
              >
                {image.url ? (
                  <>
                    <img
                      src={image.url}
                      alt={`Preview ${idx + 1}`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = "none"
                      }}
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveImage(idx)}
                        disabled={uploading}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info Text */}
      {images.length === 0 && !uploadError && (
        <p className="text-xs text-muted-foreground">
          {multiple ? "You can upload multiple images" : "Upload one image"}
        </p>
      )}
    </div>
  )
}
