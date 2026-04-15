import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// ✅ Force dynamic (VERY IMPORTANT)
export const dynamic = "force-dynamic"

export async function GET(request) {
  try {
    // ✅ Initialize here (NOT at top)
    initAdmin()

    const result = await adminDbService.bookings.getAllBookings()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    const recentBookings = result.data
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)

    const enhancedBookings = await Promise.all(
      recentBookings.map(async (booking) => {
        const plotResult = await adminDbService.plots.getPlotById(booking.plotId)
        return {
          ...booking,
          plotName: plotResult.success
            ? plotResult.data.name
            : "Unknown Plot",
        }
      })
    )

    return NextResponse.json(enhancedBookings)

  } catch (error) {
    console.error("Error fetching recent bookings:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent bookings" },
      { status: 500 }
    )
  }
}