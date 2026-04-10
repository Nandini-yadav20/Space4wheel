/**
 * functions/src/releaseExpiredSlots.js
 *
 * Firebase Cloud Function (Pub/Sub triggered)
 * Runs periodically to release expired slot holds from the server-side
 *
 * Setup:
 * 1. Deploy this function to Firebase Functions
 * 2. Create a Cloud Scheduler job to trigger it via Pub/Sub
 *    - Frequency: Every 1 minute (*/1 * * * *)
 *    - Topic: "release-expired-slots"
 *
 * Deploy:
 *    firebase deploy --only functions:releaseExpiredSlots
 */

const functions = require("firebase-functions")
const admin = require("firebase-admin")

// Constants
const HOLD_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes
const SLOT_STATUS = {
  AVAILABLE: "available",
  HELD: "held",
  BOOKED: "booked",
  MAINTENANCE: "maintenance",
}

/**
 * Cloud Function triggered by Pub/Sub
 * Scans all plots and dates, releasing expired holds
 */
exports.releaseExpiredSlots = functions.pubsub
  .topic("release-expired-slots")
  .onPublish(async (message) => {
    const db = admin.database()
    const now = Date.now()
    let released = 0
    let processed = 0

    try {
      console.log("[releaseExpiredSlots] Starting cleanup...")

      // Get all plots and dates
      const snapshot = await db.ref("slot_availability").get()
      if (!snapshot.exists()) {
        console.log("[releaseExpiredSlots] No slots found")
        return { success: true, released: 0, processed: 0 }
      }

      const plotsData = snapshot.val()

      // Iterate through each plot
      for (const [plotId, datesData] of Object.entries(plotsData)) {
        // Iterate through each date
        for (const [dateKey, slotsData] of Object.entries(datesData)) {
          // Iterate through each slot
          for (const [slotKey, slot] of Object.entries(slotsData)) {
            processed++

            // Skip if not held or no hold time
            if (slot.status !== SLOT_STATUS.HELD || !slot.heldAt) continue

            // Skip if hold is still valid
            if (now - slot.heldAt < HOLD_EXPIRY_MS) continue

            // Release expired hold using transaction
            try {
              await db
                .ref(`slot_availability/${plotId}/${dateKey}/${slotKey}`)
                .transaction((current) => {
                  // Double-check it's still expired
                  if (
                    !current ||
                    current.status !== SLOT_STATUS.HELD ||
                    !current.heldAt ||
                    now - current.heldAt < HOLD_EXPIRY_MS
                  ) {
                    return // abort
                  }

                  released++
                  return {
                    ...current,
                    status: SLOT_STATUS.AVAILABLE,
                    heldBy: null,
                    heldAt: null,
                    updatedAt: now,
                  }
                })
            } catch (err) {
              console.error(
                `[releaseExpiredSlots] Failed to release ${plotId}/${dateKey}/${slotKey}:`,
                err
              )
            }
          }
        }
      }

      console.log(
        `[releaseExpiredSlots] Complete: Released ${released}/${processed} slots`
      )
      return { success: true, released, processed }
    } catch (error) {
      console.error("[releaseExpiredSlots] Error:", error)
      return { success: false, error: error.message }
    }
  })

/**
 * Alternative: Callable function for manual cleanup
 * Usage: firebase.functions().httpsCallable('releaseExpiredSlotsManual')()
 */
exports.releaseExpiredSlotsManual = functions.https.onCall(
  async (data, context) => {
    // Verify user is authenticated and admin
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Must be authenticated"
      )
    }

    // Optional: Check if user is admin
    const db = admin.database()
    const userRole = await db
      .ref(`users/${context.auth.uid}/role`)
      .get()
      .then((snap) => snap.val())

    if (userRole !== "admin") {
      throw new functions.https.HttpsError("permission-denied", "Must be admin")
    }

    // Run cleanup
    const now = Date.now()
    let released = 0
    let processed = 0

    try {
      const snapshot = await db.ref("slot_availability").get()
      if (!snapshot.exists()) {
        return { success: true, released: 0, processed: 0 }
      }

      const plotsData = snapshot.val()

      for (const [plotId, datesData] of Object.entries(plotsData)) {
        for (const [dateKey, slotsData] of Object.entries(datesData)) {
          for (const [slotKey, slot] of Object.entries(slotsData)) {
            processed++

            if (slot.status !== SLOT_STATUS.HELD || !slot.heldAt) continue
            if (now - slot.heldAt < HOLD_EXPIRY_MS) continue

            try {
              await db
                .ref(`slot_availability/${plotId}/${dateKey}/${slotKey}`)
                .transaction((current) => {
                  if (
                    !current ||
                    current.status !== SLOT_STATUS.HELD ||
                    !current.heldAt ||
                    now - current.heldAt < HOLD_EXPIRY_MS
                  ) {
                    return
                  }

                  released++
                  return {
                    ...current,
                    status: SLOT_STATUS.AVAILABLE,
                    heldBy: null,
                    heldAt: null,
                    updatedAt: now,
                  }
                })
            } catch (err) {
              console.error(
                `Failed to release ${plotId}/${dateKey}/${slotKey}:`,
                err
              )
            }
          }
        }
      }

      return { success: true, released, processed }
    } catch (error) {
      throw new functions.https.HttpsError("internal", error.message)
    }
  }
)
