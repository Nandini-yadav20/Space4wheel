// firebase-rules.js
// Export Firebase Realtime Database rules as a JS object

module.exports = {
  rules: {
    plotAvailability: {
      ".read": true,
      "$plotId": {
        ".write":
          "auth != null && (root.child('plots').child($plotId).child('ownerId').val() === auth.uid || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    userPresence: {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null && auth.uid === $userId"
      }
    },
    notifications: {
      "$userId": {
        ".read": "auth != null && auth.uid === $userId",
        ".write":
          "auth != null && (auth.uid === $userId || root.child('users').child(auth.uid).child('role').val() === 'admin')"
      }
    },
    slot_availability: {
      "$plotId": {
        "$dateKey": {
          "$slotKey": {
            ".read": "auth != null",
            ".write": "auth != null",
            ".validate":
              "newData.hasChildren(['status', 'slotNumber']) && newData.child('status').val().matches(/^(available|held|booked|maintenance)$/) && newData.child('slotNumber').isNumber()",
            heldBy: {
              ".validate":
                "newData.val() === null || newData.val() === auth.uid"
            },
            bookedBy: {
              ".validate":
                "newData.val() === null || newData.val() === auth.uid"
            }
          }
        }
      }
    }
  }
};
