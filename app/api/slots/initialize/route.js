import { NextResponse } from "next/server"
import { getAdminRealtimeDb } from "@/lib/firebase/firebase-admin"

function getSlotType(index, total) {
  if (total <= 5) return "standard"
  const pct = index / total
  if (pct < 0.1) return "accessible"
  if (pct < 0.2) return "ev"
  if (pct < 0.5) return "compact"
  return "standard"
}

function getFloor(index, total) {
  if (total <= 20) return "Ground"
  if (index < total * 0.4) return "Ground"
  if (index < total * 0.7) return "First"
  return "Second"
}

function buildSlots(totalSlots) {
  const slots = {}
  const now = Date.now()
  for (let i = 1; i <= totalSlots; i++) {
    const key = `slot_${i}`
    slots[key] = {
      slotNumber: i,
      status: "available",
      userId: null,
      expiresAt: null,
      bookedAt: null,
      type: getSlotType(i - 1, totalSlots),
      floor: getFloor(i - 1, totalSlots),
      updatedAt: now,
    }
  }
  return slots
}

export async function POST(request) {
  try {
    const body = await request.json()
    const plotId = body?.plotId
    const totalSlots = Number(body?.totalSlots || 0)

    if (!plotId || !Number.isInteger(totalSlots) || totalSlots <= 0) {
      return NextResponse.json(
        { success: false, error: "plotId and positive integer totalSlots are required" },
        { status: 400 }
      )
    }

    const rtdb = getAdminRealtimeDb()
    const slotsRef = rtdb.ref(`plots/${plotId}/slots`)

    const existing = await slotsRef.get()
    if (existing.exists()) {
      const count = Object.keys(existing.val() || {}).length
      return NextResponse.json({ success: true, initialized: false, count })
    }

    const slots = buildSlots(totalSlots)
    await slotsRef.set(slots)
    return NextResponse.json({ success: true, initialized: true, count: totalSlots })
  } catch (error) {
    console.error("[api/slots/initialize]", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to initialize slots" },
      { status: 500 }
    )
  }
}
