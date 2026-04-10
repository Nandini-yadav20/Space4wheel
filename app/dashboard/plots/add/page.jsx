"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useAuth } from "@/lib/firebase/auth-context"
import { addPlot } from "@/lib/firebase/plot-actions"
import { ImageUploadPreview } from "@/components/plot-management/ImageUploadPreview"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"


// Validation schema
const plotFormSchema = z.object({
  name: z
    .string()
    .min(3, { message: "Plot name must be at least 3 characters" })
    .max(100, { message: "Plot name must be less than 100 characters" }),
  address: z
    .string()
    .min(10, { message: "Address must be at least 10 characters" })
    .max(255, { message: "Address must be less than 255 characters" }),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)), {
      message: "Price must be a valid number",
    })
    .transform((val) => parseFloat(val))
    .refine((val) => val > 0, { message: "Price must be greater than 0" }),
  totalSlots: z
    .string()
    .refine((val) => !isNaN(parseInt(val)), {
      message: "Total slots must be a valid number",
    })
    .transform((val) => parseInt(val))
    .refine((val) => val > 0, { message: "Total slots must be at least 1" })
    .refine((val) => val <= 1000, {
      message: "Total slots cannot exceed 1000",
    }),
})

export default function AddPlotPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [images, setImages] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const form = useForm({
    resolver: zodResolver(plotFormSchema),
    defaultValues: {
      name: "",
      address: "",
      price: "",
      totalSlots: "",
    },
  })

  // Redirect if not authenticated or not owner
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please log in to add a plot
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (user.role !== "owner") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Only plot owners can add plots. Please contact us to become an owner.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  const onSubmit = async (data) => {
    try {
      setError(null)
      setIsSubmitting(true)

      // Validate at least one image
      if (images.length === 0) {
        setError("Please upload at least one image")
        setIsSubmitting(false)
        return
      }

      // Call Firestore to add plot
      const plotId = await addPlot({
        name: data.name,
        address: data.address,
        price: data.price,
        totalSlots: data.totalSlots,
        ownerId: user.uid,
        images: images,
      })

      toast({
        title: "Success!",
        description: "Your plot has been created and is pending approval.",
        duration: 5000,
      })

      // Navigate to plots list
      router.push("/dashboard/plots")
    } catch (err) {
      console.error("Error adding plot:", err)
      setError(err.message || "Failed to create plot. Please try again.")
      toast({
        title: "Error",
        description: err.message || "Failed to create plot",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/95">
      <div className="container max-w-2xl py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/plots"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plots
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Add a New Plot</h1>
          <p className="text-muted-foreground mt-2">
            Create a new parking plot and get it approved to start accepting bookings
          </p>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle>Plot Details</CardTitle>
            <CardDescription>
              Fill in the details for your parking plot
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Plot Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plot Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Downtown Parking Plaza"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        A unique name for your parking plot
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Address */}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter the complete address of your parking plot"
                          {...field}
                          disabled={isSubmitting}
                          rows={3}
                        />
                      </FormControl>
                      <FormDescription>
                        Full address including street, city, and postal code
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Price */}
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price per Hour (₹)</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">₹</span>
                          <Input
                            placeholder="50"
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>Hourly rate for parking</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Total Slots */}
                <FormField
                  control={form.control}
                  name="totalSlots"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Parking Slots</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10"
                          type="number"
                          min="1"
                          max="1000"
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormDescription>
                        Number of parking spots available
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Image Upload */}
                <FormItem>
                  <FormLabel>Plot Images</FormLabel>
                  <FormControl>
                    <ImageUploadPreview
                      images={images}
                      onChange={setImages}
                      multiple={true}
                      maxSize={10}
                    />
                  </FormControl>
                  <FormDescription>
                    Upload at least one image of your parking plot. High-quality
                    images help attract more bookings.
                  </FormDescription>
                  {images.length === 0 && (
                    <FormMessage>
                      Please upload at least one image
                    </FormMessage>
                  )}
                </FormItem>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating Plot...
                      </>
                    ) : (
                      "Create Plot"
                    )}
                  </Button>
                  <Link href="/dashboard/plots" className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isSubmitting}
                      className="w-full"
                      size="lg"
                    >
                      Cancel
                    </Button>
                  </Link>
                </div>
              </form>
            </Form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-300">
                <strong>Note:</strong> Your plot will be created in "pending" status
                and needs to be reviewed by our admin team before it can accept bookings.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
