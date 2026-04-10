/**
 * PARKING SLOT SELECTION SYSTEM - PRODUCTION SETUP GUIDE
 *
 * This guide covers the complete setup for a real-time parking slot selection
 * system similar to BookMyShow seat selection, built with Next.js and Firebase
 * Realtime Database.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 1: FIREBASE REALTIME DATABASE SETUP
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Step 1.1: Configure Firebase Realtime Database Rules
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. Go to Firebase Console → Your Project
 * 2. Navigate to Realtime Database → Rules tab
 * 3. Replace existing rules with rules from firebase-realtime-db-rules.js
 * 4. Click "Publish"
 *
 * Key permission structure:
 * - slot_availability/{plotId}/{dateKey}/{slotKey}
 * - Users can READ if authenticated (auth != null)
 * - Users can WRITE if authenticated (handled via transactions)
 * - Validation enforces required fields and valid status values
 */

// Step 1.2: Ensure databaseURL in Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID",
  // ✅ CRITICAL: Must include databaseURL for Realtime Database
  databaseURL: "https://YOUR_PROJECT_ID.firebaseio.com",
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 2: CODE INTEGRATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * The system consists of these files:
 *
 * 1. lib/firebase/slot-service.js (NEW)
 *    - Core business logic
 *    - initializeSlots()
 *    - holdSlot(), releaseSlot()
 *    - confirmBooking()
 *    - releaseExpiredHolds()
 *    - listenToSlots()
 *    - Utility functions
 *
 * 2. lib/hooks/useSlotAvailability.js (UPDATED)
 *    - React hook wrapper
 *    - Real-time listener with cleanup
 *    - Transaction-based concurrency control
 *    - Auto-expiry client-side cleanup
 *
 * 3. components/slots/SlotSelectionPanel.jsx (EXISTING)
 *    - UI component for slot selection
 *    - Uses useSlotAvailability hook
 *    - Handles user interactions
 *
 * 4. components/slots/SlotGrid.jsx (EXISTING)
 *    - Grid visualization
 *    - Status color coding
 *    - Animation effects
 *
 * 5. functions/src/releaseExpiredSlots.js (NEW)
 *    - Cloud Function for server-side cleanup
 *    - Triggered via Pub/Sub scheduler
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 3: USAGE EXAMPLES
// ═══════════════════════════════════════════════════════════════════════════════

// Example 1: Basic slot selection in a component
import { useSlotAvailability } from "@/lib/hooks/useSlotAvailability"

export function BookingPage() {
  const { slots, holdSlot, releaseSlot, confirmBooking, stats } =
    useSlotAvailability({
      plotId: "plot_123",
      date: new Date(),
      totalSlots: 20,
      userId: currentUser.uid,
    })

  const handleSelectSlot = async (slotKey) => {
    const result = await holdSlot(slotKey)
    if (result.success) {
      console.log("Slot held successfully!")
    } else {
      console.error("Failed to hold slot:", result.error)
    }
  }

  return (
    <div>
      <p>Available: {stats.available} / {stats.total}</p>
      {/* Render slot grid */}
    </div>
  )
}

// Example 2: Direct Firebase service functions
import {
  initializeSlots,
  holdSlot,
  confirmBooking,
} from "@/lib/firebase/slot-service"

async function bookingFlow(db, plotId, dateKey, slotKey, userId) {
  // 1. Initialize slots (first time only)
  await initializeSlots(db, plotId, dateKey, 20)

  // 2. Hold a slot
  const holdResult = await holdSlot(db, plotId, dateKey, slotKey, userId)
  if (!holdResult.success) {
    console.error("Can't hold slot:", holdResult.error)
    return
  }

  // 3. After payment succeeds, confirm booking
  const confirmResult = await confirmBooking(
    db,
    plotId,
    dateKey,
    slotKey,
    userId,
    "booking_id_from_firestore"
  )
  if (confirmResult.success) {
    console.log("Booking confirmed!")
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 4: DATABASE STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Realtime Database structure:
 *
 * {
 *   "slot_availability": {
 *     "plot_123": {
 *       "2026-04-10": {
 *         "slot_001": {
 *           "status": "available",
 *           "heldBy": null,
 *           "heldAt": null,
 *           "bookedBy": null,
 *           "bookedAt": null,
 *           "bookingId": null,
 *           "slotNumber": 1,
 *           "floor": "Ground",
 *           "type": "standard",
 *           "createdAt": 1712769600000,
 *           "updatedAt": 1712769600000
 *         },
 *         "slot_002": {
 *           "status": "held",
 *           "heldBy": "user_456",
 *           "heldAt": 1712769660000,  // Expires at heldAt + 600000 (10 min)
 *           ...
 *         },
 *         "slot_003": {
 *           "status": "booked",
 *           "bookedBy": "user_789",
 *           "bookedAt": 1712769720000,
 *           "bookingId": "booking_abc123",
 *           ...
 *         }
 *       }
 *     }
 *   },
 *   "userPresence": { ... },
 *   "notifications": { ... },
 *   "user_bookings": { ... }
 * }
 *
 * Key Design Decisions:
 * ─────────────────────
 * 1. Flat structure (not nested objects)
 *    - Efficient real-time updates
 *    - Minimal download sizes
 *    - Easy pagination if needed
 *
 * 2. Date-based partitioning
 *    - Scales to multiple dates
 *    - Each date has independent listener
 *    - Can expire old dates
 *
 * 3. Hold expiry timestamps
 *    - Server-side Cloud Function cleans up
 *    - Client-side cleanup as fallback
 *    - Bidirectional defense
 *
 * 4. Slot metadata (type, floor)
 *    - Enables filtering & grouping
 *    - Used for pricing calculations
 *    - Displayed in UI
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 5: TRANSACTIONS & CONCURRENCY
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * All slot operations use Firebase transactions to prevent race conditions:
 *
 * holdSlot() transaction:
 * ─ Checks if slot is available
 * ─ Rejects if already booked or maintenance
 * ─ Rejects if held by another user (not expired)
 * ─ Allows re-holding own slot (refreshes TTL)
 * ─ Atomically updates status, heldBy, heldAt
 *
 * confirmBooking() transaction:
 * ─ Verifies slot is held by this user
 * ─ Rejects if status changed
 * ─ Atomically transitions held → booked
 * ─ Saves booking reference
 *
 * releaseSlot() transaction:
 * ─ Verifies user is the holder
 * ─ Atomically resets to available
 *
 * This design ensures:
 * ✓ No double-booking even with simultaneous requests
 * ✓ Automatic conflict resolution
 * ✓ Predictable state transitions
 * ✓ Minimal network round-trips
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 6: AUTO-EXPIRY SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Hold expiry is handled at TWO levels:
 *
 * 1. CLIENT-SIDE (frontend)
 *    ─ useSlotAvailability hook cleans expired holds when listening
 *    ─ Local setTimeout auto-releases after 10 minutes
 *    ─ Immediate UX feedback
 *    ─ Lightweight cleanup
 *
 * 2. SERVER-SIDE (Cloud Function)
 *    ─ releaseExpiredSlots triggered via Pub/Sub scheduler
 *    ─ Runs every 1 minute
 *    ─ Ensures no holds leak indefinitely
 *    ─ Handles offline clients
 *
 * Setup Cloud Function:
 * ──────────────────────
 * 1. Deploy the function:
 *    firebase deploy --only functions:releaseExpiredSlots
 *
 * 2. Create Cloud Scheduler job:
 *    - Name: "release-expired-slots"
 *    - Frequency: "*/1 * * * *" (every 1 minute)
 *    - Timezone: UTC
 *    - Pub/Sub topic: "release-expired-slots"
 *    - Service account: Default
 *
 * 3. Verify in Firebase Console:
 *    - Functions → releaseExpiredSlots (should show invocations)
 *    - Cloud Scheduler → Verify job is created
 *
 * Testing:
 * ────────
 * // Call manually from client (admin only):
 * const cleanup = firebase.functions().httpsCallable('releaseExpiredSlotsManual')
 * const result = await cleanup()
 * console.log(result.data) // { released: N, processed: N }
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 7: PERFORMANCE OPTIMIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * 1. Listener Performance
 *    - Subscribe only to one date at a time
 *    - Unsubscribe when component unmounts
 *    - Use .indexOn for faster queries (configured in rules)
 *
 * 2. Slot Initialization
 *    - Uses transaction to prevent double-seeding
 *    - First access lazily initializes slots
 *    - No repeated queries for existing dates
 *
 * 3. Network Optimization
 *    - Real-time updates (not polling)
 *    - Delta updates (only changed fields)
 *    - Client-side filtering & sorting
 *    - Connection handling built-in
 *
 * 4. Memory Management
 *    - Refs cleaned up on unmount
 *    - Timers cleared
 *    - Listeners unsubscribed
 *    - No memory leaks
 *
 * 5. Scaling Considerations
 *    - 100+ slots per date: No issues
 *    - 1000+ concurrent users: Monitor function costs
 *    - 10,000+ slots total: Consider partitioning by time windows
 *    - Archive old dates: Move to Firestore history
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 8: EDGE CASES & HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Edge Case 1: Two users click same slot simultaneously
 * ─ Transaction ensures only one succeeds
 * ─ Other user receives "Slot unavailable" error
 * ─ Both receive real-time update of final state
 *
 * Edge Case 2: User goes offline during hold
 * ─ Timer still runs (expires after 10 min)
 * ─ Server-side function releases hold
 * ─ When user comes back online, they see slot available
 *
 * Edge Case 3: Payment succeeds but connection drops
 * ─ confirmBooking() will retry on reconnection
 * ─ Transaction prevents double-booking
 * ─ Booking is atomic once confirmed
 *
 * Edge Case 4: Page refresh during hold
 * ─ useSlotAvailability re-initializes
 * ─ Listener reconnects immediately
 * ─ Real-time state syncs from server
 * ─ Can re-hold same slot if not taken
 *
 * Edge Case 5: Firebase service degradation
 * ─ Error state propagates to UI
 * ─ User sees "Slots unavailable" message
 * ─ Graceful fallback (no crash)
 * ─ Retry logic built into SDK
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 9: MONITORING & DEBUGGING
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Enable Debug Logging
 * ────────────────────
 * firebase.database.enableLogging(true)
 *
 * Monitor in Firebase Console
 * ────────────────────────────
 * - Realtime Database → Data tab: View slot states
 * - Functions → releaseExpiredSlots: Check invocation logs
 * - Monitoring → Database: Track read/write operations
 *
 * Common Issues
 * ─────────────
 * 1. "permission_denied" error
 *    → Check Firebase rules are published
 *    → Verify databaseURL in config
 *    → Ensure user is authenticated
 *
 * 2. Slot holds not expiring
 *    → Cloud Function not running?
 *    → Check Cloud Scheduler job
 *    → Check function logs for errors
 *
 * 3. Slots not updating in real-time
 *    → Is listener subscribed?
 *    → Check network connection
 *    → Verify .read permission in rules
 *
 * 4. Double booking possible
 *    → Not using transactions?
 *    → Race condition in logic?
 *    → Check confirmBooking implementation
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 10: COST ESTIMATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Firebase Realtime Database Pricing (as of 2026):
 *
 * READ operations:
 * - 1 million reads: $1
 * - Listener connection: 1 read per second = 2.6M reads/month = $2.60
 * - 100 users watching slots: 100 * $2.60 = $260/month
 *
 * WRITE operations:
 * - 1 million writes: $5
 * - holdSlot: 1 write per hold attempt
 * - confirmBooking: 1 write per booking
 * - releaseSlot: 1 write per release
 * - Auto-expiry: cleanup reads + writes
 *
 * Example for 1000 bookings/day:
 * - 1000 holds * 2 (average) = 2000 writes/day = 60K writes/month
 * - 60K * $5/million = $0.30
 * - Listeners: $260/month
 * - Total: ~$260/month (minimal transaction cost)
 *
 * Storage:
 * - Each slot: ~300 bytes
 * - 1000 plots * 365 days * 20 slots * 300 bytes = 2.2 GB
 * - First 1GB free, then $5/GB = $6.50/month + $1 free = $5/month
 *
 * Functions (auto-expiry):
 * - 1440 invocations/day (every minute)
 * - ~100ms runtime = 144 seconds/day
 * - 432K GB-seconds/month = Free (first 2M GB-sec)
 *
 * TOTAL ESTIMATED MONTHLY COST: ~$265
 * (Scales linearly with concurrent users)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PART 11: PRODUCTION CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

const PRODUCTION_CHECKLIST = {
  database: [
    "✓ Firebase Realtime Database enabled",
    "✓ databaseURL configured in Firebase config",
    "✓ Rules published to Firebase Console",
    "✓ .indexOn fields configured for queries",
    "✓ Backup enabled in Firebase Console",
  ],
  functions: [
    "✓ releaseExpiredSlots function deployed",
    "✓ Cloud Scheduler job created (every 1 minute)",
    "✓ Pub/Sub topic 'release-expired-slots' created",
    "✓ Function has necessary permissions",
    "✓ Function logs configured in Cloud Logging",
  ],
  frontend: [
    "✓ slot-service.js imported correctly",
    "✓ useSlotAvailability hook tested",
    "✓ SlotSelectionPanel component integrated",
    "✓ Error states handled gracefully",
    "✓ Network retry logic verified",
  ],
  testing: [
    "✓ Hold/release/confirm transactions tested with simultaneous requests",
    "✓ Expiry logic verified (manual and automatic)",
    "✓ Page refresh during hold tested",
    "✓ Offline → online reconnection tested",
    "✓ Firebase permission denied errors handled",
  ],
  monitoring: [
    "✓ Cloud Logging configured for functions",
    "✓ Firebase Monitoring dashboard set up",
    "✓ Alerts configured for error rates",
    "✓ Cost monitoring enabled",
    "✓ Daily audit of slot database integrity",
  ],
}

// ═══════════════════════════════════════════════════════════════════════════════
// PART 12: FUTURE ENHANCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * 1. Analytics
 *    - Track popular slots and times
 *    - Peak usage patterns
 *    - Conversion funnel (hold → booking)
 *
 * 2. Dynamic pricing
 *    - Premium rates for peak hours
 *    - Discounts for off-peak slots
 *    - Surge pricing logic
 *
 * 3. Slot recommendations
 *    - ML-based suggestions based on user preferences
 *    - Similar slots when preferred slot unavailable
 *    - Availability notifications
 *
 * 4. Advanced filtering
 *    - Filter by slot type (EV, accessible, compact)
 *    - Filter by floor/zone
 *    - Sort by price, type, availability
 *
 * 5. Multi-day bookings
 *    - Reserve slots across multiple dates
 *    - Monthly pass subscriptions
 *    - Recurring bookings
 */

module.exports = {
  PRODUCTION_CHECKLIST,
}
