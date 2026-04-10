// app/api/vehicles/[id]/route.js — FIXED
// Same session auth fix as vehicles/route.js

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { authDb, vehiclesDb } from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

initAdmin()

async function getUserFromSession() {
  try {
    const cookiesStore = await cookies()
    const sessionCookie = cookiesStore.get("session")?.value
    if (!sessionCookie) return null
    const verifyResult = await authDb.verifySessionCookie(sessionCookie)
    if (!verifyResult.success) return null
    return verifyResult.data
  } catch {
    return null
  }
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const result = await vehiclesDb.getVehicleById(id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    if (result.data.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const vehicleData = await request.json()

    const checkResult = await vehiclesDb.getVehicleById(id)
    if (!checkResult.success) {
      return NextResponse.json({ error: checkResult.error }, { status: 400 })
    }
    if (checkResult.data.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await vehiclesDb.updateVehicle(id, vehicleData)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    const checkResult = await vehiclesDb.getVehicleById(id)
    if (!checkResult.success) {
      return NextResponse.json({ error: checkResult.error }, { status: 400 })
    }
    if (checkResult.data.userId !== user.uid) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const result = await vehiclesDb.deleteVehicle(id)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 })
  }
}