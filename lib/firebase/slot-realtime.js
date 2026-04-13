/**
 * lib/firebase/slot-realtime.js
 * Firebase Realtime Database helpers for parking slot management
 */

import { getDatabase, ref, set, get, update, onValue, runTransaction, serverTimestamp, off } from "firebase/database"
import { getApp } from "firebase/app"

// ── Constants ─────────────────────────────────────────────────────────────────
export const SLOT_STATUS = {
  AVAILABLE: "available",
  HELD:      "held",
  BOOKED:    "booked",
}

const HOLD_DURATION_MS = 10 * 60 * 1000   // 10 minutes
const HOLD_DURATION_S  = 10 * 60           // 10 minutes in seconds

// ── Slot type distribution (based on totalSlots) ──────────────────────────────
function getSlotType(index, total) {
  if (total <= 5) return "standard"
  const pct = index / total
  if (pct < 0.1)  return "accessible"   // first 10%
  if (pct < 0.2)  return "ev"           // next 10%
  if (pct < 0.5)  return "compact"      // next 30%
  return "standard"                       // rest
}

function getFloor(index, total) {
  if (total <= 20) return "Ground"
  if (index < total * 0.4) return "Ground"
  if (index < total * 0.7) return "First"
  return "Second"
}

// ── initializeSlots ───────────────────────────────────────────────────────────
/**
 * Generate slot records in Realtime DB for a plot.
 * Idempotent: skips if slots already exist.
 */
export async function initializeSlots(plotId, totalSlots) {
  if (!plotId || !totalSlots || totalSlots <= 0) {
    return { success: false, error: "Invalid plotId or totalSlots" }
  }

  try {
    const db   = getDatabase(getApp())
    const plotRef = ref(db, `plots/${plotId}/slots`)

    // Check existing
    const snap = await get(plotRef)
    if (snap.exists()) {
      const existing = snap.val()
      const count = Object.keys(existing).length
      if (count === totalSlots) {
        return { success: true, initialized: false, count }
      }
    }

    // Build all slots
    const slots = {}
    for (let i = 1; i <= totalSlots; i++) {
      const key = `slot_${i}`
      slots[key] = {
        slotNumber: i,
        status:     SLOT_STATUS.AVAILABLE,
        userId:     null,
        expiresAt:  null,
        bookedAt:   null,
        type:       getSlotType(i - 1, totalSlots),
        floor:      getFloor(i - 1, totalSlots),
        updatedAt:  Date.now(),
      }
    }

    await set(plotRef, slots)
    return { success: true, initialized: true, count: totalSlots }
  } catch (error) {
    console.error("[initializeSlots]", error)
    return { success: false, error: error.message }
  }
}

// ── listenToSlots ─────────────────────────────────────────────────────────────
/**
 * Subscribe to real-time slot updates for a plot.
 * Returns an unsubscribe function.
 */
export function listenToSlots(plotId, callback) {
  if (!plotId) return () => {}

  try {
    const db      = getDatabase(getApp())
    const slotsRef = ref(db, `plots/${plotId}/slots`)

    const handler = (snap) => {
      if (!snap.exists()) {
        callback({})
        return
      }
      const now  = Date.now()
      const data = snap.val()

      // Expire held slots client-side (defensive — cloud function handles server-side)
      const cleaned = {}
      for (const [key, slot] of Object.entries(data)) {
        if (
          slot.status === SLOT_STATUS.HELD &&
          slot.expiresAt &&
          slot.expiresAt < now
        ) {
          cleaned[key] = { ...slot, status: SLOT_STATUS.AVAILABLE, userId: null, expiresAt: null }
        } else {
          cleaned[key] = slot
        }
      }
      callback(cleaned)
    }

    onValue(slotsRef, handler)
    return () => off(slotsRef, "value", handler)
  } catch (error) {
    console.error("[listenToSlots]", error)
    return () => {}
  }
}

// ── holdSlot ──────────────────────────────────────────────────────────────────
/**
 * Atomically hold a slot for a user (10-minute hold).
 * Uses transaction to prevent race conditions.
 */
export async function holdSlot(plotId, slotId, userId) {
  if (!plotId || !slotId || !userId) {
    return { success: false, error: "Missing required parameters" }
  }

  try {
    const res = await fetch("/api/slots/operate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "hold", plotId, slotId }),
    })
    const payload = await res.json().catch(() => ({}))
    return payload?.success ? { success: true, expiresAt: payload.expiresAt } : { success: false, error: payload?.error || "Slot is no longer available" }
  } catch (error) {
    console.error("[holdSlot]", error)
    return { success: false, error: error.message }
  }
}

// ── releaseSlot ───────────────────────────────────────────────────────────────
/**
 * Release a held slot back to available.
 * Only the holding user can release it.
 */
export async function releaseSlot(plotId, slotId, userId) {
  if (!plotId || !slotId || !userId) {
    return { success: false, error: "Missing required parameters" }
  }

  try {
    const res = await fetch("/api/slots/operate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "release", plotId, slotId }),
    })
    const payload = await res.json().catch(() => ({}))
    return { success: !!payload?.success, error: payload?.error || null }
  } catch (error) {
    console.error("[releaseSlot]", error)
    return { success: false, error: error.message }
  }
}

// ── confirmBooking ────────────────────────────────────────────────────────────
/**
 * Atomically confirm a held slot as booked.
 * Prevents double-booking via transaction.
 */
export async function confirmBooking(plotId, slotId, userId, bookingId) {
  if (!plotId || !slotId || !userId) {
    return { success: false, error: "Missing required parameters" }
  }

  try {
    const res = await fetch("/api/slots/operate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", plotId, slotId, bookingId }),
    })
    const payload = await res.json().catch(() => ({}))
    return payload?.success ? { success: true } : { success: false, error: payload?.error || "Could not confirm booking — slot was taken" }
  } catch (error) {
    console.error("[confirmBooking]", error)
    return { success: false, error: error.message }
  }
}

// ── releaseExpiredSlots ───────────────────────────────────────────────────────
/**
 * Client-side sweep of expired holds for a single plot.
 * Should also run in Cloud Function for server-side guarantee.
 */
export async function releaseExpiredSlots(plotId) {
  if (!plotId) return { success: false, error: "Missing plotId" }

  try {
    const res = await fetch("/api/slots/operate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "releaseExpired", plotId }),
    })
    const payload = await res.json().catch(() => ({}))
    return payload?.success ? { success: true, released: payload.released || 0 } : { success: false, error: payload?.error || "Failed to release expired slots" }
  } catch (error) {
    console.error("[releaseExpiredSlots]", error)
    return { success: false, error: error.message }
  }
}

// ── getSlotStats ──────────────────────────────────────────────────────────────
export function computeStats(slots) {
  const values = Object.values(slots || {})
  return {
    total:     values.length,
    available: values.filter(s => s.status === SLOT_STATUS.AVAILABLE).length,
    held:      values.filter(s => s.status === SLOT_STATUS.HELD).length,
    booked:    values.filter(s => s.status === SLOT_STATUS.BOOKED).length,
  }
}