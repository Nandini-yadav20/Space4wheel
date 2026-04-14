"use client"

import { useEffect, useState } from "react"
import { Calendar, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function PaymentForm({ amount, onSubmit, onCancel, processing = false }) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [errors, setErrors] = useState({})
  const [sdkReady, setSdkReady] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => setSdkReady(true)
    script.onerror = () => setCheckoutError("Razorpay checkout could not be loaded. Please refresh and try again.")

    document.body.appendChild(script)

    return () => {
      document.body.removeChild(script)
    }
  }, [])

  const formatCardNumber = (value) => {
    const sanitized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "")
    const match = sanitized.match(/\d{1,16}/)?.[0] || ""
    return match.replace(/(.{4})/g, "$1 ").trim()
  }

  const formatExpiryDate = (value) => {
    const sanitized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "")
    if (sanitized.length <= 2) return sanitized
    return `${sanitized.slice(0, 2)}/${sanitized.slice(2, 4)}`
  }

  const validateForm = () => {
    const nextErrors = {}

    if (!cardNumber.trim()) {
      nextErrors.cardNumber = "Card number is required"
    } else if (cardNumber.replace(/\s+/g, "").length !== 16) {
      nextErrors.cardNumber = "Card number must be 16 digits"
    }

    if (!cardName.trim()) {
      nextErrors.cardName = "Cardholder name is required"
    }

    if (!expiryDate.trim()) {
      nextErrors.expiryDate = "Expiry date is required"
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      nextErrors.expiryDate = "Expiry date must use MM/YY"
    }

    if (!cvv.trim()) {
      nextErrors.cvv = "CVV is required"
    } else if (!/^\d{3,4}$/.test(cvv)) {
      nextErrors.cvv = "CVV must be 3 or 4 digits"
    }

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const openCheckout = (options) => {
    if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
      setCheckoutError("Razorpay key is missing. Add NEXT_PUBLIC_RAZORPAY_KEY_ID to continue.")
      return
    }

    if (!sdkReady || !window.Razorpay) {
      setCheckoutError("Payment gateway is still loading. Please wait a moment and try again.")
      return
    }

    setCheckoutError("")
    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  const handleCardPayment = (event) => {
    event.preventDefault()
    if (!validateForm()) return

    openCheckout({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: "INR",
      name: "Space4Wheels",
      description: "Parking slot booking",
      handler(response) {
        onSubmit({
          razorpay_payment_id: response.razorpay_payment_id,
          method: "card",
          cardName,
          cardLast4: cardNumber.replace(/\s+/g, "").slice(-4),
        })
      },
      prefill: {
        name: cardName,
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
      },
      theme: {
        color: "#0f172a",
      },
    })
  }

  const handleUPIPayment = () => {
    openCheckout({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: "INR",
      name: "Space4Wheels",
      description: "Parking slot booking",
      handler(response) {
        onSubmit({
          razorpay_payment_id: response.razorpay_payment_id,
          method: "upi",
        })
      },
      method: {
        upi: true,
      },
      theme: {
        color: "#0f172a",
      },
    })
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-muted/30 p-3 text-sm">
        <div className="flex items-center gap-2 font-medium">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          Payment protected by Razorpay
        </div>
        <p className="mt-1 text-muted-foreground">
          Complete payment using UPI or card. Your booking will be finalized after a successful checkout response.
        </p>
      </div>

      {checkoutError && <p className="text-sm text-red-500">{checkoutError}</p>}

      <div className="rounded-lg border p-4 text-center shadow-sm">
        <p className="mb-2 font-semibold">Prefer UPI?</p>
        <div className="mb-3 flex items-center justify-center gap-4">
          <img src="https://cdn.razorpay.com/app/gpay.svg" alt="GPay" className="h-8 w-8" />
          <img src="https://cdn.razorpay.com/app/phonepe.svg" alt="PhonePe" className="h-8 w-8" />
          <img src="https://cdn.razorpay.com/app/paytm.svg" alt="Paytm" className="h-8 w-8" />
          <img src="https://cdn.razorpay.com/app/bhim.svg" alt="BHIM" className="h-8 w-8" />
        </div>
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleUPIPayment}
          disabled={processing || !sdkReady}
        >
          Pay with UPI
        </Button>
        <p className="mt-2 text-xs text-muted-foreground">
          Scan QR or choose your UPI app after clicking the button.
        </p>
      </div>

      <div className="text-center text-sm text-muted-foreground">OR</div>

      <form onSubmit={handleCardPayment} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(event) => setCardNumber(formatCardNumber(event.target.value))}
              className="pl-10"
              maxLength={19}
            />
          </div>
          {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardName">Cardholder Name</Label>
          <Input
            id="cardName"
            placeholder="John Doe"
            value={cardName}
            onChange={(event) => setCardName(event.target.value)}
          />
          {errors.cardName && <p className="text-sm text-red-500">{errors.cardName}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="expiryDate"
                placeholder="MM/YY"
                value={expiryDate}
                onChange={(event) => setExpiryDate(formatExpiryDate(event.target.value))}
                className="pl-10"
                maxLength={5}
              />
            </div>
            {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cvv"
                placeholder="123"
                value={cvv}
                onChange={(event) => setCvv(event.target.value.replace(/[^0-9]/g, ""))}
                className="pl-10"
                maxLength={4}
                type="password"
              />
            </div>
            {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
          </div>
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="payment-methods">
            <AccordionTrigger className="text-sm">Other Payment Methods</AccordionTrigger>
            <AccordionContent>
              <div className="space-y-2 pt-2">
                <Button variant="outline" className="w-full justify-start" type="button" disabled>
                  Pay with PayPal
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button" disabled>
                  Apple Pay
                </Button>
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Additional payment methods coming soon
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="flex flex-col space-y-2 pt-2">
          <Button type="submit" className="w-full" disabled={processing || !sdkReady}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay Rs ${amount.toFixed(2)}`
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          Payment is powered by Razorpay. Use test credentials if your project is in test mode.
        </div>
      </form>
    </div>
  )
}
