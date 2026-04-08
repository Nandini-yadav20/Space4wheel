"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, X, AlertCircle, MapPin, FileText, ImageIcon } from "lucide-react"
import { useAuth } from "@/lib/firebase/auth-context"
import { useDatabase } from "@/lib/hooks/use-database"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { uploadMultipleFiles, formatFileSize, isImageFile, isDocumentFile } from "@/lib/firebase/storage-utils"

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  totalSlots: z.coerce.number().int().positive({ message: "Total slots must be a positive integer" }),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

export default function AddPlotPage() {
  const { user } = useAuth()
  const { createPlot } = useDatabase()
  const router = useRouter()
  const { toast } = useToast()
  const [images, setImages] = useState([])
  const [imageUrls, setImageUrls] = useState([])
  const [documents, setDocuments] = useState([])
  const [documentUrls, setDocumentUrls] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      price: 0,
      totalSlots: 0,
      lat: 0.0, // Default to NYC
      lng: 0.0,
    },
  })

  // Simulate upload progress
  useEffect(() => {
    if (isSubmitting && uploadProgress < 100) {
      const timer = setTimeout(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 100))
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [isSubmitting, uploadProgress])

  const handleImageChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) => isImageFile(file.name))
      setImages((prev) => [...prev, ...newFiles])

      // Create preview URLs for the images
      newFiles.forEach((file) => {
        const url = URL.createObjectURL(file)
        setImageUrls((prev) => [...prev, url])
      })
    }
  }

  const handleDocumentChange = (e) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files).filter((file) => isDocumentFile(file.name))
      setDocuments((prev) => [...prev, ...newFiles])

      // Store document info
      newFiles.forEach((file) => {
        setDocumentUrls((prev) => [
          ...prev,
          {
            name: file.name,
            size: formatFileSize(file.size),
            type: file.type,
          },
        ])
      })
    }
  }

  const removeImage = (index) => {
    setImages((prev) => prev.filter((_, i) => i !== index))
    setImageUrls((prev) => {
      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const removeDocument = (index) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index))
    setDocumentUrls((prev) => prev.filter((_, i) => i !== index))
  }

  const getCurrentLocation = () => {
    setIsLocating(true)

    if (!navigator.geolocation) {
      toast({
        variant: "destructive",
        title: "Geolocation Error",
        description: "Geolocation is not supported by your browser.",
      })
      setIsLocating(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("lat", position.coords.latitude)
        form.setValue("lng", position.coords.longitude)

        // Fetch address from coordinates using reverse geocoding
        fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${position.coords.latitude},${position.coords.longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        )
          .then((response) => response.json())
          .then((data) => {
            if (data.results && data.results[0]) {
              form.setValue("address", data.results[0].formatted_address)
            }
          })
          .catch((error) => {
            console.error("Error fetching address:", error)
          })
          .finally(() => {
            setIsLocating(false)
            toast({
              title: "Location Updated",
              description: "Your current location has been set.",
            })
          })
      },
      (error) => {
        setIsLocating(false)
        let errorMessage = "Unknown error occurred."

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied."
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable."
            break
          case error.TIMEOUT:
            errorMessage = "Location request timed out."
            break
        }

        toast({
          variant: "destructive",
          title: "Geolocation Error",
          description: errorMessage,
        })
      },
      { enableHighAccuracy: true },
    )
  }

  const onSubmit = async (values) => {
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication Error",
        description: "You must be logged in to add a parking plot.",
      })
      return
    }

    setIsSubmitting(true)
    setUploadProgress(10)

    try {
      // Upload images to Firebase Storage
      let uploadedImageFiles = []
      let uploadedDocumentFiles = []

      if (images.length > 0) {
        uploadedImageFiles = await uploadMultipleFiles(images, "plots/images", user.uid, (progress) => {
          setUploadProgress(10 + progress * 0.4) // 10-50% progress for images
        })
      }

      if (documents.length > 0) {
        uploadedDocumentFiles = await uploadMultipleFiles(documents, "plots/documents", user.uid, (progress) => {
          setUploadProgress(50 + progress * 0.4) // 50-90% progress for documents
        })
      }

      setUploadProgress(90)

      // Add plot data to Firestore via API
      const plotData = {
        name: values.name,
        address: values.address,
        description: values.description,
        price: values.price,
        totalSlots: values.totalSlots,
        lat: values.lat,
        lng: values.lng,
        ownerId: user.uid,
        ownerName: user.displayName || "Unknown",
        images: uploadedImageFiles,
        documents: uploadedDocumentFiles,
        features: [],
        reviews: [],
      }

      // Create plot in database via API
      const response = await fetch("/api/plots", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(plotData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to create plot")
      }

      setUploadProgress(100)

      toast({
        title: "Plot Submitted for Approval",
        description: "Your parking plot has been submitted and is pending approval by an administrator.",
      })

      router.push("/dashboard/plots")
    } catch (error) {
      console.error("Error adding plot:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was an error adding your parking plot. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Add Parking Plot</h1>

      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Approval Required</AlertTitle>
        <AlertDescription>
          New parking plots require admin approval before they become visible to users. You'll be notified once your
          plot is approved.
        </AlertDescription>
      </Alert>

      <div className="grid gap-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Plot Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Downtown Parking" {...field} />
                          </FormControl>
                          <FormDescription>Give your parking plot a descriptive name.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St, City, State, ZIP" {...field} />
                          </FormControl>
                          <FormDescription>Enter the full address of your parking plot.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your parking plot, including any special features or amenities."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Hour ($)</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" step="0.5" {...field} />
                          </FormControl>
                          <FormDescription>Set the hourly rate for parking.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="totalSlots"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Parking Slots</FormLabel>
                          <FormControl>
                            <Input type="number" min="1" step="1" {...field} />
                          </FormControl>
                          <FormDescription>Enter the total number of parking spaces available.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="lat"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Latitude</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.000001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="lng"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Longitude</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.000001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={getCurrentLocation}
                        disabled={isLocating}
                        className="flex items-center gap-2"
                      >
                        {isLocating ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Getting Location...
                          </>
                        ) : (
                          <>
                            <MapPin className="h-4 w-4" />
                            Use Current Location
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Upload Images</h3>
                  <div>
                    <label htmlFor="images" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">Drag and drop images here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF, up to 5MB each</p>
                      </div>
                      <Input
                        id="images"
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </label>

                    {imageUrls.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {imageUrls.map((url, index) => (
                          <div key={index} className="relative rounded-md overflow-hidden">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-24 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1"
                            >
                              <X className="h-4 w-4 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Upload Documents</h3>
                  <div>
                    <label htmlFor="documents" className="cursor-pointer">
                      <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                        <FileText className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Upload ownership documents, permits, or certificates
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOC, or DOCX, up to 10MB each</p>
                      </div>
                      <Input
                        id="documents"
                        type="file"
                        accept=".pdf,.doc,.docx"
                        multiple
                        className="hidden"
                        onChange={handleDocumentChange}
                      />
                    </label>

                    {documentUrls.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {documentUrls.map((doc, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-muted rounded-md">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4" />
                              <div>
                                <p className="text-sm font-medium truncate max-w-[200px]">{doc.name}</p>
                                <p className="text-xs text-muted-foreground">{doc.size}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeDocument(index)}
                              className="text-destructive hover:text-destructive/80"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {isSubmitting && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push("/dashboard/plots")}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting Plot...
                  </>
                ) : (
                  "Submit for Approval"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
