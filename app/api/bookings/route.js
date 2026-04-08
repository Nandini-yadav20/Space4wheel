import { NextResponse } from "next/server"
import { createBooking, getBookingsByUserId } from "@/lib/firebase/admin-database/bookings"
import { updatePlotAvailability } from "@/lib/firebase/admin-database/plots"

export async function GET(request) {
  try {
    console.log("finction called")
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    console.log(`Fetching bookings for user: ${userId}`)
  
  
    if (!userId) {
      return NextResponse.json({ success: false, error: "User ID is required", data: [] }, { status: 400 })
    }

    console.log(`Fetching bookings for user: ${userId}`)

    const result = await getBookingsByUserId(userId)

    if (!result.success) {
      console.error(`Error fetching bookings for user ${userId}:`, result.error)
      return NextResponse.json({ success: false, error: result.error, data: [] }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
    })
  } catch (error) {
    console.error("Error fetching bookings:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch bookings", data: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (!body.plotId || !body.userId || !body.startTime || !body.endTime) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: plotId, userId, startTime, endTime" },
        { status: 400 },
      )
    }

    // Create the booking
    const bookingResult = await createBooking(body)

    if (!bookingResult.success) {
      return NextResponse.json({ success: false, error: bookingResult.error }, { status: 500 })
    }

    // Update plot availability (decrease by 1)
    const availabilityResult = await updatePlotAvailability(body.plotId, -1)

    if (!availabilityResult.success) {
      console.error("Failed to update plot availability:", availabilityResult.error)
      // We don't want to fail the booking if this fails, just log it
    }

    return NextResponse.json({
      success: true,
      data: bookingResult.data,
    })
  } catch (error) {
    console.error("Error creating booking:", error)
    return NextResponse.json({ success: false, error: "Failed to create booking" }, { status: 500 })
  }
}
