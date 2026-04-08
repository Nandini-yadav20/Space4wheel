"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { ref, onValue, runTransaction, off, set, serverTimestamp, get } from "firebase/database"
import { useDatabase } from "@/lib/firebase/firebase-provider"

/**
 * Slot statuses
 * available   – no one is holding/booked
 * held        – temporarily locked by a user (TTL 10 min)
 * booked      – permanently reserved after payment
 * maintenance – admin-disabled
 */
export const SLOT_STATUS = {
  AVAILABLE: "available",
  HELD: "held",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
}

/**
 * How long (ms) a "held" lock lasts before auto-expiry.
 * Server-side Cloud Function should also enforce this.
 */
const HOLD_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * useSlotAvailability
 *
 * Subscribes to real-time slot data for a given plot and date.
 * Provides helpers to hold / release a slot optimistically.
 *
 * Firebase RTDB path:
 *   slot_availability/{plotId}/{date}/{slotKey}
 *
 * Each slot document:
 *   {
 *     status: "available" | "held" | "booked" | "maintenance",
 *     heldBy: uid | null,
 *     heldAt: timestamp | null,
 *     bookedBy: uid | null,
 *     bookedAt: timestamp | null,
 *     slotNumber: number,
 *     floor: string | null,
 *     type: "standard" | "compact" | "accessible" | "ev",
 *   }
 */
export function useSlotAvailability({ plotId, date, totalSlots, userId }) {
  const db = useDatabase()
  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSlotKey, setSelectedSlotKey] = useState(null)
  const holdExpiryTimerRef = useRef(null)

  const dateKey = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    : null

  const slotsPath = plotId && dateKey ? `slot_availability/${plotId}/${dateKey}` : null

  // ── 1. Bootstrap slots if the date node doesn't exist yet ──────────────────
  const bootstrapSlots = useCallback(
    async (path, count) => {
      if (!db || !path || !count) return
      const snap = await get(ref(db, path))
      if (snap.exists()) return // already seeded

      const initial = {}
      for (let i = 1; i <= count; i++) {
        const key = `slot_${String(i).padStart(3, "0")}`
        initial[key] = {
          status: SLOT_STATUS.AVAILABLE,
          heldBy: null,
          heldAt: null,
          bookedBy: null,
          bookedAt: null,
          slotNumber: i,
          floor: i <= Math.ceil(count / 2) ? "Ground" : "First",
          type:
            i % 20 === 0
              ? "accessible"
              : i % 15 === 0
              ? "ev"
              : i % 5 === 0
              ? "compact"
              : "standard",
        }
      }
      await set(ref(db, path), initial)
    },
    [db]
  )

  // ── 2. Real-time subscription ───────────────────────────────────────────────
  useEffect(() => {
    if (!db || !slotsPath) return

    setLoading(true)
    setError(null)

    bootstrapSlots(slotsPath, totalSlots)

    const slotsRef = ref(db, slotsPath)

    const unsubscribe = onValue(
      slotsRef,
      (snap) => {
        const data = snap.val() || {}

        // Expire stale holds client-side (belt-and-suspenders; server should do this too)
        const now = Date.now()
        const cleaned = {}
        Object.entries(data).forEach(([key, slot]) => {
          if (
            slot.status === SLOT_STATUS.HELD &&
            slot.heldAt &&
            now - slot.heldAt > HOLD_TTL_MS &&
            slot.heldBy !== userId
          ) {
            cleaned[key] = { ...slot, status: SLOT_STATUS.AVAILABLE, heldBy: null, heldAt: null }
          } else {
            cleaned[key] = slot
          }
        })

        setSlots(cleaned)
        setLoading(false)
      },
      (err) => {
        console.error("Slot subscription error:", err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => {
      off(slotsRef)
      unsubscribe()
    }
  }, [db, slotsPath, totalSlots, userId, bootstrapSlots])

  // ── 3. Hold a slot (optimistic + RTDB transaction) ─────────────────────────
  const holdSlot = useCallback(
    async (slotKey) => {
      if (!db || !slotsPath || !userId || !slotKey) return { success: false, error: "Missing params" }

      // If already holding another slot, release it first
      if (selectedSlotKey && selectedSlotKey !== slotKey) {
        await releaseSlot(selectedSlotKey)
      }

      const slotRef = ref(db, `${slotsPath}/${slotKey}`)

      try {
        const result = await runTransaction(slotRef, (current) => {
          if (!current) return current // slot doesn't exist

          const now = Date.now()

          // Allow re-holding own slot (refresh TTL)
          if (current.heldBy === userId) {
            return { ...current, heldAt: now }
          }

          // Reject if already held by someone else (not expired) or booked
          if (
            current.status === SLOT_STATUS.BOOKED ||
            current.status === SLOT_STATUS.MAINTENANCE ||
            (current.status === SLOT_STATUS.HELD &&
              current.heldBy !== userId &&
              now - (current.heldAt || 0) < HOLD_TTL_MS)
          ) {
            return undefined // abort transaction
          }

          return {
            ...current,
            status: SLOT_STATUS.HELD,
            heldBy: userId,
            heldAt: now,
          }
        })

        if (result.committed) {
          setSelectedSlotKey(slotKey)

          // Auto-release after TTL
          clearTimeout(holdExpiryTimerRef.current)
          holdExpiryTimerRef.current = setTimeout(() => {
            releaseSlot(slotKey)
            setSelectedSlotKey(null)
          }, HOLD_TTL_MS)

          return { success: true }
        } else {
          return { success: false, error: "Slot is no longer available" }
        }
      } catch (err) {
        console.error("holdSlot error:", err)
        return { success: false, error: err.message }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [db, slotsPath, userId, selectedSlotKey]
  )

  // ── 4. Release a hold ───────────────────────────────────────────────────────
  const releaseSlot = useCallback(
    async (slotKey) => {
      if (!db || !slotsPath || !userId || !slotKey) return

      const slotRef = ref(db, `${slotsPath}/${slotKey}`)

      try {
        await runTransaction(slotRef, (current) => {
          if (!current) return current
          if (current.heldBy !== userId) return current // not our hold
          return {
            ...current,
            status: SLOT_STATUS.AVAILABLE,
            heldBy: null,
            heldAt: null,
          }
        })

        if (selectedSlotKey === slotKey) {
          setSelectedSlotKey(null)
          clearTimeout(holdExpiryTimerRef.current)
        }
      } catch (err) {
        console.error("releaseSlot error:", err)
      }
    },
    [db, slotsPath, userId, selectedSlotKey]
  )

  // ── 5. Confirm booking (called after payment succeeds) ─────────────────────
  const confirmBooking = useCallback(
    async (slotKey, bookingId) => {
      if (!db || !slotsPath || !userId || !slotKey) return { success: false }

      const slotRef = ref(db, `${slotsPath}/${slotKey}`)

      try {
        const result = await runTransaction(slotRef, (current) => {
          if (!current) return current
          if (current.heldBy !== userId) return undefined // safety check
          return {
            ...current,
            status: SLOT_STATUS.BOOKED,
            heldBy: null,
            heldAt: null,
            bookedBy: userId,
            bookedAt: Date.now(),
            bookingId: bookingId || null,
          }
        })

        if (result.committed) {
          clearTimeout(holdExpiryTimerRef.current)
          setSelectedSlotKey(null)
          return { success: true }
        }
        return { success: false, error: "Could not confirm booking" }
      } catch (err) {
        console.error("confirmBooking error:", err)
        return { success: false, error: err.message }
      }
    },
    [db, slotsPath, userId]
  )

  // ── 6. Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearTimeout(holdExpiryTimerRef.current)
      // Release any held slot on unmount
      if (selectedSlotKey) {
        releaseSlot(selectedSlotKey)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── 7. Derived stats ────────────────────────────────────────────────────────
  const stats = {
    available: 0,
    held: 0,
    booked: 0,
    maintenance: 0,
    total: Object.keys(slots).length,
  }
  Object.values(slots).forEach((s) => {
    if (stats[s.status] !== undefined) stats[s.status]++
  })

  return {
    slots,
    loading,
    error,
    selectedSlotKey,
    stats,
    holdSlot,
    releaseSlot,
    confirmBooking,
    setSelectedSlotKey,
  }
}