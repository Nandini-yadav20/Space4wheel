import { getAdminAuth } from "../firebase-admin"

/**
 * Create a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} userData - Additional user data
 * @returns {Promise<object>}
 */
export const createUser = async (email, password, userData = {}) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: userData.name,
      disabled: false,
    })

    return {
      success: true,
      data: userRecord,
    }
  } catch (error) {
    console.error("Error creating user with Admin SDK:", error)
    return { success: false, error: error.message || "Failed to create user" }
  }
}

/**
 * Get user by ID
 * @param {string} uid - User ID
 * @returns {Promise<object>}
 */
export const getUserById = async (uid) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const userRecord = await auth.getUser(uid)

    return {
      success: true,
      data: userRecord,
    }
  } catch (error) {
    console.error("Error getting user with Admin SDK:", error)
    return { success: false, error: error.message || "Failed to get user" }
  }
}

/**
 * Update user
 * @param {string} uid - User ID
 * @param {object} userData - User data to update
 * @returns {Promise<object>}
 */
export const updateUser = async (uid, userData) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const updateData = {}
    if (userData.email) updateData.email = userData.email
    if (userData.name) updateData.displayName = userData.name
    if (userData.phoneNumber) updateData.phoneNumber = userData.phoneNumber
    if (userData.photoURL) updateData.photoURL = userData.photoURL
    if (userData.disabled !== undefined) updateData.disabled = userData.disabled

    const userRecord = await auth.updateUser(uid, updateData)

    return {
      success: true,
      data: userRecord,
    }
  } catch (error) {
    console.error("Error updating user with Admin SDK:", error)
    return { success: false, error: error.message || "Failed to update user" }
  }
}

/**
 * Delete user
 * @param {string} uid - User ID
 * @returns {Promise<object>}
 */
export const deleteUser = async (uid) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    await auth.deleteUser(uid)

    return { success: true }
  } catch (error) {
    console.error("Error deleting user with Admin SDK:", error)
    return { success: false, error: error.message || "Failed to delete user" }
  }
}

/**
 * Create a custom token for a user
 * @param {string} uid - User ID
 * @param {object} claims - Custom claims
 * @returns {Promise<object>}
 */
export const createCustomToken = async (uid, claims = {}) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const token = await auth.createCustomToken(uid, claims)

    return {
      success: true,
      data: { token },
    }
  } catch (error) {
    console.error("Error creating custom token:", error)
    return { success: false, error: error.message || "Failed to create custom token" }
  }
}

/**
 * Verify ID token
 * @param {string} idToken - ID token to verify
 * @returns {Promise<object>}
 */
export const verifyIdToken = async (idToken) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const decodedToken = await auth.verifyIdToken(idToken)

    return {
      success: true,
      data: decodedToken,
    }
  } catch (error) {
    console.error("Error verifying ID token:", error)
    return { success: false, error: error.message || "Failed to verify ID token" }
  }
}

/**
 * Create session cookie
 * @param {string} idToken - ID token
 * @param {object} options - Cookie options
 * @returns {Promise<object>}
 */
export const createSessionCookie = async (idToken, options = { expiresIn: 60 * 60 * 24 * 5 * 1000 }) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const sessionCookie = await auth.createSessionCookie(idToken, options)

    return {
      success: true,
      data: { sessionCookie },
    }
  } catch (error) {
    console.error("Error creating session cookie:", error)
    return { success: false, error: error.message || "Failed to create session cookie" }
  }
}

/**
 * Verify session cookie
 * @param {string} sessionCookie - Session cookie to verify
 * @returns {Promise<object>}
 */
export const verifySessionCookie = async (sessionCookie) => {
  try {
    const auth = getAdminAuth()

    if (!auth) {
      throw new Error("Auth instance is undefined")
    }

    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true)

    return {
      success: true,
      data: decodedClaims,
    }
  } catch (error) {
    console.error("Error verifying session cookie:", error)
    return { success: false, error: error.message || "Failed to verify session cookie" }
  }
}
