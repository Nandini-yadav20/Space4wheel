import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import adminDbService from "@/lib/firebase/admin-database"
import { getAdminRealtimeDb } from "@/lib/firebase/firebase-admin"

const HOLD_DURATION_MS = 10 * 60 * 1000

async function getAuthenticatedUid() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("session")?.value
  if (!sessionCookie) {
    return { success: false, error: "Unauthorized" }
  }

  const session = await adminDbService.auth.verifySessionCookie(sessionCookie)
  if (!session.success || !session.data?.uid) {
    return { success: false, error: "Unauthorized" }
  }
  return { success: true, uid: session.data.uid }
}

export async function POST(request) {
  try {
    const auth = await getAuthenticatedUid()
    if (!auth.success) {
      return NextResponse.json({ success: false, error: auth.error }, { status: 401 })
    }

    const body = await request.json()
    const { action, plotId, slotId, bookingId } = body || {}
    if (!action || !plotId) {
      return NextResponse.json({ success: false, error: "action and plotId are required" }, { status: 400 })
    }

    const userId = auth.uid
    const db = getAdminRealtimeDb()

    if (action === "releaseExpired") {
      const slotsRef = db.ref(`plots/${plotId}/slots`)
      const snap = await slotsRef.get()
      if (!snap.exists()) return NextResponse.json({ success: true, released: 0 })

      const now = Date.now()
      const updates = {}
      let released = 0
      for (const [key, slot] of Object.entries(snap.val() || {})) {
        if (slot?.status === "held" && slot?.expiresAt && slot.expiresAt < now) {
          updates[`${key}/status`] = "available"
          updates[`${key}/userId`] = null
          updates[`${key}/expiresAt`] = null
          updates[`${key}/updatedAt`] = now
          released++
        }
      }
      if (released > 0) {
        await slotsRef.update(updates)
      }
      return NextResponse.json({ success: true, released })
    }

    if (!slotId) {
      return NextResponse.json({ success: false, error: "slotId is required" }, { status: 400 })
    }

    const slotRef = db.ref(`plots/${plotId}/slots/${slotId}`)
    const now = Date.now()

    if (action === "hold") {
      const expires = now + HOLD_DURATION_MS
      const result = await slotRef.transaction((current) => {
        if (!current) return
        const currentHolder = current.userId || current.heldBy || null
        const legacyHeldAt = current.heldAt || null
        const isLegacyHoldExpired =
          legacyHeldAt && now - legacyHeldAt > HOLD_DURATION_MS

        if (current.status === "held" && currentHolder === userId) {
          return {
            ...current,
            userId,
            heldBy: userId,
            heldAt: now,
            expiresAt: expires,
            updatedAt: now,
          }
        }
        if (
          current.status === "held" &&
          currentHolder &&
          currentHolder !== userId &&
          (
            (current.expiresAt && current.expiresAt > now) ||
            (!current.expiresAt && !isLegacyHoldExpired)
          )
        ) {
          return
        }
        if (current.status === "booked") return
        return {
          ...current,
          status: "held",
          userId,
          heldBy: userId,
          heldAt: now,
          expiresAt: expires,
          updatedAt: now,
        }
      })

      if (result.committed) {
        return NextResponse.json({ success: true, expiresAt: expires })
      }
      const latest = await slotRef.get()
      const latestVal = latest.val() || {}
      const latestHolder = latestVal.userId || latestVal.heldBy || null
      const latestHeldExpired =
        (latestVal.expiresAt && latestVal.expiresAt <= now) ||
        (latestVal.heldAt && now - latestVal.heldAt > HOLD_DURATION_MS)

      // Fallback: if slot is effectively free/stale, claim it directly.
      if (
        latestVal &&
        latestVal.status !== "booked" &&
        (
          latestVal.status !== "held" ||
          !latestHolder ||
          latestHolder === userId ||
          latestHeldExpired
        )
      ) {
        await slotRef.update({
          status: "held",
          userId,
          heldBy: userId,
          heldAt: now,
          expiresAt: expires,
          updatedAt: now,
        })
        return NextResponse.json({ success: true, expiresAt: expires })
      }

      if (latestVal.status === "booked") {
        return NextResponse.json({ success: false, error: "Slot is already booked" })
      }
      return NextResponse.json({ success: false, error: "Slot is currently held by another user" })
    }

    if (action === "release") {
      const result = await slotRef.transaction((current) => {
        if (!current) return
        if (current.status === "booked") return
        if (current.userId !== userId) return
        return { ...current, status: "available", userId: null, expiresAt: null, updatedAt: now }
      })
      return NextResponse.json({ success: !!result.committed, error: result.committed ? null : "Release denied" })
    }

    if (action === "confirm") {
      const result = await slotRef.transaction((current) => {
        if (!current) return
        if (current.status === "booked") return
        if (current.status === "held" && current.userId !== userId) return
        return {
          ...current,
          status: "booked",
          userId,
          bookingId: bookingId || null,
          bookedAt: now,
          expiresAt: null,
          updatedAt: now,
        }
      })

      if (result.committed && result.snapshot.val()?.status === "booked") {
        return NextResponse.json({ success: true })
      }
      return NextResponse.json({ success: false, error: "Could not confirm booking - slot changed" })
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("[api/slots/operate]", error)
    return NextResponse.json({ success: false, error: error?.message || "Slot operation failed" }, { status: 500 })
  }
}
