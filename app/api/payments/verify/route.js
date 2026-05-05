import { NextResponse } from "next/server"
import crypto from "crypto"
import { processPayment } from "@/lib/firebase/admin-database/transactions"

export async function POST(request) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, bookingId, amount, userId } = await request.json()

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, error: "Missing payment verification details" },
        { status: 400 }
      )
    }

    // Get secret key from environment
    const secretKey = process.env.RAZORPAY_KEY_SECRET?.trim()
    if (!secretKey) {
      console.error("Missing Razorpay secret key in environment variables")
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment service not configured",
          debug: process.env.NODE_ENV === "development" ? "Missing secret key" : undefined
        },
        { status: 500 }
      )
    }

    // Verify the signature
    const body = `${razorpay_order_id}|${razorpay_payment_id}`
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(body)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      console.error("Payment signature verification failed", {
        expected: expectedSignature,
        received: razorpay_signature,
      })
      return NextResponse.json(
        { success: false, error: "Payment verification failed. Signature mismatch." },
        { status: 403 }
      )
    }

    // Signature is valid, process the payment in your database
    const paymentData = {
      bookingId,
      userId,
      amount,
      razorpay_payment_id,
      razorpay_order_id,
      payment_method: "razorpay",
      status: "completed",
    }

    const result = await processPayment(paymentData)

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Payment verified and processed successfully",
      data: result.data,
    })
  } catch (error) {
    console.error("Error verifying payment:", error.message, error.stack)
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to verify payment",
        debug: process.env.NODE_ENV === "development" ? error.toString() : undefined
      },
      { status: 500 }
    )
  }
}
