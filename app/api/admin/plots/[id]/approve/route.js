import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function PUT(request, { params }) {
  try {
    const resolvedParams = await params;
    const plotId = resolvedParams.id;

    if (!plotId) {
      return NextResponse.json({ error: "Plot ID is required" }, { status: 400 })
    }

    // Approve the plot
    const result = await adminDbService.plots.approvePlot(plotId)

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
        type: "plot_approved",
        title: "Plot Approved",
        message: `Your parking plot "${plot.name}" has been approved and is now visible to users.`,
        read: false,
        createdAt: new Date().toISOString(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error approving plot:", error)
    return NextResponse.json({ error: "Failed to approve plot" }, { status: 500 })
  }
}
