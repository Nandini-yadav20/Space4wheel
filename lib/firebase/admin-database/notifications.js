import { getAdminFirestore } from "../firebase-admin"

const notificationsCollection = "notifications"

/**
 * Create a new notification
 * @param {object} notificationData - Notification data
 * @returns {Promise<object>} Created notification data with ID
 */
export const createNotification = async (notificationData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const newNotification = {
      ...notificationData,
      read: false,
      createdAt: new Date(),
    }

    const docRef = await db.collection(notificationsCollection).add(newNotification)
    console.log("Notification created with ID:", docRef.id)

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newNotification,
      },
    }
  } catch (error) {
    console.error("Error creating notification:", error)
    return { success: false, error: error.message || "Failed to create notification" }
  }
}

/**
 * Get notifications by user ID
 * @param {string} userId - User ID
 * @param {number} limitCount - Maximum number of notifications to retrieve
 * @returns {Promise<Array>} Array of notifications
 */
export const getNotificationsByUserId = async (userId, limitCount = 20) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const notificationsRef = db
      .collection(notificationsCollection)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .limit(limitCount)

    const snapshot = await notificationsRef.get()

    const notifications = []
    snapshot.forEach((doc) => {
      notifications.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: notifications }
  } catch (error) {
    console.error("Error getting notifications:", error)
    return { success: false, error: error.message || "Failed to get notifications" }
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - Notification ID
 * @returns {Promise<object>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const notificationRef = db.collection(notificationsCollection).doc(notificationId)

    await notificationRef.update({
      read: true,
    })

    return { success: true }
  } catch (error) {
    console.error("Error marking notification as read:", error)
    return { success: false, error: error.message || "Failed to mark notification as read" }
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - User ID
 * @returns {Promise<object>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const notificationsRef = db
      .collection(notificationsCollection)
      .where("userId", "==", userId)
      .where("read", "==", false)

    const snapshot = await notificationsRef.get()

    // Use a batch write for better performance
    const batch = db.batch()
    snapshot.forEach((doc) => {
      const notificationRef = doc.ref
      batch.update(notificationRef, { read: true })
    })

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error("Error marking all notifications as read:", error)
    return { success: false, error: error.message || "Failed to mark all notifications as read" }
  }
}
