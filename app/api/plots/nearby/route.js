import { NextResponse } from "next/server"
import { getPlotsByRadius } from "@/lib/firebase/admin-database/plots"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)

    // Get parameters from the request
    const lat = Number.parseFloat(searchParams.get("lat") || "0")
    const lng = Number.parseFloat(searchParams.get("lng") || "0")
    const radius = Number.parseFloat(searchParams.get("radius") || "5")
    const query = searchParams.get("query") || ""

    // Validate coordinates
    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
      console.error("Invalid coordinates provided:", { lat, lng })
      return NextResponse.json({ success: false, error: "Invalid coordinates", data: [] }, { status: 400 })
    }

    console.log(`Searching for plots near [${lat}, ${lng}] within ${radius} miles`)

    // Get plots within the specified radius
    const result = await getPlotsByRadius(lat, lng, radius, query)

    if (!result.success) {
      console.error("Error in getPlotsByRadius:", result.error)
      return NextResponse.json({ success: false, error: result.error, data: [] }, { status: 500 })
    }

    console.log(`Found ${result.data.length} plots within ${radius} miles`)

    // Ensure we always return an array, even if empty
    return NextResponse.json({
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
    })
  } catch (error) {
    console.error("Error fetching nearby plots:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch nearby plots", data: [] }, { status: 500 })
  }
}
