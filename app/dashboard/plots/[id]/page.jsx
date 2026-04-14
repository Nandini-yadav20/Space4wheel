"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { format } from "date-fns"
import {
  AlertCircle,
  Car,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  DollarSign,
  Loader2,
  MapPin,
  Star,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapComponent } from "@/components/map-component"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { VehicleSelector } from "@/components/vehicles/vehicle-selector"
import { SlotSelectionPanel } from "@/components/slots/SlotSelectionPanel"
import { saveCheckoutSession } from "@/lib/checkout-session"

function ImageGallery({ images }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageError, setImageError] = useState({})

  const processedImages = images?.map((img) => (typeof img === "object" ? img.url : img)) || []

  if (!processedImages.length) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-t-md bg-muted">
        <Car className="h-16 w-16 text-muted-foreground opacity-30" />
      </div>
    )
  }

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % processedImages.length)
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + processedImages.length) % processedImages.length)

  return (
    <div className="relative h-[300px] w-full">
      {imageError[processedImages[currentIndex]] ? (
        <div className="flex h-full w-full items-center justify-center rounded-t-md bg-muted">
          <Car className="h-16 w-16 text-muted-foreground opacity-30" />
        </div>
      ) : (
        <img
          src={processedImages[currentIndex] || "/placeholder.svg"}
          alt={`Parking spot image ${currentIndex + 1}`}
          className="h-full w-full rounded-t-md object-cover"
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
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
            {processedImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`h-2 w-2 rounded-full ${index === currentIndex ? "bg-white" : "bg-white/50"}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const generateTimeSlots = () => {
  const slots = []

  for (let hour = 6; hour <= 22; hour++) {
    const safeHour = hour % 12 === 0 ? 12 : hour % 12
    const period = hour < 12 ? "AM" : "PM"
    slots.push(`${safeHour}:00 ${period}`)
    slots.push(`${safeHour}:30 ${period}`)
  }

  return slots
}

const timeSlots = generateTimeSlots()
const durationOptions = Array.from({ length: 8 }, (_, index) => index + 1)

function parseStartDateFromSlot(bookingDate, startTime) {
  const [time, period] = startTime.split(" ")
  const [hour, minute] = time.split(":")

  let startHour = Number.parseInt(hour, 10)
  if (period === "PM" && startHour !== 12) startHour += 12
  if (period === "AM" && startHour === 12) startHour = 0

  const startDate = new Date(bookingDate)
  startDate.setHours(startHour, Number.parseInt(minute, 10), 0, 0)
  return startDate
}

function buildBookingWindow(bookingDate, startTime, duration) {
  const startDate = parseStartDateFromSlot(bookingDate, startTime)

  const endDate = new Date(startDate)
  endDate.setHours(startDate.getHours() + duration)

  return { startDate, endDate }
}

function getCheckoutBlockReason({ user, selectedVehicle, bookingDate, startTime, duration }) {
  if (!user) return "Login required to continue"
  if (!selectedVehicle) return "Select a vehicle to continue"
  if (!bookingDate || !startTime) return "Select date and start time"

  const { startDate, endDate } = buildBookingWindow(bookingDate, startTime, duration)
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Invalid booking time selected"
  }

  if (startDate.getTime() <= Date.now()) {
    return "Select a future start time"
  }

  return ""
}

export default function PlotDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const { user } = useAuth()

  const [plot, setPlot] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [bookingDate, setBookingDate] = useState(new Date())
  const [startTime, setStartTime] = useState(timeSlots[0])
  const [duration, setDuration] = useState(2)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [bookingError, setBookingError] = useState(null)

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
        } catch {
          setReviews([])
        }
      } catch (error) {
        toast({
          title: "Error",
          description: error.message || "Unable to load plot details",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPlotData()
  }, [params.id, toast])

  const availableTimeSlots = (() => {
    if (!bookingDate) return timeSlots

    const now = new Date()
    const isSameDay =
      now.getFullYear() === bookingDate.getFullYear() &&
      now.getMonth() === bookingDate.getMonth() &&
      now.getDate() === bookingDate.getDate()

    if (!isSameDay) return timeSlots

    return timeSlots.filter((slot) => parseStartDateFromSlot(bookingDate, slot).getTime() > Date.now() + 60 * 1000)
  })()

  useEffect(() => {
    if (!availableTimeSlots.length) {
      setBookingError("No valid start times remain for this date. Please select another date.")
      return
    }

    setBookingError(null)
    if (!availableTimeSlots.includes(startTime)) {
      setStartTime(availableTimeSlots[0])
    }
  }, [availableTimeSlots, startTime])

  const proceedBlockReason = getCheckoutBlockReason({
    user,
    selectedVehicle,
    bookingDate,
    startTime,
    duration,
  })
  const canProceedToCheckout = proceedBlockReason.length === 0

  const handleSlotProceed = ({ slotKey, slot, totalPrice, pricePerHour }) => {
    const blockReason = getCheckoutBlockReason({
      user,
      selectedVehicle,
      bookingDate,
      startTime,
      duration,
    })
    if (blockReason) {
      setBookingError(blockReason)
      toast({
        title: "Checkout blocked",
        description: blockReason,
        variant: "destructive",
      })
      return
    }

    if (!user) {
      router.push("/auth/login")
      return
    }

    if (!selectedVehicle) {
      toast({
        title: "Vehicle required",
        description: "Select a vehicle before continuing to checkout.",
        variant: "destructive",
      })
      return
    }

    if (!plot) return

    const { startDate, endDate } = buildBookingWindow(bookingDate, startTime, duration)
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      setBookingError("Invalid booking time. Please reselect date and time.")
      return
    }

    if (startDate.getTime() <= Date.now()) {
      setBookingError("Start time must be in the future. Please pick a later slot.")
      return
    }

    const holdExpiresAt = slot?.expiresAt || Date.now() + 10 * 60 * 1000
    if (holdExpiresAt <= Date.now()) {
      setBookingError("Selected slot hold has expired. Please select the slot again.")
      return
    }

    const checkoutSession = {
      plotId: plot.id,
      plotName: plot.name,
      plotAddress: plot.address,
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      duration,
      pricePerHour,
      totalPrice,
      userId: user.uid,
      userName: user.displayName || user.email,
      userEmail: user.email || "",
      slotKey,
      slotNumber: slot.slotNumber,
      slotType: slot.type,
      holdExpiresAt,
      status: "active",
      createdAt: Date.now(),
      vehicle: {
        id: selectedVehicle.id,
        nickname: selectedVehicle.nickname,
        type: selectedVehicle.type,
        brand: selectedVehicle.brand,
        model: selectedVehicle.model,
        registrationNumber: selectedVehicle.registrationNumber,
        color: selectedVehicle.color,
        fuelType: selectedVehicle.fuelType,
      },
    }

    setBookingError(null)
    saveCheckoutSession(checkoutSession)
    router.push(`/dashboard/payments?plotId=${plot.id}&slot=${slotKey}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center py-8">
        <div className="text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <p className="text-lg font-medium">Loading parking details...</p>
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
          <AlertDescription>Parking spot not found or has been removed.</AlertDescription>
        </Alert>
        <div className="mt-4 flex justify-center">
          <Button onClick={() => router.push("/dashboard/find")}>Find Another Spot</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6">
        <Button
          variant="ghost"
          className="mb-2 hover:bg-transparent hover:text-primary"
          onClick={() => router.push("/dashboard/find")}
        >
          &larr; Back to Search
        </Button>
        <h1 className="text-3xl font-bold">{plot.name}</h1>
        <div className="mt-1 flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{plot.address}</span>
        </div>
      </div>

      {bookingError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Checkout blocked</AlertTitle>
          <AlertDescription>{bookingError}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
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
              <div className="h-[300px] w-full overflow-hidden rounded-b-md">
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
                      <div className="rounded-full bg-primary/10 p-2">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Price</h3>
                        <p className="text-lg font-semibold">Rs {plot.price}/hour</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-medium">Capacity</h3>
                        <p className="text-lg font-semibold">{plot.totalSlots} total slots</p>
                      </div>
                    </div>
                  </div>

                  {plot.description && (
                    <div className="mt-4 rounded-lg bg-muted/30 p-4">
                      <h3 className="mb-2 font-medium">Description</h3>
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
                  {!reviews.length ? (
                    <div className="py-8 text-center text-muted-foreground">No reviews yet.</div>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <div key={review.id} className="border-b pb-4 last:border-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{review.userName}</p>
                              <div className="flex items-center gap-1 text-amber-500">
                                {Array.from({ length: 5 }).map((_, index) => (
                                  <Star
                                    key={index}
                                    className={`h-4 w-4 ${index < review.rating ? "fill-current" : "text-gray-300"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {review.createdAt
                                ? format(new Date(review.createdAt.seconds * 1000), "MMM d, yyyy")
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

        <div className="space-y-6">
          <Card className="border-primary/10 bg-primary/[0.03]">
            <CardContent className="flex items-start gap-3 p-4 text-sm">
              <CreditCard className="mt-0.5 h-4 w-4 text-primary" />
              <div className="space-y-1">
                <p className="font-medium">Modern checkout flow</p>
                <p className="text-muted-foreground">
                  Configure your booking, hold a slot in real time, then move to a dedicated payment page with a live summary.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b bg-primary/5">
              <CardTitle>Book This Spot</CardTitle>
              <CardDescription>Pick date, start time, duration, and vehicle before checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <CalendarComponent
                  mode="single"
                  selected={bookingDate}
                  onSelect={(value) => value && setBookingDate(value)}
                  disabled={(date) => date < new Date()}
                  className="mx-auto rounded-md border"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Start Time</label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableTimeSlots.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!availableTimeSlots.length && (
                  <p className="text-xs text-destructive">No future times available for the selected date.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <Select value={String(duration)} onValueChange={(value) => setDuration(Number.parseInt(value, 10))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {durationOptions.map((hours) => (
                      <SelectItem key={hours} value={String(hours)}>
                        {hours} hour{hours > 1 ? "s" : ""}
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

          <SlotSelectionPanel
            plot={plot}
            bookingDate={bookingDate}
            duration={duration}
            userId={user?.uid}
            onProceed={handleSlotProceed}
            canProceed={canProceedToCheckout}
            proceedBlockReason={proceedBlockReason}
          />
        </div>
      </div>
    </div>
  )
}
