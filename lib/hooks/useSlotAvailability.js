"use client"

/**
 * lib/hooks/useSlotAvailability.js — ENTERPRISE READY
 *
 * Production-grade slot management hook with:
 * - Transaction-based concurrency control
 * - Client-side hold expiry cleanup
 * - Real-time Firebase listener
 * - Automatic slot initialization
 * - Hold refresh on slot re-select
 * - Cleanup on unmount
 *
 * Integrates with slot-service for centralized business logic
 */

import { useEffect, useState, useCallback, useRef } from "react"
import {
  ref,
  onValue,
  runTransaction,
  get,
} from "firebase/database"
import { useFirebase } from "@/lib/firebase/firebase-provider"
import {
  buildInitialSlots,
  initializeSlots,
  formatDateKey,
  holdSlot as holdSlotService,
  releaseSlot as releaseSlotService,
  confirmBooking as confirmBookingService,
  SLOT_STATUS,
  HOLD_EXPIRY_MS,
} from "@/lib/firebase/slot-service"

// Re-export status constants
export { SLOT_STATUS, HOLD_EXPIRY_MS }

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export function useSlotAvailability({ plotId, date, totalSlots = 20, userId }) {
  const { db } = useFirebase()

  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSlotKey, setSelectedSlotKey] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    held: 0,
    booked: 0,
    maintenance: 0,
  })

  const holdTimerRef = useRef(null)
  const selectedKeyRef = useRef(null)
  const unsubscribeRef = useRef(null)
  const expiryCheckIntervalRef = useRef(null)

  // Keep ref in sync
  useEffect(() => {
    selectedKeyRef.current = selectedSlotKey
  }, [selectedSlotKey])

  const dateKey = formatDateKey(date)
  const slotsPath = plotId && dateKey ? `slot_availability/${plotId}/${dateKey}` : null

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. BOOTSTRAP SLOTS
  // ─────────────────────────────────────────────────────────────────────────────

  const bootstrapSlots = useCallback(async (path, count) => {
    if (!db || !path || !count) return
    try {
      const snap = await get(ref(db, path))
      if (snap.exists()) return

      await runTransaction(ref(db, path), (current) => {
        if (current !== null) return current
        return buildInitialSlots(count)
      })
    } catch (err) {
      console.warn("[useSlotAvailability] Bootstrap error (non-fatal):", err)
    }
  }, [db])

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. REAL-TIME LISTENER WITH CLEANUP
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
      unsubscribeRef.current = null
    }

    if (!db || !slotsPath) {
      setLoading(false)
      if (!db) setError("Realtime database not available")
      return
    }

    setLoading(true)
    setError(null)

    // Bootstrap then subscribe
    bootstrapSlots(slotsPath, totalSlots).then(() => {
      const slotsRef = ref(db, slotsPath)
      const now = Date.now()

      const unsub = onValue(
        slotsRef,
        (snap) => {
          try {
            const data = snap.val() || {}

            // Clean expired holds client-side
            const cleaned = {}
            let available = 0,
              held = 0,
              booked = 0,
              maintenance = 0

            for (const [key, slot] of Object.entries(data)) {
              // Check if hold is expired
              if (
                slot.status === SLOT_STATUS.HELD &&
                slot.heldBy !== userId &&
                slot.heldAt &&
                now - slot.heldAt > HOLD_EXPIRY_MS
              ) {
                cleaned[key] = {
                  ...slot,
                  status: SLOT_STATUS.AVAILABLE,
                  heldBy: null,
                  heldAt: null,
                  updatedAt: now,
                }
              } else {
                cleaned[key] = slot
              }

              // Count stats
              const status = cleaned[key].status
              if (status === SLOT_STATUS.AVAILABLE) available++
              else if (status === SLOT_STATUS.HELD) held++
              else if (status === SLOT_STATUS.BOOKED) booked++
              else if (status === SLOT_STATUS.MAINTENANCE) maintenance++
            }

            setSlots(cleaned)
            setStats({
              total: Object.values(cleaned).length,
              available,
              held,
              booked,
              maintenance,
            })
            setLoading(false)
          } catch (err) {
            console.error("[useSlotAvailability] Snapshot error:", err)
            setError(err.message)
          }
        },
        (err) => {
          console.error("[useSlotAvailability] Listener error:", err)
          setError(err.message)
          setLoading(false)
        }
      )

      unsubscribeRef.current = unsub
    })

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
    }
  }, [db, slotsPath, totalSlots, userId, bootstrapSlots])

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. CLEANUP ON UNMOUNT
  // ─────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Clear timers
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
      if (expiryCheckIntervalRef.current) clearInterval(expiryCheckIntervalRef.current)

      // Release held slot on unmount
      const key = selectedKeyRef.current
      if (key && db && slotsPath && userId) {
        runTransaction(ref(db, `${slotsPath}/${key}`), (current) => {
          if (!current || current.heldBy !== userId) return current
          return {
            ...current,
            status: SLOT_STATUS.AVAILABLE,
            heldBy: null,
            heldAt: null,
            updatedAt: Date.now(),
          }
        }).catch(() => {})
      }
    }
  }, [db, slotsPath, userId])

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. HOLD SLOT
  // ─────────────────────────────────────────────────────────────────────────────

  const holdSlot = useCallback(
    async (slotKey) => {
      if (!db || !slotsPath || !userId || !slotKey) {
        return { success: false, error: "Not ready" }
      }

      // Release previous hold if switching
      if (selectedKeyRef.current && selectedKeyRef.current !== slotKey) {
        await releaseSlot(selectedKeyRef.current)
      }

      try {
        const result = await holdSlotService(db, plotId, dateKey, slotKey, userId)

        if (result.success) {
          setSelectedSlotKey(slotKey)
          clearTimeout(holdTimerRef.current)

          // Auto-release after TTL
          holdTimerRef.current = setTimeout(() => {
            releaseSlot(slotKey)
            setSelectedSlotKey(null)
          }, HOLD_EXPIRY_MS)

          return { success: true }
        } else {
          return { success: false, error: result.error }
        }
      } catch (err) {
        console.error("[holdSlot] Error:", err)
        return { success: false, error: err.message }
      }
    },
    [db, plotId, dateKey, userId, slotsPath]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. RELEASE SLOT
  // ─────────────────────────────────────────────────────────────────────────────

  const releaseSlot = useCallback(
    async (slotKey) => {
      if (!db || !slotsPath || !userId || !slotKey) return

      try {
        await releaseSlotService(db, plotId, dateKey, slotKey, userId)

        if (selectedKeyRef.current === slotKey) {
          setSelectedSlotKey(null)
          clearTimeout(holdTimerRef.current)
        }
      } catch (err) {
        console.warn("[releaseSlot] Error:", err)
      }
    },
    [db, plotId, dateKey, userId, slotsPath]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. CONFIRM BOOKING
  // ─────────────────────────────────────────────────────────────────────────────

  const confirmBooking = useCallback(
    async (slotKey, bookingId) => {
      if (!db || !slotsPath || !userId || !slotKey) {
        return { success: false, error: "Missing params" }
      }

      try {
        const result = await confirmBookingService(
          db,
          plotId,
          dateKey,
          slotKey,
          userId,
          bookingId
        )

        if (result.success) {
          clearTimeout(holdTimerRef.current)
          setSelectedSlotKey(null)
          return { success: true }
        }

        return { success: false, error: result.error }
      } catch (err) {
        console.error("[confirmBooking] Error:", err)
        return { success: false, error: err.message }
      }
    },
    [db, plotId, dateKey, userId, slotsPath]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // 7. UTILITY: GET HOLD REMAINING TIME
  // ─────────────────────────────────────────────────────────────────────────────

  const getHoldRemainingMS = useCallback(
    (slotKey) => {
      const slot = slots[slotKey]
      if (!slot || slot.status !== SLOT_STATUS.HELD || !slot.heldAt) return 0

      const elapsed = Date.now() - slot.heldAt
      return Math.max(0, HOLD_EXPIRY_MS - elapsed)
    },
    [slots]
  )

  return {
    // State
    slots,
    loading,
    error,
    selectedSlotKey,
    stats,
    dateKey,
    slotsPath,

    // Actions
    holdSlot,
    releaseSlot,
    confirmBooking,
    setSelectedSlotKey,
    getHoldRemainingMS,

    // Metadata
    totalSlots,
    userId,
  }
}