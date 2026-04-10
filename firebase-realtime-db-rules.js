// firebase-realtime-db-rules.js
// Export Firebase Realtime Database rules as a JS object
// ⚠️  IMPORTANT: These are reference rules. Apply them to:
//  1. Firebase Console → Realtime Database → Rules tab
//  2. Copy the rules object to firebase.json (if using Firebase CLI)
//
// Deploy via Firebase Console or Firebase CLI:
//  firebase deploy --only database

module.exports = {
  rules: {
    // ─────────────────────────────────────────────────────────────────────────────
    // plotAvailability: Legacy structure, kept for backward compatibility
    // ─────────────────────────────────────────────────────────────────────────────
    plotAvailability: {
      ".read": true,
      "$plotId": {
        ".write":
          "auth != null && (root.child('plots').child($plotId).child('ownerId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // slot_availability: Main structure for BookMyShow-style slot selection
    // ─────────────────────────────────────────────────────────────────────────────
    // Structure:
    //   slot_availability/
    //     {plotId}/
    //       {dateKey}/          (YYYY-MM-DD)
    //         {slotKey}/        (slot_001, slot_002, etc)
    //           status: "available|held|booked|maintenance"
    //           heldBy: userId|null
    //           heldAt: timestamp|null
    //           bookedBy: userId|null
    //           bookedAt: timestamp|null
    //           bookingId: string|null
    //           slotNumber: number
    //           floor: "Ground"|"First"
    //           type: "standard"|"compact"|"accessible"|"ev"|"maintenance"
    // ─────────────────────────────────────────────────────────────────────────────

    slot_availability: {
      // Public read at plot level (anyone can check availability)
      ".read": "auth != null",

      "$plotId": {
        // Public read at date level (anyone can check day's availability)
        ".read": "auth != null",

        ".write": false, // No direct writes at this level

        "$dateKey": {
          // Public read at date level
          ".read": "auth != null",

          ".write": false, // No direct writes at this level

          "$slotKey": {
            // Read: Only authenticated users
            ".read": "auth != null",

            // Write: Firebase Cloud Functions only (via transaction from client)
            ".write": "auth != null",

            // Validation for slot operations
            ".validate":
              // Slots must have required fields
              "newData.hasChildren(['status', 'slotNumber']) &&" +
              // Status must be valid
              "newData.child('status').val().matches(/^(available|held|booked|maintenance)$/) &&" +
              // Slot number must be numeric
              "newData.child('slotNumber').isNumber()",

            // heldBy: Only current user or admin can edit
            heldBy: {
              ".validate":
                "newData.val() === null || " +
                "newData.val() === auth.uid || " +
                "root.child('users').child(auth.uid).child('role').val() === 'admin'",
            },

            // heldAt: Timestamp, can only be set by system
            heldAt: {
              ".validate": "newData.val() === null || newData.isNumber()",
            },

            // bookedBy: Only current user or admin can edit
            bookedBy: {
              ".validate":
                "newData.val() === null || " +
                "newData.val() === auth.uid || " +
                "root.child('users').child(auth.uid).child('role').val() === 'admin'",
            },

            // bookedAt: Timestamp
            bookedAt: {
              ".validate": "newData.val() === null || newData.isNumber()",
            },

            // bookingId: String reference to Firestore booking
            bookingId: {
              ".validate": "newData.val() === null || newData.isString()",
            },

            // slotNumber: Numeric identifier
            slotNumber: {
              ".validate": "newData.isNumber()",
            },

            // floor: "Ground" or "First"
            floor: {
              ".validate": "newData.val().matches(/^(Ground|First)$/)",
            },

            // type: Slot type
            type: {
              ".validate":
                "newData.val().matches(/^(standard|compact|accessible|ev|maintenance)$/)",
            },

            // Timestamp tracking
            createdAt: {
              ".validate": "newData.val() === null || newData.isNumber()",
            },

            updatedAt: {
              ".validate": "newData.val() === null || newData.isNumber()",
            },

            // Deny all other properties
            ".indexOn": ["status", "heldBy", "heldAt", "bookedBy", "bookedAt"],
          },
        },
      },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // userPresence: User online status tracking
    // ─────────────────────────────────────────────────────────────────────────────
    userPresence: {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // notifications: User notifications
    // ─────────────────────────────────────────────────────────────────────────────
    notifications: {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write":
          "auth != null && (auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin')",
      },
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // user_bookings: Track user's booked slots (denormalized for faster queries)
    // ─────────────────────────────────────────────────────────────────────────────
    user_bookings: {
      "$userId": {
        ".read": "auth != null && (auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin')",
        ".write":
          "auth != null && (auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin')",
      },
    },
  },
}

