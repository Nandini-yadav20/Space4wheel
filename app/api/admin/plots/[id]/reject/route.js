import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function PUT(request, { params }) {
  try {
    const plotId = params.id

    if (!plotId) {
      return NextResponse.json({ error: "Plot ID is required" }, { status: 400 })
    }

    const { reason } = await request.json()

    // Reject the plot
    const result = await adminDbService.plots.updatePlotStatus(plotId, "rejected", reason)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Get the plot details to send notification to owner
    const plotResult = await adminDbService.plots.getPlotById(plotId)

    if (plotResult.success) {
      const plot = plotResult.data

      // Create notification for the owner
      await adminDbService.notifications.createNotification({
        userId: plot.ownerId,
        type: "plot_rejected",
        title: "Plot Rejected",
        message: `Your parking plot "${plot.name}" has been rejected. Reason: ${reason || "No reason provided"}`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error rejecting plot:", error)
    return NextResponse.json({ error: "Failed to reject plot" }, { status: 500 })
  }
}
