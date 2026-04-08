import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { authDb } from "@/lib/firebase/admin-database"
import { vehiclesDb } from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

initAdmin()

async function getUserFromSession() {
  const cookiesStore = await cookies()
  const sessionCookie = cookiesStore.get("session")?.value

  if (!sessionCookie) return null

  const verifyResult = await authDb.verifySessionCookie(sessionCookie)
  if (!verifyResult.success) return null

  return verifyResult.data
}

export async function GET(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicleId = params.id
    const result = await vehiclesDb.getVehicleById(vehicleId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Check if the vehicle belongs to the user
    if (result.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error fetching vehicle:", error)
    return NextResponse.json({ error: "Failed to fetch vehicle" }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicleId = params.id
    const vehicleData = await request.json()

    // Check if the vehicle belongs to the user
    const checkResult = await vehiclesDb.getVehicleById(vehicleId)
    if (!checkResult.success) {
      return NextResponse.json({ error: checkResult.error }, { status: 400 })
    }
    if (checkResult.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await vehiclesDb.updateVehicle(vehicleId, vehicleData)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error updating vehicle:", error)
    return NextResponse.json({ error: "Failed to update vehicle" }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const vehicleId = params.id

    // Check if the vehicle belongs to the user
    const checkResult = await vehiclesDb.getVehicleById(vehicleId)
    if (!checkResult.success) {
      return NextResponse.json({ error: checkResult.error }, { status: 400 })
    }
    if (checkResult.data.userId !== user.uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const result = await vehiclesDb.deleteVehicle(vehicleId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting vehicle:", error)
    return NextResponse.json({ error: "Failed to delete vehicle" }, { status: 500 })
  }
}
