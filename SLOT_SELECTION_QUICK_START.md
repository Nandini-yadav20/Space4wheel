/**
 * QUICK START GUIDE - Parking Slot Selection System
 *
 * This is a step-by-step guide to integrate the real-time parking slot
 * selection system into your Next.js app.
 *
 * Total setup time: ~20 minutes
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1: VERIFY FIREBASE CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// File: lib/firebase/firebase-config.js or similar
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // ✅ CRITICAL: Add this for Realtime Database
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
}

// ⚠️  If databaseURL is missing:
// 1. Go to Firebase Console → Project Settings → Realtime Database
// 2. Copy the URL (format: https://PROJECT_ID.firebaseio.com)
// 3. Add to .env.local: NEXT_PUBLIC_FIREBASE_DATABASE_URL=...
// 4. Restart dev server

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2: INITIALIZE FIREBASE REALTIME DATABASE
// ═══════════════════════════════════════════════════════════════════════════════

// File: lib/firebase/firebase-provider.jsx
import { useContext, createContext } from "react"
import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database" // ← ADD THIS
import { getFirestore } from "firebase/firestore"

const FirebaseContext = createContext(null)

export function FirebaseProvider({ children }) {
  const firebaseApp = initializeApp(firebaseConfig)
  const auth = getAuth(firebaseApp)
  const db = getDatabase(firebaseApp) // ← ADD THIS
  const firestore = getFirestore(firebaseApp)

  const value = {
    firebaseApp,
    auth,
    db, // ← ADD THIS
    firestore,
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  )
}

export function useFirebase() {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error(
      "useFirebase must be used within FirebaseProvider"
    )
  }
  return context // Returns { firebaseApp, auth, db, firestore }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3: UPDATE FIREBASE REALTIME DATABASE RULES
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Go to Firebase Console
// 2. Select your project
// 3. Realtime Database → Rules tab
// 4. Replace all rules with content from firebase-realtime-db-rules.js
// 5. Click "Publish"

// Paste this rule structure:
const FIREBASE_RULES = {
  rules: {
    slot_availability: {
      ".read": "auth != null",
      "$plotId": {
        ".read": "auth != null",
        ".write": false,
        "$dateKey": {
          ".read": "auth != null",
          ".write": false,
          "$slotKey": {
            ".read": "auth != null",
            ".write": "auth != null",
            ".validate":
              "newData.hasChildren(['status', 'slotNumber']) &&" +
              "newData.child('status').val().matches(/^(available|held|booked|maintenance)$/) &&" +
              "newData.child('slotNumber').isNumber()",
            // ... rest of validation
          },
        },
      },
    },
    // ... other rules
  },
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4: DEPLOY CLOUD FUNCTION (Optional but Recommended)
// ═══════════════════════════════════════════════════════════════════════════════

// 1. Copy functions/src/releaseExpiredSlots.js to your Firebase Functions folder
// 2. Ensure firebase-admin is in functions/package.json
// 3. Deploy: firebase deploy --only functions:releaseExpiredSlots

// 4. Create Cloud Scheduler job:
//    a. Go to Cloud Console → Cloud Scheduler
//    b. Create Job
//       - Name: release-expired-slots
//       - Frequency: */1 * * * * (every minute)
//       - Timezone: UTC
//       - Pub/Sub topic: release-expired-slots
//       - Service account: Default
//    c. Click Create

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5: USE IN YOUR BOOKING COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

// Example: app/dashboard/bookings/BookingFlow.jsx

import { useState } from "react"
import { useAuthContext } from "@/lib/firebase/auth-context"
import { SlotSelectionPanel } from "@/components/slots/SlotSelectionPanel"
import { useSlotAvailability } from "@/lib/hooks/useSlotAvailability"

export function BookingFlow({ plot, selectedDate, duration, onBookingComplete }) {
  const { user } = useAuthContext()
  const [bookingData, setBookingData] = useState(null)

  // Handle slot selection
  const handleSlotSelected = (data) => {
    // data = {
    //   slotKey: "slot_001",
    //   slot: { status, slotNumber, type, ... },
    //   totalPrice: 500,
    //   pricePerHour: 100,
    //   confirmBooking: async (bookingId) => { ... }
    // }
    setBookingData(data)
    // Proceed to payment
  }

  return (
    <div className="space-y-6">
      {/* Slot Selection */}
      <SlotSelectionPanel
        plot={plot}
        bookingDate={selectedDate}
        duration={duration}
        userId={user?.uid}
        onProceed={handleSlotSelected}
      />

      {/* Payment & Confirmation */}
      {bookingData && (
        <PaymentForm
          bookingData={bookingData}
          onSuccess={async (bookingId) => {
            // Confirm booking after payment
            const result = await bookingData.confirmBooking(bookingId)
            if (result.success) {
              onBookingComplete(bookingId)
            }
          }}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6: TESTING THE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Test 1: Basic Slot Selection
 * ────────────────────────────
 * 1. Navigate to booking page
 * 2. Select a date and plot
 * 3. Click an available slot
 * 4. Verify:
 *    ✓ Slot turns yellow (held)
 *    ✓ Timer shows 10:00
 *    ✓ Summary card appears
 *    ✓ Price calculated correctly
 *
 * Test 2: Real-Time Updates
 * ──────────────────────────
 * 1. Open booking page in 2 browser tabs
 * 2. Hold a slot in tab 1
 * 3. Verify tab 2 shows it as held (within 1 second)
 * 4. Try to hold same slot in tab 2
 * 5. Verify error message appears
 *
 * Test 3: Hold Expiry
 * ──────────────────
 * 1. Hold a slot
 * 2. Wait 10 minutes (or check Firebase Realtime for quick test)
 * 3. Verify it automatically releases
 * 4. Slot becomes available again
 *
 * Test 4: Page Refresh During Hold
 * ─────────────────────────────────
 * 1. Hold a slot
 * 2. Refresh page (Cmd/Ctrl + R)
 * 3. Verify slot still shows as held
 * 4. Timer continues counting
 * 5. Original hold still valid
 *
 * Test 5: Concurrent Booking
 * ────────────────────────────
 * 1. Open booking in 2 tabs
 * 2. Both users hold same slot
 * 3. One receives error: "Slot is no longer available"
 * 4. Other user can proceed
 * 5. Verify no double-booking
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7: TROUBLESHOOTING
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Issue: "permission_denied" error in console
 * ────────────────────────────────────────────
 * Solutions:
 * 1. Check Firebase rules are published: Console → Realtime Database → Rules
 * 2. Verify databaseURL in .env.local
 * 3. Restart dev server: npm run dev
 * 4. Clear browser cache: Cmd/Ctrl + Shift + Delete
 * 5. Check user is authenticated: console.log(user)
 *
 * Issue: Slots not loading / spinner never stops
 * ───────────────────────────────────────────────
 * Solutions:
 * 1. Check browser Network tab for RTDB connection
 * 2. Verify Firebase project ID matches config
 * 3. Check browser console for JS errors
 * 4. Test connection: firebase.app().database().ref('.info/connected')
 *
 * Issue: Hold timer not counting down
 * ─────────────────────────────────────
 * Solutions:
 * 1. Check browser console for errors
 * 2. Verify slot.heldAt timestamp exists
 * 3. Check system clock is correct
 * 4. Look for browser console errors
 *
 * Issue: Slot held by another user but not releasing after 10 min
 * ────────────────────────────────────────────────────────────────
 * Solutions:
 * 1. Manually trigger cleanup: Call releaseExpiredSlotsManual()
 * 2. Check Cloud Scheduler job is running:
 *    Console → Cloud Scheduler → release-expired-slots
 * 3. Check function logs for errors: Console → Functions → Logs
 * 4. Verify Pub/Sub topic exists: Console → Cloud Scheduler
 * 5. Check function deployment: firebase deploy --only functions
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 8: API REFERENCE
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Hook: useSlotAvailability(options)
 * ──────────────────────────────────────
 * Options:
 *   plotId (string) - Plot ID
 *   date (Date) - Booking date
 *   totalSlots (number) - Number of slots (default: 20)
 *   userId (string) - Current user ID
 *
 * Returns:
 *   slots (object) - { slotKey: { status, heldBy, ... } }
 *   loading (boolean)
 *   error (string|null)
 *   selectedSlotKey (string|null)
 *   stats (object) - { total, available, held, booked, maintenance }
 *   holdSlot(slotKey) - Promise<{ success, error? }>
 *   releaseSlot(slotKey) - Promise<void>
 *   confirmBooking(slotKey, bookingId) - Promise<{ success, error? }>
 *   setSelectedSlotKey(slotKey)
 *   getHoldRemainingMS(slotKey) - number
 *
 * Service Functions (from slot-service.js)
 * ──────────────────────────────────────────
 * initializeSlots(db, plotId, dateKey, totalSlots)
 * holdSlot(db, plotId, dateKey, slotKey, userId)
 * releaseSlot(db, plotId, dateKey, slotKey, userId)
 * confirmBooking(db, plotId, dateKey, slotKey, userId, bookingId)
 * releaseExpiredHolds(db, plotId, dateKey)
 * listenToSlots(db, plotId, dateKey, userId, onUpdate, onError)
 * getSlotStats(db, plotId, dateKey)
 * getSlot(db, plotId, dateKey, slotKey)
 * formatDateKey(date)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 9: ENVIRONMENT VARIABLES
// ═══════════════════════════════════════════════════════════════════════════════

// File: .env.local (add these lines)
/*
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
NEXT_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
*/

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 10: MONITORING & METRICS
// ═══════════════════════════════════════════════════════════════════════════════

// Monitor these metrics in Firebase Console:

// 1. Database Operations
//    → Realtime Database → Monitoring
//    → Track Read/Write operations, bandwidth

// 2. Function Invocations
//    → Cloud Functions → releaseExpiredSlots
//    → Monitor execution time, errors

// 3. Performance
//    → Real-time listener latency
//    → Transaction confirmation time
//    → Hold release latency

// Example logging in your app:
function trackSlotOperation(operation, duration, success) {
  const event = {
    operation, // "hold", "release", "confirm"
    duration, // milliseconds
    success, // boolean
    timestamp: new Date(),
    userId: currentUser.uid,
    plotId, // optional
  }

  // Send to analytics service:
  // analytics.logEvent('slot_operation', event)
  console.log("[Slot Operation]", event)
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINAL CHECKLIST
// ═══════════════════════════════════════════════════════════════════════════════

/*
 * Before going to production, verify:
 *
 * ✓ databaseURL in Firebase config
 * ✓ Firebase Realtime Database rules published
 * ✓ Cloud Function deployed (optional)
 * ✓ Cloud Scheduler job created (if using server cleanup)
 * ✓ Basic slot selection tested in 1 browser
 * ✓ Real-time updates tested in 2 browsers
 * ✓ Hold expiry tested
 * ✓ Concurrent booking tested
 * ✓ Page refresh during hold tested
 * ✓ Payment flow integration tested
 * ✓ Error states handled gracefully
 * ✓ Mobile UI responsive
 * ✓ Performance acceptable (< 100ms updates)
 * ✓ Cost estimation acceptable
 * ✓ Monitoring dashboards set up
 *
 * You're ready to launch! 🚀
 */

export const SETUP_COMPLETE = true
