"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { MapComponent } from "@/components/map-component"
import { useDatabase } from "@/lib/hooks/use-database"
import {
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle,
  XCircle,
  Loader2,
  Star,
} from "lucide-react"

export default function BookingDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const {
    getBookingById,
    cancelBooking,
    getPlotById,
    addReview,
    loading,
    error,
  } = useDatabase()

  const [booking, setBooking] = useState(null)
  const [plot, setPlot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCancelling, setIsCancelling] = useState(false)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState("")
  const [isSubmittingReview, setIsSubmittingReview] = useState(false)

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!params.id) return
      setIsLoading(true)
      try {
        const dummyBooking = {
          id: params.id,
          userId: "user123",
          plotId: "plot1",
          plotName: "Downtown Parking",
          plotAddress: "123 Main St, Downtown",
          date: "2023-05-15",
          startTime: "10:00 AM",
          endTime: "12:00 PM",
          duration: 2,
          price: 10,
          status: "confirmed",
          paymentStatus: "paid",
          paymentMethod: "Credit Card",
          paymentId: "pay_123456",
          createdAt: "2023-05-01T00:00:00.000Z",
        }

        const dummyPlot = {
          id: "plot1",
          name: "Downtown Parking",
          address: "123 Main St, Downtown",
          description: "Conveniently located parking in the heart of downtown.",
          price: 5,
          availableSlots: 8,
          totalSlots: 15,
          lat: 40.7128,
          lng: -74.006,
          ownerId: "owner123",
          ownerName: "John Owner",
        }

        setBooking(dummyBooking)
        setPlot(dummyPlot)
      } catch (err) {
        console.error("Error fetching booking details:", err)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load booking details.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBookingDetails()
  }, [params.id, toast])

  const handleCancelBooking = async () => {
    if (!booking) return

    if (!confirm("Are you sure you want to cancel this booking?")) return

    setIsCancelling(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Booking Cancelled",
        description: "Your booking has been cancelled.",
      })

      setBooking((prev) => ({
        ...prev,
        status: "cancelled",
      }))
    } catch (err) {
      console.error("Error cancelling booking:", err)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to cancel booking.",
      })
    } finally {
      setIsCancelling(false)
    }
  }

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (!rating) return

    setIsSubmittingReview(true)

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000))
      toast({
        title: "Review Submitted",
        description: "Thanks for your feedback!",
      })
      setRating(0)
      setComment("")
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Could not submit review.",
      })
    } finally {
      setIsSubmittingReview(false)
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case "confirmed":
        return "default"
      case "completed":
        return "success"
      case "cancelled":
        return "destructive"
      default:
        return "secondary"
    }
  }

  const getPaymentStatusBadgeVariant = (status) => {
    switch (status) {
      case "paid":
        return "success"
      case "refunded":
        return "warning"
      default:
        return "secondary"
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!booking) {
    return (
      <Card>
        <CardContent className="text-center">
          <p className="text-red-500">Booking not found.</p>
          <Button onClick={() => router.push("/dashboard/bookings")} className="mt-4">
            Back to Bookings
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isPastBooking = new Date(`${booking.date} ${booking.endTime}`) < new Date()
  const canCancel = booking.status === "confirmed" && !isPastBooking
  const canReview = booking.status === "completed" || (isPastBooking && booking.status === "confirmed")

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Booking Details</CardTitle>
          <CardDescription>Here are the details for your parking booking.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">Plot Information</h3>
              <p><MapPin className="inline mr-2" /> {booking.plotAddress}</p>
              <p className="text-sm text-muted-foreground mb-2">{plot?.description}</p>
              <Badge>{plot?.ownerName}</Badge>
              <Separator className="my-4" />
              <h3 className="text-lg font-semibold mb-2">Booking Info</h3>
              <p><Calendar className="inline mr-2" /> Date: {booking.date}</p>
              <p><Clock className="inline mr-2" /> Time: {booking.startTime} - {booking.endTime}</p>
              <p>Duration: {booking.duration} hrs</p>
              <p>Price: ₹{booking.price}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusBadgeVariant(booking.status)}>{booking.status}</Badge>
                <Badge variant={getPaymentStatusBadgeVariant(booking.paymentStatus)}>
                  {booking.paymentStatus}
                </Badge>
              </div>
            </div>
            <div>
              <MapComponent lat={plot?.lat} lng={plot?.lng} />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex flex-col gap-2">
            {canCancel && (
              <Button
                variant="destructive"
                onClick={handleCancelBooking}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            )}
            <Button onClick={() => router.push("/dashboard/bookings")}>Back</Button>
          </div>
        </CardFooter>
      </Card>

      {canReview && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Leave a Review</CardTitle>
            <CardDescription>Tell us how your experience was.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div>
                <label className="block mb-1 font-medium">Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-6 w-6 cursor-pointer ${
                        rating >= star ? "text-yellow-400" : "text-gray-300"
                      }`}
                      onClick={() => setRating(star)}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="block mb-1 font-medium">Comment</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows="3"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience..."
                ></textarea>
              </div>
              <Button type="submit" disabled={isSubmittingReview}>
                {isSubmittingReview ? "Submitting..." : "Submit Review"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
