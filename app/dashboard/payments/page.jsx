"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { AlertCircle, CheckCircle2, IndianRupee, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { PaymentForm } from "@/components/payment/payment-form"

export default function PaymentsPage() {
  const router = useRouter()
  const [bookingDetails, setBookingDetails] = useState(null)
  const [processingBooking, setProcessingBooking] = useState(false)
  const [bookingError, setBookingError] = useState(null)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("pendingSlotBooking")
      if (!raw) {
        router.replace("/dashboard/find")
        return
      }
      const parsed = JSON.parse(raw)
      setBookingDetails(parsed)
    } catch (_) {
      router.replace("/dashboard/find")
    }
  }, [router])

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
    sessionStorage.removeItem("pendingSlotBooking")
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

      setBookingSuccess(true)
      sessionStorage.removeItem("pendingSlotBooking")
    } catch (err) {
      setBookingError(err.message || "Payment failed")
    } finally {
      setProcessingBooking(false)
    }
  }

  if (!bookingDetails || !formatted) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      {bookingError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Failed</AlertTitle>
          <AlertDescription>{bookingError}</AlertDescription>
        </Alert>
      )}

      {bookingSuccess && (
        <Alert className="mb-4 bg-green-50 border-green-200 dark:bg-green-900/20">
          <CheckCircle2 className="h-4 w-4 text-green-500" />
          <AlertTitle>Booking Confirmed</AlertTitle>
          <AlertDescription>Your parking slot is booked successfully.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle>Payment</CardTitle>
          <CardDescription>Complete your booking</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
            <div className="flex justify-between"><span>Location</span><span className="font-medium">{bookingDetails.plotName}</span></div>
            <div className="flex justify-between"><span>Date</span><span className="font-medium">{formatted.date}</span></div>
            <div className="flex justify-between"><span>Time</span><span className="font-medium">{formatted.time}</span></div>
            <div className="flex justify-between"><span>Slot</span><span className="font-medium">#{bookingDetails.slotNumber} ({bookingDetails.slotType})</span></div>
            <div className="flex justify-between font-bold border-t pt-2 mt-1">
              <span>Total</span>
              <span className="flex items-center gap-0.5"><IndianRupee className="h-3.5 w-3.5" />{Number(bookingDetails.totalPrice || 0).toFixed(2)}</span>
            </div>
          </div>

          {!bookingSuccess ? (
            <PaymentForm
              amount={bookingDetails.totalPrice}
              onSubmit={handlePaymentSubmit}
              onCancel={handleCancel}
              processing={processingBooking}
            />
          ) : (
            <div className="space-y-2">
              <Button className="w-full" onClick={() => router.push("/dashboard/bookings")}>View My Bookings</Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/find")}>Find Another Spot</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
