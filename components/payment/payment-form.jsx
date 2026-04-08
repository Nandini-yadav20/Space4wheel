"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, CreditCard, Calendar, Lock } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function PaymentForm({ amount, onSubmit, onCancel, processing = false }) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [errors, setErrors] = useState({})

  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)
  }, [])

  const formatCardNumber = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ""
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    return parts.length ? parts.join(" ") : value
  }

  const formatExpiryDate = (value) => {
    const v = value.replace(/\s+/g, "").replace(/[^0-9]/gi, "")
    return v.length >= 2 ? `${v.substring(0, 2)}/${v.substring(2, 4)}` : v
  }

  const validateForm = () => {
    const newErrors = {}

    if (!cardNumber.trim()) {
      newErrors.cardNumber = "Card number is required"
    } else if (cardNumber.replace(/\s+/g, "").length !== 16) {
      newErrors.cardNumber = "Card number must be 16 digits"
    }

    if (!cardName.trim()) {
      newErrors.cardName = "Cardholder name is required"
    }

    if (!expiryDate.trim()) {
      newErrors.expiryDate = "Expiry date is required"
    } else if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
      newErrors.expiryDate = "Expiry date must be in MM/YY format"
    }

    if (!cvv.trim()) {
      newErrors.cvv = "CVV is required"
    } else if (!/^\d{3,4}$/.test(cvv)) {
      newErrors.cvv = "CVV must be 3 or 4 digits"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleCardPayment = (e) => {
    e.preventDefault()
    if (!validateForm()) return

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: "INR",
      name: "Vehicle Parking App",
      description: "Slot Booking Payment",
      handler: function (response) {
        onSubmit({
          razorpay_payment_id: response.razorpay_payment_id,
          method: "card",
          cardName,
          cardNumber: cardNumber.replace(/\s+/g, ""),
          expiryDate,
          cvv,
        })
      },
      prefill: {
        name: cardName,
        email: "test@example.com",
        contact: "9999999999",
      },
      method: {
        upi: true,
        card: true,
        netbanking: true,
      },
      theme: {
        color: "#0f172a",
      },
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  const handleUPIPayment = () => {
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: "INR",
      name: "Vehicle Parking App",
      description: "Slot Booking - UPI Payment",
      handler: function (response) {
        onSubmit({
          razorpay_payment_id: response.razorpay_payment_id,
          method: "upi"
        })
      },
      method: {
        upi: true,
      },
      prefill: {
        name: "UPI Customer",
        email: "test@example.com",
        contact: "9999999999"
      },
      theme: {
        color: "#0f172a"
      }
    }

    const rzp = new window.Razorpay(options)
    rzp.open()
  }

  return (
    <div className="space-y-6">
      {/* UPI Payment Block */}
      <div className="text-center border rounded-lg p-4 shadow-sm">
        <p className="font-semibold mb-2">Prefer UPI?</p>
         <div className="flex justify-center gap-4 items-center mb-3">
    <img src="https://cdn.razorpay.com/app/gpay.svg" alt="GPay" className="h-8 w-8" />
    <img src="https://cdn.razorpay.com/app/phonepe.svg" alt="PhonePe" className="h-8 w-8" />
    <img src="https://cdn.razorpay.com/app/paytm.svg" alt="Paytm" className="h-8 w-8" />
    <img src="https://cdn.razorpay.com/app/bhim.svg" alt="BHIM" className="h-8 w-8" />
  </div>
        <Button
          type="button"
          className="w-full bg-green-600 hover:bg-green-700"
          onClick={handleUPIPayment}
        >
          Pay with UPI (GPay / PhonePe / BHIM)
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          Scan QR or select your UPI app after clicking the button.
        </p>
      </div>

      {/* Divider */}
      <div className="relative text-center">
        <div className="my-4 text-sm text-muted-foreground">OR</div>
      </div>

      {/* Card Payment Form */}
      <form onSubmit={handleCardPayment} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cardNumber">Card Number</Label>
          <div className="relative">
            <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="cardNumber"
              placeholder="1234 5678 9012 3456"
              value={cardNumber}
              onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
              className="pl-10"
              maxLength={19}
            />
          </div>
          {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="cardName">Cardholder Name</Label>
          <Input id="cardName" placeholder="John Doe" value={cardName} onChange={(e) => setCardName(e.target.value)} />
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
                onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
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
                onChange={(e) => setCvv(e.target.value.replace(/[^0-9]/g, ""))}
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
                <p className="text-xs text-muted-foreground text-center mt-2">Additional payment methods coming soon</p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <div className="pt-2 flex flex-col space-y-2">
          <Button type="submit" className="w-full" disabled={processing}>
            {processing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ₹${amount.toFixed(2)}`
            )}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            Cancel
          </Button>
        </div>

        <div className="text-xs text-center text-muted-foreground">
          <p>Payment is powered by Razorpay. Use test card details if enabled in test mode.</p>
        </div>
      </form>
    </div>
  )
}