"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  CreditCard,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldCheck,
  TimerReset,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PaymentForm } from "@/components/payment/payment-form"
import { clearCheckoutSession, readCheckoutSession, saveCheckoutSession } from "@/lib/checkout-session"

export default function PaymentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [bookingDetails, setBookingDetails] = useState(null)
  const [processingBooking, setProcessingBooking] = useState(false)
  const [bookingError, setBookingError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [holdRemaining, setHoldRemaining] = useState(null)

  useEffect(() => {
    const session = readCheckoutSession()
    if (!session) {
      router.replace("/dashboard/find")
      return
    }

    const requestedPlotId = searchParams.get("plotId")
    const requestedSlot = searchParams.get("slot")
    if (
      (requestedPlotId && session.plotId !== requestedPlotId) ||
      (requestedSlot && session.slotKey !== requestedSlot)
    ) {
      router.replace("/dashboard/find")
      return
    }

    if (session.holdExpiresAt && session.holdExpiresAt <= Date.now()) {
      clearCheckoutSession()
      router.replace(`/dashboard/plots/${session.plotId}`)
      return
    }

    setBookingDetails(session)
    setBookingSuccess(session.status === "completed")
  }, [router, searchParams])

  useEffect(() => {
    if (!bookingDetails || bookingSuccess) return

    if (!bookingDetails.holdExpiresAt) {
      setHoldRemaining(0)
      return
    }

    const tick = () => {
      const remaining = Math.max(0, bookingDetails.holdExpiresAt - Date.now())
      setHoldRemaining(remaining)
    }

    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [bookingDetails, bookingSuccess])

  useEffect(() => {
    if (!bookingDetails?.plotId || bookingSuccess || holdRemaining === null || holdRemaining > 0) return
    clearCheckoutSession()
    router.replace(`/dashboard/plots/${bookingDetails.plotId}`)
  }, [bookingDetails, bookingSuccess, holdRemaining, router])

  const formatted = useMemo(() => {
    if (!bookingDetails) return null

    const start = new Date(bookingDetails.startTime)
    const end = new Date(bookingDetails.endTime)

    return {
      start,
      end,
      date: format(start, "MMM d, yyyy"),
      time: `${format(start, "h:mm a")} - ${format(end, "h:mm a")}`,
    }
  }, [bookingDetails])

  const handleCancel = async () => {
    if (bookingDetails?.plotId && bookingDetails?.slotKey) {
      await fetch("/api/slots/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "release",
          plotId: bookingDetails.plotId,
          slotId: bookingDetails.slotKey,
        }),
      }).catch(() => {})
    }

    clearCheckoutSession()
    router.push(`/dashboard/plots/${bookingDetails?.plotId || ""}`)
  }

  const handlePaymentSubmit = async (paymentDetails) => {
    if (!bookingDetails) return

    try {
      setProcessingBooking(true)
      setBookingError(null)

      const bookingRes = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingDetails),
      })
      const bookingPayload = await bookingRes.json()
      if (!bookingRes.ok || !bookingPayload?.success) {
        throw new Error(bookingPayload?.error || "Failed to create booking")
      }

      const bookingId = bookingPayload.data.id

      const slotRes = await fetch("/api/slots/operate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "confirm",
          plotId: bookingDetails.plotId,
          slotId: bookingDetails.slotKey,
          bookingId,
        }),
      })
      const slotPayload = await slotRes.json()
      if (!slotRes.ok || !slotPayload?.success) {
        throw new Error(slotPayload?.error || "Could not confirm selected slot")
      }

      const payRes = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amount: bookingDetails.totalPrice,
          ...paymentDetails,
        }),
      })
      const payPayload = await payRes.json()
      if (!payRes.ok || !payPayload?.success) {
        throw new Error(payPayload?.error || "Payment processing failed")
      }

      const completedSession = {
        ...bookingDetails,
        bookingId,
        status: "completed",
      }

      saveCheckoutSession(completedSession)
      setBookingDetails(completedSession)
      setBookingSuccess(true)
    } catch (error) {
      setBookingError(error.message || "Payment failed")
    } finally {
      setProcessingBooking(false)
    }
  }

  if (!bookingDetails || !formatted) {
    return (
      <div className="container mx-auto flex min-h-[50vh] items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const holdMs = holdRemaining ?? 0
  const minutes = Math.floor(holdMs / 60000)
  const seconds = Math.floor((holdMs % 60000) / 1000)

  return (
    <div className="container mx-auto max-w-5xl py-8">
      {bookingError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>{bookingError}</AlertDescription>
        </Alert>
      )}

      {bookingSuccess && (
        <Alert className="mb-4 border-green-200 bg-green-50 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Booking Confirmed</AlertTitle>
          <AlertDescription>Your parking slot is booked successfully.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="border-b bg-primary/5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Secure checkout</CardTitle>
                <CardDescription>Review your booking and complete payment before the slot hold expires.</CardDescription>
              </div>
              {!bookingSuccess && (
                <div className="rounded-full border bg-background px-3 py-1 text-sm font-medium">
                  {minutes}:{String(seconds).padStart(2, "0")} left
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {!bookingSuccess ? (
              <PaymentForm
                amount={bookingDetails.totalPrice}
                onSubmit={handlePaymentSubmit}
                onCancel={handleCancel}
                processing={processingBooking}
              />
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={() => {
                    clearCheckoutSession()
                    router.push("/dashboard/bookings")
                  }}
                >
                  View My Bookings
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    clearCheckoutSession()
                    router.push("/dashboard/find")
                  }}
                >
                  Find Another Spot
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking summary</CardTitle>
              <CardDescription>Live order details for the slot you selected.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="rounded-xl border bg-muted/30 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{bookingDetails.plotName}</p>
                    <p className="mt-1 flex items-center gap-1 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {bookingDetails.plotAddress}
                    </p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    Slot #{bookingDetails.slotNumber}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span className="font-medium">{formatted.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium">{formatted.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-medium">
                    {bookingDetails.duration} hour{bookingDetails.duration > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot type</span>
                  <span className="font-medium capitalize">{bookingDetails.slotType}</span>
                </div>
                {bookingDetails.vehicle && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicle</span>
                    <span className="text-right font-medium">
                      {bookingDetails.vehicle.nickname || `${bookingDetails.vehicle.brand} ${bookingDetails.vehicle.model}`}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 rounded-xl border p-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate</span>
                  <span className="font-medium">Rs {Number(bookingDetails.pricePerHour || 0).toFixed(2)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">Rs {Number(bookingDetails.totalPrice || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-3 text-base font-semibold">
                  <span>Total payable</span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="h-4 w-4" />
                    {Number(bookingDetails.totalPrice || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-4 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                Secure checkout protections
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                Your selected slot remains reserved while this checkout stays active.
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <CreditCard className="h-4 w-4" />
                Payment details are completed through Razorpay checkout.
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <TimerReset className="h-4 w-4" />
                If the hold expires, we route you back to the plot page to reselect a slot.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
