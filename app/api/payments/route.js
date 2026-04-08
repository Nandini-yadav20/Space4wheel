import { NextResponse } from "next/server"
import { processPayment } from "@/lib/firebase/admin-database/transactions"

export async function POST(request) {
  try {
    const body = await request.json()

    if (!body.bookingId || !body.amount) {
      return NextResponse.json({ success: false, error: "Missing required fields: bookingId, amount" }, { status: 400 })
    }

    // Process the payment
    const result = await processPayment(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error("Error processing payment:", error)
    return NextResponse.json({ success: false, error: "Failed to process payment" }, { status: 500 })
  }
}
