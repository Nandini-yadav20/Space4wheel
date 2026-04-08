import { NextResponse } from "next/server"
import { getReviewsByPlotId, createReview } from "@/lib/firebase/admin-database/reviews"

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const plotId = searchParams.get("plotId")

    if (!plotId) {
      return NextResponse.json({ success: false, error: "Plot ID is required", data: [] }, { status: 400 })
    }

    console.log(`Fetching reviews for plot: ${plotId}`)

    const result = await getReviewsByPlotId(plotId)

    if (!result.success) {
      console.error(`Error fetching reviews for plot ${plotId}:`, result.error)
      return NextResponse.json({ success: false, error: result.error, data: [] }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: Array.isArray(result.data) ? result.data : [],
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch reviews", data: [] }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const body = await request.json()

    if (!body.plotId || !body.userId || !body.rating) {
      return NextResponse.json(
        { success: false, error: "Missing required fields: plotId, userId, rating" },
        { status: 400 },
      )
    }

    const result = await createReview(body)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: result.data,
    })
  } catch (error) {
    console.error("Error creating review:", error)
    return NextResponse.json({ success: false, error: "Failed to create review" }, { status: 500 })
  }
}
