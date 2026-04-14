"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  listenToSlots,
  holdSlot as fbHoldSlot,
  releaseSlot as fbReleaseSlot,
  confirmBooking as fbConfirmBooking,
  releaseExpiredSlots,
  computeStats,
  SLOT_STATUS,
} from "@/lib/firebase/slot-realtime"
import { hasActiveCheckoutForSlot } from "@/lib/checkout-session"

export { SLOT_STATUS }

const EXPIRY_CHECK_INTERVAL = 30000

export function useSlotAvailability({ plotId, totalSlots, userId: providedUserId }) {
  const { user, loading: authLoading, isInitialized } = useAuth()

  const userId = providedUserId || user?.uid

  const [slots, setSlots] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedSlotKey, setSelectedSlotKey] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    held: 0,
    booked: 0,
  })

  const unsubRef = useRef(null)
  const sweepRef = useRef(null)

  // 🔥 RESET when plot changes
  useEffect(() => {
    setSlots({})
    setSelectedSlotKey(null)
    setStats({ total: 0, available: 0, held: 0, booked: 0 })
    unsubRef.current?.()
    clearInterval(sweepRef.current)
  }, [plotId])

  // ── Initialize + subscribe ─────────────────────────
  useEffect(() => {
    if (!plotId) return
    if (!isInitialized || authLoading) return

    let cancelled = false

    const setup = async () => {
      try {
        setLoading(true)
        setError(null)

        if (totalSlots > 0 && userId) {
          try {
            const initResponse = await fetch("/api/slots/initialize", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plotId, totalSlots }),
            })
            if (!initResponse.ok) {
              const err = await initResponse.json().catch(() => ({}))
              console.warn("[useSlotAvailability] initialize warning:", err?.error || "Init API failed")
            } else {
              const initResult = await initResponse.json()
              if (!initResult.success) {
                console.warn("[useSlotAvailability] initialize warning:", initResult.error || "Init failed")
              }
            }
          } catch (initErr) {
            console.warn("[useSlotAvailability] initialize request failed:", initErr?.message || initErr)
          }
        }

        if (cancelled) return

        const unsub = listenToSlots(plotId, (data) => {
          if (!data) {
            setSlots({})
            setStats({ total: 0, available: 0, held: 0, booked: 0 })
            return
          }

          setSlots(data)
          setStats(computeStats(data))
          setLoading(false)
        })

        unsubRef.current = unsub

      } catch (err) {
        if (!cancelled) {
          console.error(err)
          setError(err.message || "Something went wrong")
          setLoading(false)
        }
      }
    }

    setup()

    // 🔥 expired hold cleanup
    sweepRef.current = setInterval(() => {
      releaseExpiredSlots(plotId).catch(console.error)
    }, EXPIRY_CHECK_INTERVAL)

    return () => {
      cancelled = true
      unsubRef.current?.()
      clearInterval(sweepRef.current)
    }
  }, [plotId, totalSlots, isInitialized, authLoading, userId])

  // ── holdSlot ─────────────────────────
  const holdSlot = useCallback(async (slotKey) => {
    if (!plotId || !slotKey || !userId) {
      setError("Missing required parameters")
      return { success: false }
    }

    try {
      if (selectedSlotKey && selectedSlotKey !== slotKey) {
        await fbReleaseSlot(plotId, selectedSlotKey, userId)
      }

      const result = await fbHoldSlot(plotId, slotKey, userId)

      if (result.success) {
        setSelectedSlotKey(slotKey)
      } else {
        setError(result.error)
      }

      return result
    } catch (err) {
      setError(err.message)
      return { success: false }
    }
  }, [plotId, userId, selectedSlotKey])

  // ── releaseSlot ───────────────────────
  const releaseSlot = useCallback(async (slotKey) => {
    if (!plotId || !slotKey || !userId) return { success: false }

    try {
      const result = await fbReleaseSlot(plotId, slotKey, userId)

      if (result.success && selectedSlotKey === slotKey) {
        setSelectedSlotKey(null)
      }

      return result
    } catch (err) {
      setError(err.message)
      return { success: false }
    }
  }, [plotId, userId, selectedSlotKey])

  // ── confirmBooking ────────────────────
  const confirmBooking = useCallback(async (slotKey, bookingId) => {
    if (!plotId || !slotKey || !userId) return { success: false }

    try {
      const result = await fbConfirmBooking(plotId, slotKey, userId, bookingId)

      if (result.success) {
        setSelectedSlotKey(null)
      }

      return result
    } catch (err) {
      setError(err.message)
      return { success: false }
    }
  }, [plotId, userId])

  // ── release on unmount ────────────────
  useEffect(() => {
    return () => {
      if (selectedSlotKey && plotId && userId) {
        if (hasActiveCheckoutForSlot(plotId, selectedSlotKey)) {
          return
        }
        fbReleaseSlot(plotId, selectedSlotKey, userId).catch(console.error)
      }
    }
  }, [selectedSlotKey, plotId, userId])

  return {
    slots,
    loading,
    error,
    selectedSlotKey,
    stats,
    holdSlot,
    releaseSlot,
    confirmBooking,
  }
}
