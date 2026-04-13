"use client"

/**
 * app/dashboard/plots/[id]/page.jsx  — updated version
 *
 * Changes vs original:
 *  - Replaces the old "Book This Spot" card with <SlotSelectionPanel>
 *  - Integrates real-time slot hold/confirm into payment flow
 *  - All other sections (map, reviews, images) unchanged
 */

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapComponent } from "@/components/map-component"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  Clock,
  MapPin,
  Star,
  DollarSign,
  Car,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  CreditCard,
  IndianRupee,
} from "lucide-react"
import { format } from "date-fns"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PaymentForm } from "@/components/payment/payment-form"
import { VehicleSelector } from "@/components/vehicles/vehicle-selector"

// ── NEW: slot selection ──────────────────────────────────────────────────────
import { SlotSelectionPanel } from "@/components/slots/SlotSelectionPanel"

// ── Image gallery (unchanged) ─────────────────────────────────────────────────
function ImageGallery({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState({})

  const processedImages =
    images?.map((img) => (typeof img === "object" ? img.url : img)) || []

  if (!processedImages || processedImages.length === 0) {
    return (
      <div className="h-[300px] w-full bg-muted flex items-center justify-center rounded-t-md">
        <Car className="h-16 w-16 text-muted-foreground opacity-30" />
      </div>
    )
  }

  const nextImage = () =>
    setCurrentIndex((prev) => (prev + 1) % processedImages.length)
  const prevImage = () =>
    setCurrentIndex(
      (prev) => (prev - 1 + processedImages.length) % processedImages.length
    )

  return (
    <div className="relative h-[300px] w-full">
      {imageError[processedImages[currentIndex]] ? (
        <div className="h-full w-full bg-muted flex items-center justify-center rounded-t-md">
          <Car className="h-16 w-16 text-muted-foreground opacity-30 mx-auto" />
        </div>
      ) : (
        <img
          src={processedImages[currentIndex] || "/placeholder.svg"}
          alt={`Parking spot image ${currentIndex + 1}`}
          className="h-full w-full object-cover rounded-t-md"
          onError={() =>
            setImageError((prev) => ({
              ...prev,
              [processedImages[currentIndex]]: true,
            }))
          }
        />
      )}

      {processedImages.length > 1 && (
        <>
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white p-1 rounded-full"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {processedImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full ${
                  index === currentIndex ? "bg-white" : "bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── Time slots & duration helpers ─────────────────────────────────────────────
const generateTimeSlots = () => {
  const slots = []
  for (let hour = 6; hour <= 22; hour++) {
    const h = hour % 12 === 0 ? 12 : hour % 12
    const p = hour < 12 ? "AM" : "PM"
    slots.push(`${h}:00 ${p}`)
    slots.push(`${h}:30 ${p}`)
  }
  return slots
}
const timeSlots = generateTimeSlots()
const durationOptions = Array.from({ length: 8 }, (_, i) => i + 1)

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PlotDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [plot, setPlot] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  // booking form state
  const [bookingDate, setBookingDate] = useState(new Date())
  const [startTime, setStartTime] = useState(timeSlots[8])
  const [duration, setDuration] = useState(2)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [bookingStep, setBookingStep] = useState(1)
  const [bookingDetails, setBookingDetails] = useState(null)
  const [processingBooking, setProcessingBooking] = useState(false)
  const [bookingError, setBookingError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  // slot selection state (from SlotSelectionPanel callback)
  const [slotProceedData, setSlotProceedData] = useState(null)

  // ── fetch plot + reviews ────────────────────────────────────────────────────
  useEffect(() => {
    const fetchPlotData = async () => {
      try {
        setLoading(true)
        if (!params.id) throw new Error("Plot ID is missing")

        const plotRes = await fetch(`/api/plots/${params.id}`)
        if (!plotRes.ok) throw new Error("Failed to fetch plot details")
        const plotData = await plotRes.json()
        if (!plotData.success || !plotData.data) throw new Error("Invalid plot data")
        setPlot(plotData.data)

        try {
          const reviewRes = await fetch(`/api/reviews?plotId=${params.id}`)
          if (reviewRes.ok) {
            const reviewData = await reviewRes.json()
            setReviews(reviewData.data || [])
          }
        } catch (_) {
          setReviews([])
        }
      } catch (err) {
        toast({ title: "Error", description: err.message, variant: "destructive" })
      } finally {
        setLoading(false)
      }
    }
    fetchPlotData()
  }, [params.id, toast])

  // ── SlotSelectionPanel → proceed to payment ─────────────────────────────────
  const handleSlotProceed = ({ slotKey, slot, totalPrice, pricePerHour, confirmBooking }) => {
    if (!user) {
      router.push("/auth/login")
      return
    }
    if (!selectedVehicle) {
      toast({
        title: "Vehicle Required",
        description: "Please select a vehicle before proceeding.",
        variant: "destructive",
      })
      return
    }

    // Build booking details (same shape as original)
    const [time, period] = startTime.split(" ")
    const [hour, minute] = time.split(":")
    let startHour = parseInt(hour)
    if (period === "PM" && startHour !== 12) startHour += 12
    else if (period === "AM" && startHour === 12) startHour = 0

    const startDate = new Date(bookingDate)
    startDate.setHours(startHour, parseInt(minute), 0, 0)
    const endDate = new Date(startDate)
    endDate.setHours(startDate.getHours() + duration)

    const pendingBooking = {
      plotId: plot.id,
      plotName: plot.name,
      plotAddress: plot.address,
      startTime: startDate,
      endTime: endDate,
      duration,
      pricePerHour,
      totalPrice,
      userId: user.uid,
      userName: user.displayName || user.email,
      slotKey,
      slotNumber: slot.slotNumber,
      slotType: slot.type,
      vehicle: selectedVehicle
        ? {
            id: selectedVehicle.id,
            nickname: selectedVehicle.nickname,
            type: selectedVehicle.type,
            brand: selectedVehicle.brand,
            model: selectedVehicle.model,
            registrationNumber: selectedVehicle.registrationNumber,
            color: selectedVehicle.color,
            fuelType: selectedVehicle.fuelType,
          }
        : null,
    }

    setSlotProceedData({ slotKey, slot, confirmBooking })
    setBookingDetails(pendingBooking)

    // Redirect to dedicated payments page after slot selection.
    if (typeof window !== "undefined") {
      sessionStorage.setItem("pendingSlotBooking", JSON.stringify(pendingBooking))
    }
    router.push("/dashboard/payments")
  }

  // ── Payment submit ──────────────────────────────────────────────────────────
  const handlePaymentSubmit = async (paymentDetails) => {
    try {
      setProcessingBooking(true)
      setBookingError(null)

      // 1. Create booking record
      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingDetails),
      })
      if (!bookingRes.ok) {
        const e = await bookingRes.json()
        throw new Error(e.error || "Failed to create booking")
      }
      const bookingResult = await bookingRes.json()
      const bookingId = bookingResult.data.id

      // 2. Confirm the RTDB slot as booked
      if (slotProceedData?.confirmBooking) {
        const slotRes = await slotProceedData.confirmBooking(
          slotProceedData.slotKey,
          bookingId
        )
        if (!slotRes.success) {
          throw new Error(slotRes.error || "Could not confirm selected slot. Please try again.")
        }
      }

      // 3. Process payment
      const payRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: bookingDetails.totalPrice,
          ...paymentDetails,
        }),
      })
      if (!payRes.ok) {
        const e = await payRes.json()
        throw new Error(e.error || "Payment processing failed")
      }

      setBookingSuccess(true)
      setBookingStep(3)
      toast({ title: "Booking Successful 🎉", description: "Your slot is confirmed!" })
    } catch (err) {
      setBookingError(err.message)
    } finally {
      setProcessingBooking(false)
    }
  }

  // ── Cancel / back ───────────────────────────────────────────────────────────
  const handleCancelBooking = () => {
    setBookingStep(1)
    setBookingDetails(null)
    setSlotProceedData(null)
    setBookingError(null)
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg font-medium">Loading parking details…</p>
        </div>
      </div>
    )
  }

  if (!plot) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Parking spot not found or has been removed.
          </AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/dashboard/find")}>
            Find Another Spot
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      {/* ── Title ── */}
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-2 hover:bg-transparent hover:text-primary"
          onClick={() => router.push("/dashboard/find")}
        >
          &larr; Back to Search
        </Button>
        <h1 className="text-3xl font-bold">{plot.name}</h1>
        <div className="flex items-center gap-2 mt-1 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{plot.address}</span>
        </div>
      </div>

      {bookingError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{bookingError}</AlertDescription>
        </Alert>
      )}
      {bookingSuccess && (
        <Alert className="mb-6 bg-green-50 border-green-200 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Booking Confirmed!</AlertTitle>
          <AlertDescription>
            Your parking slot has been booked successfully.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: images, map, details, reviews ── */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <ImageGallery images={plot.images || []} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Location Map</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[300px] w-full rounded-b-md overflow-hidden">
                <MapComponent plots={[plot]} selectedPlotId={plot.id} userLocation={null} />
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardHeader>
                  <CardTitle>Parking Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Price</h3>
                        <p className="text-lg font-semibold">₹{plot.price}/hour</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="bg-primary/10 p-2 rounded-full">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Capacity</h3>
                        <p className="text-lg font-semibold">
                          {plot.totalSlots} total slots
                        </p>
                      </div>
                    </div>
                  </div>
                  {plot.description && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">Description</h3>
                      <p className="text-muted-foreground">{plot.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle>Customer Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No reviews yet.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{review.userName}</p>
                              <div className="flex items-center gap-1 text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating ? "fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.createdAt
                                ? format(
                                    new Date(review.createdAt.seconds * 1000),
                                    "MMM d, yyyy"
                                  )
                                : "Recent"}
                            </span>
                          </div>
                          <p className="mt-2 text-muted-foreground">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* ── Right column: booking flow ── */}
        <div className="space-y-6">
          {/* ── Step 1: date/time + vehicle + SLOT PICKER ── */}
          {bookingStep === 1 && (
            <>
              <Card>
                <CardHeader className="bg-primary/5 border-b">
                  <CardTitle>Book This Spot</CardTitle>
                  <CardDescription>
                    Pick date, time & duration
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <CalendarComponent
                      mode="single"
                      selected={bookingDate}
                      onSelect={setBookingDate}
                      disabled={(d) => d < new Date()}
                      className="rounded-md border mx-auto"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Time</label>
                    <Select value={startTime} onValueChange={setStartTime}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (hours)</label>
                    <Select
                      value={duration.toString()}
                      onValueChange={(v) => setDuration(parseInt(v))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {durationOptions.map((h) => (
                          <SelectItem key={h} value={h.toString()}>
                            {h} hour{h > 1 ? "s" : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vehicle</label>
                    <VehicleSelector
                      onVehicleSelect={setSelectedVehicle}
                      selectedVehicleId={selectedVehicle?.id}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* ── REAL-TIME SLOT SELECTION ── */}
              <SlotSelectionPanel
                plot={plot}
                bookingDate={bookingDate}
                duration={duration}
                userId={user?.uid}
                onProceed={handleSlotProceed}
              />
            </>
          )}

          {/* ── Step 2: payment ── */}
          {bookingStep === 2 && bookingDetails && (
            <Card>
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle>Payment</CardTitle>
                <CardDescription>Complete your booking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
                  <p className="font-medium text-base mb-2">Booking Summary</p>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Location</span>
                    <span className="font-medium">{bookingDetails.plotName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {format(bookingDetails.startTime, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Time</span>
                    <span className="font-medium">
                      {format(bookingDetails.startTime, "h:mm a")} –{" "}
                      {format(bookingDetails.endTime, "h:mm a")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slot</span>
                    <span className="font-medium">
                      #{bookingDetails.slotNumber} ({bookingDetails.slotType})
                    </span>
                  </div>
                  {bookingDetails.vehicle && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vehicle</span>
                      <span className="font-medium">
                        {bookingDetails.vehicle.nickname ||
                          `${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model}`}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t pt-2 mt-1">
                    <span>Total</span>
                    <span className="flex items-center gap-0.5">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {bookingDetails.totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <PaymentForm
                  amount={bookingDetails.totalPrice}
                  onSubmit={handlePaymentSubmit}
                  onCancel={handleCancelBooking}
                  processing={processingBooking}
                />
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: success ── */}
          {bookingStep === 3 && bookingSuccess && (
            <Card>
              <CardHeader className="text-center bg-green-50 dark:bg-green-900/20">
                <div className="mx-auto bg-green-100 dark:bg-green-800/30 w-16 h-16 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Booking Confirmed!</CardTitle>
                <CardDescription>
                  Slot #{bookingDetails?.slotNumber} is yours
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Slot</span>
                    <span className="font-medium">
                      #{bookingDetails?.slotNumber} ({bookingDetails?.slotType})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span className="font-medium">
                      {bookingDetails?.startTime &&
                        format(bookingDetails.startTime, "MMM d, yyyy")}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2">
                    <span>Paid</span>
                    <span>₹{bookingDetails?.totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button
                  className="w-full"
                  onClick={() => router.push("/dashboard/bookings")}
                >
                  View All Bookings
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push("/dashboard/find")}
                >
                  Find Another Spot
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}