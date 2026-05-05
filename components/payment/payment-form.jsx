"use client"

import { useEffect, useState } from "react"
import { Calendar, CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export function PaymentForm({ amount, bookingId, userId, onSubmit, onCancel, processing = false }) {
  const [cardNumber, setCardNumber] = useState("")
  const [cardName, setCardName] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [cvv, setCvv] = useState("")
  const [errors, setErrors] = useState({})
  const [sdkReady, setSdkReady] = useState(false)
  const [checkoutError, setCheckoutError] = useState("")
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)

  useEffect(() => {
    // Check if script already exists
    if (window.Razorpay) {
      setSdkReady(true)
      return
    }

    // Check if script is already in DOM
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      setSdkReady(true)
      return
    }

    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.onload = () => {
      setSdkReady(true)
      console.log("Razorpay SDK loaded successfully")
    }
    script.onerror = () => {
      setCheckoutError("Failed to load Razorpay SDK")
      console.error("Failed to load Razorpay SDK")
    }

    document.body.appendChild(script)

    return () => {
      // Don't remove the script on unmount to avoid reloading
    }
  }, [])

  const formatCardNumber = (value) => {
    const sanitized = value.replace(/\s+/g, "").replace(/[^0-9]/g, "")
    return sanitized.match(/\d{1,16}/)?.[0]?.replace(/(.{4})/g, "$1 ").trim() || ""
  }

  const formatExpiryDate = (value) => {
    const sanitized = value.replace(/\D/g, "")
    if (sanitized.length <= 2) return sanitized
    return `${sanitized.slice(0, 2)}/${sanitized.slice(2, 4)}`
  }

  const validateForm = () => {
    const err = {}

    if (cardNumber.replace(/\s/g, "").length !== 16) err.cardNumber = "Invalid card number"
    if (!cardName.trim()) err.cardName = "Required"
    if (!/^\d{2}\/\d{2}$/.test(expiryDate)) err.expiryDate = "MM/YY required"
    if (!/^\d{3,4}$/.test(cvv)) err.cvv = "Invalid CVV"

    setErrors(err)
    return Object.keys(err).length === 0
  }

  const createOrder = async () => {
    try {
      setIsCreatingOrder(true)
      const res = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, bookingId, userId }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error)

      return data.data.orderId
    } catch (err) {
      setCheckoutError("Order creation failed")
      return null
    } finally {
      setIsCreatingOrder(false)
    }
  }

  const verifyPayment = async (orderId, paymentId, signature) => {
    const res = await fetch("/api/payments/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        bookingId,
        amount,
        userId,
      }),
    })

    const data = await res.json()
    return data.success
  }

  const openCheckout = (options) => {
    return new Promise((resolve, reject) => {
      // Wait for SDK to load
      const checkSDK = () => {
        if (window.Razorpay) {
          const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID
          if (!keyId) {
            setCheckoutError("Razorpay key not configured")
            reject("Razorpay key not configured")
            return
          }
          options.key = keyId
          try {
            new window.Razorpay(options).open()
            resolve()
          } catch (err) {
            setCheckoutError("Failed to open checkout")
            reject(err)
          }
        } else if (!sdkReady) {
          // Wait a bit and retry
          setTimeout(checkSDK, 500)
        } else {
          setCheckoutError("Razorpay SDK failed to load")
          reject("Razorpay SDK failed to load")
        }
      }
      checkSDK()
    })
  }

  const handleUPI = async () => {
    if (!sdkReady) {
      setCheckoutError("Razorpay SDK is loading... Please wait")
      return
    }

    const orderId = await createOrder()
    if (!orderId) return

    try {
      await openCheckout({
        order_id: orderId,
        amount: amount * 100,
        currency: "INR",
        name: "Space4Wheels",
        description: "Parking Booking",

        async handler(res) {
          const ok = await verifyPayment(orderId, res.razorpay_payment_id, res.razorpay_signature)
          if (ok) onSubmit({ ...res, method: "upi" })
        },

        method: { upi: true },
        theme: { color: "#0f172a" },
      })
    } catch (err) {
      console.error("UPI payment error:", err)
      setCheckoutError("Failed to open payment")
    }
  }


  const handleCard = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    if (!sdkReady) {
      setCheckoutError("Razorpay SDK is loading... Please wait")
      return
    }

    const orderId = await createOrder()
    if (!orderId) return

    try {
      await openCheckout({
        order_id: orderId,
        amount: amount * 100,
        currency: "INR",
        name: "Space4Wheels",

        async handler(res) {
          const ok = await verifyPayment(orderId, res.razorpay_payment_id, res.razorpay_signature)
          if (ok) {
            onSubmit({
              ...res,
              method: "card",
              cardLast4: cardNumber.slice(-4),
            })
          }
        },

        prefill: { name: cardName },
        method: { card: true },
      })
    } catch (err) {
      console.error("Card payment error:", err)
      setCheckoutError("Failed to open payment")
    }
  }

  return (
    <div className="space-y-6">

      <div className="p-3 border rounded text-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-600" />
          Secure Razorpay Payment
        </div>
      </div>

      {checkoutError && <p className="text-red-500">{checkoutError}</p>}

      {/* UPI */}
      <Button onClick={handleUPI} disabled={!sdkReady || isCreatingOrder}>
        {isCreatingOrder ? <Loader2 className="animate-spin mr-2" /> : null}
        Pay with UPI
      </Button>

      <form onSubmit={handleCard} className="space-y-3">

        <Input
          placeholder="Card Number"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
        />
        {errors.cardNumber && <p className="text-red-500">{errors.cardNumber}</p>}

        <Input placeholder="Name" value={cardName} onChange={(e) => setCardName(e.target.value)} />

        <Input
          placeholder="MM/YY"
          value={expiryDate}
          onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
        />

        <Input
          placeholder="CVV"
          type="password"
          value={cvv}
          onChange={(e) => setCvv(e.target.value)}
        />

        <Button type="submit" disabled={processing || isCreatingOrder}>
          {processing || isCreatingOrder ? "Processing..." : `Pay ₹${amount}`}
        </Button>

        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </form>
    </div>
  )
}