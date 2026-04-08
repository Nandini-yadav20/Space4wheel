import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function GET(request) {
  try {
    // Get all bookings
    const result = await adminDbService.bookings.getAllBookings()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Sort by creation date (most recent first) and limit to 5
    const recentBookings = result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5)

    // Enhance bookings with plot names
    const enhancedBookings = await Promise.all(
      recentBookings.map(async (booking) => {
        const plotResult = await adminDbService.plots.getPlotById(booking.plotId)
        return {
          ...booking,
          plotName: plotResult.success ? plotResult.data.name : "Unknown Plot",
        }
      }),
    )

    return NextResponse.json(enhancedBookings)
  } catch (error) {
    console.error("Error fetching recent bookings:", error)
    return NextResponse.json({ error: "Failed to fetch recent bookings" }, { status: 500 })
  }
}
