"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, Upload, X, MapPin, ImageIcon, Trash2 } from "lucide-react"

const CldWidget = ({ onUpload }) => {
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://upload-widget.cloudinary.com/latest/global/loader.js"
    script.async = true
    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const handleUploadClick = () => {
    if (window.cloudinary) {
      window.cloudinary.openUploadWidget(
        {
          cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
          multiple: true,
          resourceType: "image",
        },
        (error, result) => {
          if (!error && result && result.event === "success") {
            onUpload(result.info.secure_url)
          }
        }
      )
    }
  }

  return (
    <Button 
      type="button" 
      variant="outline" 
      onClick={handleUploadClick}
      className="w-full"
    >
      <Upload className="mr-2 h-4 w-4" />
      Upload Image via Cloudinary
    </Button>
  )
}

const formSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  address: z.string().min(5, { message: "Address must be at least 5 characters" }),
  description: z.string().min(10, { message: "Description must be at least 10 characters" }),
  price: z.coerce.number().positive({ message: "Price must be a positive number" }),
  totalSlots: z.coerce.number().int().positive({ message: "Total slots must be a positive integer" }),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
})

export default function ManagePlotPage() {
  const { user } = useAuth()
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  const plotId = params.id

  const [plot, setPlot] = useState(null)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      address: "",
      description: "",
      price: 0,
      totalSlots: 0,
      lat: 0,
      lng: 0,
    },
  })

  useEffect(() => {
    const fetchPlot = async () => {
      if (!plotId) return

      try {
        const res = await fetch(`/api/plots?plotId=${plotId}`)
        if (res.ok) {
          const data = await res.json()
          
          // Check if user is the owner
          if (data.ownerId !== user?.uid) {
            toast({
              title: "Unauthorized",
              description: "You don't have permission to edit this plot",
              variant: "destructive",
            })
            router.push("/dashboard/owner-dashboard")
            return
          }

          setPlot(data)
          setImages(data.images || [])
          
          form.reset({
            name: data.name,
            address: data.address,
            description: data.description,
            price: data.price,
            totalSlots: data.totalSlots,
            lat: data.lat || 0,
            lng: data.lng || 0,
          })
        }
      } catch (error) {
        console.error("Error fetching plot:", error)
        toast({
          title: "Error",
          description: "Failed to load plot details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (user && plotId) {
      fetchPlot()
    }
  }, [user, plotId, form, router, toast])

  const handleAddImage = (imageUrl) => {
    if (imageUrl && !images.includes(imageUrl)) {
      setImages([...images, imageUrl])
      toast({
        title: "Success",
        description: "Image added successfully",
      })
    }
  }

  const handleRemoveImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const onSubmit = async (values) => {
    try {
      setIsSaving(true)

      const updateData = {
        ...values,
        images: images,
        updatedAt: new Date().toISOString(),
      }

      const res = await fetch(`/api/plots/${plotId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!res.ok) {
        throw new Error("Failed to update plot")
      }

      toast({
        title: "Success",
        description: "Plot updated successfully",
      })

      router.push("/dashboard/owner-dashboard")
    } catch (error) {
      console.error("Error updating plot:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to update plot",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeletePlot = async () => {
    if (!confirm("Are you sure you want to delete this plot? This action cannot be undone.")) {
      return
    }

    try {
      setIsDeleting(true)

      const res = await fetch(`/api/plots/${plotId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        throw new Error("Failed to delete plot")
      }

      toast({
        title: "Success",
        description: "Plot deleted successfully",
      })

      router.push("/dashboard/owner-dashboard")
    } catch (error) {
      console.error("Error deleting plot:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to delete plot",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  if (!plot) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Plot not found</AlertTitle>
          <AlertDescription>
            The plot you're looking for doesn't exist or you don't have permission to edit it.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Manage Parking Plot</h1>
            <p className="text-muted-foreground mt-1">Update your plot details and pricing</p>
          </div>
          <Badge variant={plot.approvalStatus === "approved" ? "default" : "secondary"}>
            {plot.approvalStatus?.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Images Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Plot Images
              </CardTitle>
              <CardDescription>Add multiple images of your parking plot</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && (
                <CldWidget onUpload={handleAddImage} />
              )}

              {images.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((image, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={image}
                        alt={`Plot image ${index + 1}`}
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {images.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>No images yet</AlertTitle>
                  <AlertDescription>
                    Add at least one image to showcase your parking plot
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Plot Details Form */}
          <Card>
            <CardHeader>
              <CardTitle>Plot Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plot Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Downtown Parking Lot A" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Full address of the parking plot" {...field} />
                        </FormControl>
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
                            placeholder="Describe your parking plot (amenities, 24/7 security, covered/open, etc.)"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price per Hour (₹)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} />
                          </FormControl>
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
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lat"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Latitude</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.0001" {...field} />
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
                            <Input type="number" step="0.0001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={isSaving}
                      className="flex-1"
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                    <Button 
                      type="button"
                      variant="destructive"
                      onClick={handleDeletePlot}
                      disabled={isDeleting}
                    >
                      {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Plot
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
