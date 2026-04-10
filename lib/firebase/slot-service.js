/**
 * lib/firebase/slot-service.js
 *
 * Complete Firebase Realtime Database slot service with:
 * - Slot initialization with atomic transactions
 * - Hold/release operations
 * - Booking confirmation with concurrency protection
 * - Auto-expiry helpers
 * - Real-time listener setup
 *
 * Production-ready with proper error handling & transactions
 */

import {
  ref,
  get,
  set,
  update,
  runTransaction,
  onValue,
  off,
  query,
  orderByChild,
} from "firebase/database"

// Status constants
export const SLOT_STATUS = {
  AVAILABLE: "available",
  HELD: "held",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
}

// Hold expiry time: 10 minutes
export const HOLD_EXPIRY_MS = 10 * 60 * 1000

// ═══════════════════════════════════════════════════════════════════════════════
// 1. INITIALIZATION & BOOTSTRAP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build initial slot data structure given a count
 * @param {number} count - Total number of slots to create
 * @returns {Object} Slot data object with keys: slot_001, slot_002, etc.
 */
export function buildInitialSlots(count) {
  const slots = {}
  for (let i = 1; i <= count; i++) {
    const key = `slot_${String(i).padStart(3, "0")}`
    const slotNumber = i

    slots[key] = {
      // Status & user info
      status: SLOT_STATUS.AVAILABLE,
      heldBy: null,
      heldAt: null,
      bookedBy: null,
      bookedAt: null,
      bookingId: null,

      // Metadata
      slotNumber,
      floor: slotNumber <= Math.ceil(count / 2) ? "Ground" : "First",
      type: determineSlotType(slotNumber, count),

      // Audit trail
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }
  return slots
}

/**
 * Determine slot type based on position and total count
 * @param {number} slotNumber - Slot position (1-indexed)
 * @param {number} totalCount - Total slots
 * @returns {string} Slot type: 'standard', 'compact', 'accessible', or 'ev'
 */
export function determineSlotType(slotNumber, totalCount) {
  // Every 100th slot: accessible
  if (slotNumber % 100 === 0) return SLOT_STATUS.MAINTENANCE
  // Every 20th slot: accessible
  if (slotNumber % 20 === 0) return "accessible"
  // Every 15th slot: EV charging
  if (slotNumber % 15 === 0) return "ev"
  // Every 5th slot: compact
  if (slotNumber % 5 === 0) return "compact"
  // Default
  return "standard"
}

/**
 * Initialize slots for a plot on a specific date (atomic, race-safe)
 * Uses Firebase transaction to prevent double-seeding
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {number} totalSlots - Total number of slots to initialize
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function initializeSlots(db, plotId, dateKey, totalSlots) {
  if (!db || !plotId || !dateKey || !totalSlots) {
    throw new Error("Missing required params: db, plotId, dateKey, totalSlots")
  }

  const slotsPath = `slot_availability/${plotId}/${dateKey}`
  const slotsRef = ref(db, slotsPath)

  try {
    // Check if already initialized
    const snap = await get(slotsRef)
    if (snap.exists()) {
      return { success: true, message: "Slots already initialized", isNew: false }
    }

    // Use transaction to ensure only ONE writer seeds
    const result = await runTransaction(slotsRef, (current) => {
      if (current !== null) {
        // Another user already seeded
        return current
      }
      return buildInitialSlots(totalSlots)
    })

    return {
      success: result.committed,
      message: result.committed
        ? `Initialized ${totalSlots} slots`
        : "Slots already initialized by another user",
      isNew: result.committed,
    }
  } catch (error) {
    console.error("[initializeSlots] Error:", error)
    throw error
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. SLOT HOLD OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Hold a slot for a user (atomic, conflict-safe)
 * Prevents double-booking via transaction
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} slotKey - Slot key (e.g., 'slot_001')
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string, slot?: Object}>}
 */
export async function holdSlot(db, plotId, dateKey, slotKey, userId) {
  if (!db || !plotId || !dateKey || !slotKey || !userId) {
    throw new Error("Missing required params")
  }

  const slotPath = `slot_availability/${plotId}/${dateKey}/${slotKey}`
  const slotRef = ref(db, slotPath)
  const now = Date.now()

  try {
    const result = await runTransaction(slotRef, (current) => {
      if (!current) {
        // Slot doesn't exist
        return undefined // abort transaction
      }

      // If user is re-holding their own slot, refresh TTL
      if (current.heldBy === userId && current.status === SLOT_STATUS.HELD) {
        return {
          ...current,
          heldAt: now,
          updatedAt: now,
        }
      }

      // Reject if already booked
      if (current.status === SLOT_STATUS.BOOKED) {
        return undefined
      }

      // Reject if in maintenance
      if (current.status === SLOT_STATUS.MAINTENANCE) {
        return undefined
      }

      // Reject if held by another user (and not expired)
      if (
        current.status === SLOT_STATUS.HELD &&
        current.heldBy !== userId &&
        current.heldAt &&
        now - current.heldAt < HOLD_EXPIRY_MS
      ) {
        return undefined
      }

      // Success: hold the slot
      return {
        ...current,
        status: SLOT_STATUS.HELD,
        heldBy: userId,
        heldAt: now,
        updatedAt: now,
      }
    })

    if (result.committed) {
      return {
        success: true,
        slot: result.snapshot.val(),
      }
    } else {
      return {
        success: false,
        error: "Slot is no longer available",
      }
    }
  } catch (error) {
    console.error("[holdSlot] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

/**
 * Release a held slot (return to available)
 * Only works if the slot is held by the same user
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} slotKey - Slot key
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function releaseSlot(db, plotId, dateKey, slotKey, userId) {
  if (!db || !plotId || !dateKey || !slotKey || !userId) {
    throw new Error("Missing required params")
  }

  const slotPath = `slot_availability/${plotId}/${dateKey}/${slotKey}`
  const slotRef = ref(db, slotPath)

  try {
    const result = await runTransaction(slotRef, (current) => {
      if (!current || current.heldBy !== userId) {
        // Not held by this user, abort
        return undefined
      }

      return {
        ...current,
        status: SLOT_STATUS.AVAILABLE,
        heldBy: null,
        heldAt: null,
        updatedAt: Date.now(),
      }
    })

    return {
      success: result.committed,
      error: result.committed ? null : "Slot not held by user",
    }
  } catch (error) {
    console.error("[releaseSlot] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. BOOKING CONFIRMATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Confirm a booking after payment success (atomic)
 * Converts held slot to booked
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} slotKey - Slot key
 * @param {string} userId - User ID
 * @param {string} bookingId - Booking ID from Firestore
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function confirmBooking(db, plotId, dateKey, slotKey, userId, bookingId) {
  if (!db || !plotId || !dateKey || !slotKey || !userId) {
    throw new Error("Missing required params")
  }

  const slotPath = `slot_availability/${plotId}/${dateKey}/${slotKey}`
  const slotRef = ref(db, slotPath)
  const now = Date.now()

  try {
    const result = await runTransaction(slotRef, (current) => {
      if (!current) {
        return undefined // slot deleted?
      }

      // Verify it's still held by this user
      if (current.status !== SLOT_STATUS.HELD || current.heldBy !== userId) {
        return undefined // abort if not our hold or already booked
      }

      return {
        ...current,
        status: SLOT_STATUS.BOOKED,
        bookedBy: userId,
        bookedAt: now,
        bookingId: bookingId || null,
        heldBy: null,
        heldAt: null,
        updatedAt: now,
      }
    })

    return {
      success: result.committed,
      error: result.committed ? null : "Cannot confirm booking - slot state changed",
    }
  } catch (error) {
    console.error("[confirmBooking] Error:", error)
    return {
      success: false,
      error: error.message,
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EXPIRY & CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check and release all expired holds for a plot on a date (client-side)
 * Called periodically to clean up stale holds
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<{released: number, errors: number}>}
 */
export async function releaseExpiredHolds(db, plotId, dateKey) {
  if (!db || !plotId || !dateKey) {
    throw new Error("Missing required params")
  }

  const slotsPath = `slot_availability/${plotId}/${dateKey}`
  const slotsRef = ref(db, slotsPath)
  const now = Date.now()

  try {
    const snap = await get(slotsRef)
    if (!snap.exists()) {
      return { released: 0, errors: 0 }
    }

    const slots = snap.val()
    let released = 0
    let errors = 0

    // Check each slot
    for (const [slotKey, slot] of Object.entries(slots)) {
      // Skip if not held
      if (slot.status !== SLOT_STATUS.HELD) continue
      // Skip if no hold time
      if (!slot.heldAt) continue
      // Skip if hold is still valid
      if (now - slot.heldAt < HOLD_EXPIRY_MS) continue

      // Release expired hold
      try {
        const slotRef = ref(db, `${slotsPath}/${slotKey}`)
        await runTransaction(slotRef, (current) => {
          // Double-check it's still expired (another process might've released it)
          if (
            !current ||
            current.status !== SLOT_STATUS.HELD ||
            !current.heldAt ||
            now - current.heldAt < HOLD_EXPIRY_MS
          ) {
            return current
          }
          return {
            ...current,
            status: SLOT_STATUS.AVAILABLE,
            heldBy: null,
            heldAt: null,
            updatedAt: now,
          }
        })
        released++
      } catch (err) {
        console.warn(`[releaseExpiredHolds] Failed to release ${slotKey}:`, err)
        errors++
      }
    }

    return { released, errors }
  } catch (error) {
    console.error("[releaseExpiredHolds] Error:", error)
    throw error
  }
}

/**
 * Set up a real-time listener for slot changes
 * Applies client-side expiry cleanup
 *
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} userId - Current user ID
 * @param {Function} onSlotUpdate - Callback with cleaned slots
 * @param {Function} onError - Error callback
 * @returns {Function} Unsubscribe function
 */
export function listenToSlots(db, plotId, dateKey, userId, onSlotUpdate, onError) {
  if (!db || !plotId || !dateKey) {
    throw new Error("Missing required params")
  }

  const slotsPath = `slot_availability/${plotId}/${dateKey}`
  const slotsRef = ref(db, slotsPath)
  const now = Date.now()

  const unsubscribe = onValue(
    slotsRef,
    (snap) => {
      try {
        const data = snap.val() || {}

        // Clean expired holds client-side
        const cleaned = {}
        for (const [key, slot] of Object.entries(data)) {
          // If held by someone else and expired, mark as available
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
        }

        onSlotUpdate(cleaned)
      } catch (error) {
        console.error("[listenToSlots] Error processing snapshot:", error)
        onError?.(error)
      }
    },
    (error) => {
      console.error("[listenToSlots] Listener error:", error)
      onError?.(error)
    }
  )

  return unsubscribe
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. QUERIES & STATS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get slot statistics for a date
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @returns {Promise<Object>} Stats object with available, held, booked, maintenance counts
 */
export async function getSlotStats(db, plotId, dateKey) {
  if (!db || !plotId || !dateKey) {
    throw new Error("Missing required params")
  }

  const slotsPath = `slot_availability/${plotId}/${dateKey}`
  const slotsRef = ref(db, slotsPath)

  try {
    const snap = await get(slotsRef)
    const data = snap.val() || {}
    const stats = {
      total: 0,
      available: 0,
      held: 0,
      booked: 0,
      maintenance: 0,
    }

    for (const slot of Object.values(data)) {
      stats.total++
      stats[slot.status] = (stats[slot.status] || 0) + 1
    }

    return stats
  } catch (error) {
    console.error("[getSlotStats] Error:", error)
    throw error
  }
}

/**
 * Get a specific slot's data
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} plotId - Plot ID
 * @param {string} dateKey - Date in YYYY-MM-DD format
 * @param {string} slotKey - Slot key
 * @returns {Promise<Object>} Slot data or null if not found
 */
export async function getSlot(db, plotId, dateKey, slotKey) {
  if (!db || !plotId || !dateKey || !slotKey) {
    throw new Error("Missing required params")
  }

  const slotPath = `slot_availability/${plotId}/${dateKey}/${slotKey}`
  const slotRef = ref(db, slotPath)

  try {
    const snap = await get(slotRef)
    return snap.val()
  } catch (error) {
    console.error("[getSlot] Error:", error)
    throw error
  }
}

/**
 * Format date to YYYY-MM-DD key
 * @param {Date|string|number} date - Date to format
 * @returns {string} Formatted date key
 */
export function formatDateKey(date) {
  if (!date) return null
  const d = date instanceof Date ? date : new Date(date)
  return (
    `${d.getFullYear()}-` +
    `${String(d.getMonth() + 1).padStart(2, "0")}-` +
    `${String(d.getDate()).padStart(2, "0")}`
  )
}

/**
 * Get all booked user slots
 * @param {Object} db - Firebase Realtime Database instance
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of booked slot records
 */
export async function getUserBookedSlots(db, userId) {
  if (!db || !userId) {
    throw new Error("Missing required params")
  }

  try {
    const bookingsRef = ref(db, `user_bookings/${userId}`)
    const snap = await get(bookingsRef)
    return snap.val() || {}
  } catch (error) {
    console.error("[getUserBookedSlots] Error:", error)
    throw error
  }
}
