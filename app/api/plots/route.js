import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

export async function GET(request) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    const { searchParams } = new URL(request.url)
    const ownerId = searchParams.get("ownerId")
    const plotId=searchParams.get("plotId")
    

    let result

    if (ownerId) {
      result = await adminDbService.plots.getPlotsByOwnerId(ownerId)
    } else if(plotId) {
      result = await adminDbService.plots.getPlotByplotId(plotId)
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error fetching plots:", error)
    return NextResponse.json({ error: "Failed to fetch plots: " + error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    const data = await request.json()
    console.log("Received plot data:", data)

    // Validate required fields
    if (!data.name || !data.address || !data.price || !data.totalSlots || !data.ownerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await adminDbService.plots.createPlot(data)
    console.log("Create plot result:", result)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error("Error creating plot:", error)
    return NextResponse.json({ error: "Failed to create plot: " + error.message }, { status: 500 })
  }
}
