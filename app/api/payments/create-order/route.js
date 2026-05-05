import { NextResponse } from "next/server"
import Razorpay from "razorpay"

export async function POST(request) {
  try {
    const { amount, bookingId, userId } = await request.json()

    // Validate input
    if (!amount || !bookingId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: amount, bookingId, userId" },
        { status: 400 }
      )
    }

    // Validate amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be a positive number" },
        { status: 400 }
      )
    }

    // Get environment variables
    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      console.error("Razorpay credentials missing", { keyId: !!keyId, keySecret: !!keySecret })
      return NextResponse.json(
        { 
          success: false, 
          error: "Payment gateway not configured"
        },
        { status: 500 }
      )
    }

    // Initialize Razorpay instance
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    })

    // Create Razorpay order
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: "INR",
      receipt: `booking_${Date.now().toString().slice(-10)}`, // Keep under 40 chars
      notes: {
        bookingId,
        userId,
      },
    }

    console.log("Creating Razorpay order with options:", options)
    const order = await razorpay.orders.create(options)
    console.log("Order created successfully:", order.id)

    return NextResponse.json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    })
  } catch (error) {
    console.error("Error creating Razorpay order:", {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      stack: error.stack,
      fullError: error,
    })
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to create order",
        details: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    )
  }
}
