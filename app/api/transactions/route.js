import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const bookingId = searchParams.get("bookingId")

    let result

    if (userId) {
      result = await adminDbService.transactions.getTransactionsByUserId(userId)
    } else if (bookingId) {
      result = await adminDbService.transactions.getTransactionsByBookingId(bookingId)
    } else {
      return NextResponse.json({ error: "Missing query parameters" }, { status: 400 })
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Failed to fetch transactions: " + error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    const data = await request.json()

    // Validate required fields
    if (!data.userId || !data.bookingId || !data.amount || !data.currency || !data.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await adminDbService.transactions.createTransaction(data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error("Error creating transaction:", error)
    return NextResponse.json({ error: "Failed to create transaction: " + error.message }, { status: 500 })
  }
}
