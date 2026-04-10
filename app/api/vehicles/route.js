// app/api/vehicles/route.js — FIXED
// Added clearer error messages + handles cookie verification edge cases

import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { authDb } from "@/lib/firebase/admin-database"
import { vehiclesDb } from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

initAdmin()

async function getUserFromSession() {
  try {
    const cookiesStore = await cookies()
    const sessionCookie = cookiesStore.get("session")?.value

    if (!sessionCookie) {
      console.warn("[vehicles] No session cookie found")
      return null
    }

    const verifyResult = await authDb.verifySessionCookie(sessionCookie)
    if (!verifyResult.success) {
      console.warn("[vehicles] Session cookie verification failed:", verifyResult.error)
      return null
    }

    return verifyResult.data
  } catch (err) {
    console.error("[vehicles] getUserFromSession error:", err)
    return null
  }
}

export async function GET(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in again" },
        { status: 401 }
      )
    }

    const result = await vehiclesDb.getUserVehicles(user.uid)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("GET /api/vehicles error:", error)
    return NextResponse.json({ success: false, error: "Failed to fetch vehicles" }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in again" },
        { status: 401 }
      )
    }

    const vehicleData = await request.json()
    const result = await vehiclesDb.addVehicle(user.uid, vehicleData)

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("POST /api/vehicles error:", error)
    return NextResponse.json({ success: false, error: "Failed to add vehicle" }, { status: 500 })
  }
}

export async function PUT(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in again" },
        { status: 401 }
      )
    }

    const { id, ...vehicleData } = await request.json()
    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle ID is required" }, { status: 400 })
    }

    const result = await vehiclesDb.updateVehicle(id, vehicleData)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("PUT /api/vehicles error:", error)
    return NextResponse.json({ success: false, error: "Failed to update vehicle" }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const user = await getUserFromSession()
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — please log in again" },
        { status: 401 }
      )
    }

    const url = new URL(request.url)
    const id = url.searchParams.get("id")
    if (!id) {
      return NextResponse.json({ success: false, error: "Vehicle ID is required" }, { status: 400 })
    }

    const result = await vehiclesDb.deleteVehicle(id)
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("DELETE /api/vehicles error:", error)
    return NextResponse.json({ success: false, error: "Failed to delete vehicle" }, { status: 500 })
  }
}