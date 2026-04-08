// ─────────────────────────────────────────────────────────────────────────────
// app/api/plots/[id]/route.js   ← FULL replacement (GET + PUT + DELETE)
// ─────────────────────────────────────────────────────────────────────────────
import { NextResponse } from "next/server"
import { getPlotById, updatePlot, deletePlot } from "@/lib/firebase/admin-database/plots"
import { initAdmin } from "@/lib/firebase/firebase-admin"

initAdmin()

// GET /api/plots/:id
export async function GET(request, { params }) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ success: false, error: "Plot ID required" }, { status: 400 })

    const result = await getPlotById(id)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}

// PUT /api/plots/:id
export async function PUT(request, { params }) {
  try {
    const { id } = await params
    const data = await request.json()

    if (!data.name || !data.address || !data.price || !data.description || !data.totalSlots || !data.ownerId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await updatePlot(id, data)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/plots/:id
export async function DELETE(request, { params }) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ success: false, error: "Plot ID required" }, { status: 400 })

    const result = await deletePlot(id)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}