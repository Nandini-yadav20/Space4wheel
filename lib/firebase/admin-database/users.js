import { getAdminFirestore } from "../firebase-admin"

const usersCollection = "users"

/**
 * Get user by ID
 * @param {string} uid - User ID
 * @returns {Promise<object|null>} User data or null if not found
 */
export const getUserById = async (uid) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const userRef = db.collection(usersCollection).doc(uid)
    const userSnap = await userRef.get()

    if (userSnap.exists) {
      return {
        success: true,
        data: { id: userSnap.id, ...userSnap.data() },
      }
    } else {
      return { success: false, error: "User not found" }
    }
  } catch (error) {
    console.error("Error getting user:", error)
    return { success: false, error: error.message || "Failed to get user" }
  }
}

/**
 * Create a new user in Firestore
 * @param {string} uid - User ID from Firebase Auth
 * @param {object} userData - User data
 * @returns {Promise<object>}
 */
export const createUser = async (uid, userData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const userRef = db.collection(usersCollection).doc(uid)

    await userRef.set({
      uid,
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
      notificationPreferences: {
        email: true,
        push: true,
        sms: false,
      },
    })

    return { success: true }
  } catch (error) {
    console.error("Error creating user:", error)
    return { success: false, error: error.message || "Failed to create user" }
  }
}

/**
 * Update user data
 * @param {string} uid - User ID
 * @param {object} userData - Updated user data
 * @returns {Promise<object>}
 */
export const updateUser = async (uid, userData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const userRef = db.collection(usersCollection).doc(uid)

    await userRef.update({
      ...userData,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating user:", error)
    return { success: false, error: error.message || "Failed to update user" }
  }
}

/**
 * Get users by role
 * @param {string} role - User role ('user' or 'owner')
 * @returns {Promise<Array>} Array of users
 */
export const getUsersByRole = async (role) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const usersRef = db.collection(usersCollection).where("role", "==", role)
    const snapshot = await usersRef.get()

    const users = []
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })

    return { success: true, data: users }
  } catch (error) {
    console.error("Error getting users by role:", error)
    return { success: false, error: error.message || "Failed to get users by role" }
  }
}

/**
 * Delete user
 * @param {string} uid - User ID
 * @returns {Promise<object>}
 */
export const deleteUser = async (uid) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const userRef = db.collection(usersCollection).doc(uid)
    await userRef.delete()

    return { success: true }
  } catch (error) {
    console.error("Error deleting user:", error)
    return { success: false, error: error.message || "Failed to delete user" }
  }
}


/**
 * Get all users
 * @returns {Promise<object>} Array of all user documents
 */
export const getAllUsers = async () => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const snapshot = await db.collection(usersCollection).get()

    const users = []
    snapshot.forEach((doc) => {
      users.push({ id: doc.id, ...doc.data() })
    })

    return { success: true, data: users }
  } catch (error) {
    console.error("Error getting all users:", error)
    return { success: false, error: error.message || "Failed to get all users" }
  }
}
