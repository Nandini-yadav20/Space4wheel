/**
 * functions/src/releaseExpiredSlots.js  (UPDATED)
 *
 * Firebase Cloud Function – releases expired slot holds server-side.
 * Uses the NEW `plots/{plotId}/slots` path (not slot_availability).
 *
 * Deploy:
 *   firebase deploy --only functions:releaseExpiredSlots
 *
 * Pub/Sub trigger: "release-expired-slots"
 * Schedule:        every 1 minute via Cloud Scheduler
 */

const functions = require("firebase-functions")
const admin     = require("firebase-admin")

if (!admin.apps.length) admin.initializeApp()

const HOLD_EXPIRY_MS = 10 * 60 * 1000
const SLOT_STATUS    = { AVAILABLE: "available", HELD: "held", BOOKED: "booked" }

// ── Pub/Sub triggered (scheduled every 1 minute) ──────────────────────────────
exports.releaseExpiredSlots = functions.pubsub
  .topic("release-expired-slots")
  .onPublish(async () => {
    const db  = admin.database()
    const now = Date.now()
    let released  = 0
    let processed = 0

    try {
      const snap = await db.ref("plots").get()
      if (!snap.exists()) return { success: true, released: 0 }

      const plots = snap.val()

      for (const [plotId, plotData] of Object.entries(plots)) {
        const slots = plotData.slots || {}
        for (const [slotKey, slot] of Object.entries(slots)) {
          processed++
          if (slot.status !== SLOT_STATUS.HELD || !slot.expiresAt) continue
          if (slot.expiresAt > now) continue

          // Transaction — safe even under concurrent writes
          await db.ref(`plots/${plotId}/slots/${slotKey}`).transaction((cur) => {
            if (!cur || cur.status !== SLOT_STATUS.HELD || cur.expiresAt > now) return
            released++
            return {
              ...cur,
              status:    SLOT_STATUS.AVAILABLE,
              userId:    null,
              expiresAt: null,
              updatedAt: now,
            }
          })
        }
      }

      console.log(`[releaseExpiredSlots] Released ${released}/${processed}`)
      return { success: true, released, processed }
    } catch (err) {
      console.error("[releaseExpiredSlots]", err)
      return { success: false, error: err.message }
    }
  })

// ── HTTP trigger for manual cleanup (admin only) ──────────────────────────────
exports.releaseExpiredSlotsHttp = functions.https.onRequest(async (req, res) => {
  // Verify via secret header in production
  const secret = req.headers["x-admin-secret"]
  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  const db  = admin.database()
  const now = Date.now()
  let released  = 0
  let processed = 0

  const snap = await db.ref("plots").get()
  if (!snap.exists()) return res.json({ success: true, released: 0 })

  const plots = snap.val()
  for (const [plotId, plotData] of Object.entries(plots)) {
    const slots = plotData.slots || {}
    for (const [slotKey, slot] of Object.entries(slots)) {
      processed++
      if (slot.status !== SLOT_STATUS.HELD || !slot.expiresAt || slot.expiresAt > now) continue

      await db.ref(`plots/${plotId}/slots/${slotKey}`).transaction((cur) => {
        if (!cur || cur.status !== SLOT_STATUS.HELD || cur.expiresAt > now) return
        released++
        return { ...cur, status: SLOT_STATUS.AVAILABLE, userId: null, expiresAt: null, updatedAt: now }
      })
    }
  }

  res.json({ success: true, released, processed })
})