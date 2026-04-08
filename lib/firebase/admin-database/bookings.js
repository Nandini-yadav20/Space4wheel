import { getAdminFirestore } from "../firebase-admin"
import { FieldValue } from "firebase-admin/firestore"

const bookingsCollection = "bookings"

/**
 * Create a new booking
 * @param {object} bookingData - Booking data
 * @returns {Promise<object>} Created booking data with ID
 */
export const createBooking = async (bookingData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const newBooking = {
      ...bookingData,
      status: "pending",
      paymentStatus: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await db.collection(bookingsCollection).add(newBooking)
    console.log("Booking created with ID:", docRef.id)

    // Update plot availability (decrease available slots)
    // This should be done in a transaction in a production app
    if (bookingData.plotId) {
      try {
        const plotRef = db.collection("plots").doc(bookingData.plotId)
        await plotRef.update({
          availableSlots: FieldValue.increment(-1),
          updatedAt: new Date(),
        })
      } catch (plotError) {
        console.error("Error updating plot availability:", plotError)
        // We don't want to fail the booking creation if this fails
      }
    }

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newBooking,
      },
    }
  } catch (error) {
    console.error("Error creating booking:", error)
    return { success: false, error: error.message || "Failed to create booking" }
  }
}

/**
 * Get booking by ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<object|null>} Booking data or null if not found
 */
export const getBookingById = async (bookingId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingRef = db.collection(bookingsCollection).doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (bookingSnap.exists) {
      return {
        success: true,
        data: {
          id: bookingSnap.id,
          ...bookingSnap.data(),
        },
      }
    } else {
      return { success: false, error: "Booking not found" }
    }
  } catch (error) {
    console.error("Error getting booking:", error)
    return { success: false, error: error.message || "Failed to get booking" }
  }
}

/**
 * Update booking status
 * @param {string} bookingId - Booking ID
 * @param {string} status - New status
 * @returns {Promise<object>}
 */
export const updateBookingStatus = async (bookingId, status) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingRef = db.collection(bookingsCollection).doc(bookingId)
    const bookingSnap = await bookingRef.get()

    if (!bookingSnap.exists) {
      return { success: false, error: "Booking not found" }
    }

    const bookingData = bookingSnap.data()
    const oldStatus = bookingData.status

    await bookingRef.update({
      status,
      updatedAt: new Date(),
    })

    // If cancelling a booking, increase available slots
    if (oldStatus !== "cancelled" && status === "cancelled" && bookingData.plotId) {
      try {
        const plotRef = db.collection("plots").doc(bookingData.plotId)
        await plotRef.update({
          availableSlots: FieldValue.increment(1),
          updatedAt: new Date(),
        })
      } catch (plotError) {
        console.error("Error updating plot availability:", plotError)
        // We don't want to fail the status update if this fails
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error updating booking status:", error)
    return { success: false, error: error.message || "Failed to update booking status" }
  }
}

/**
 * Update booking payment status
 * @param {string} bookingId - Booking ID
 * @param {string} paymentStatus - New payment status
 * @param {string} paymentMethod - Payment method
 * @param {string} paymentId - Payment ID
 * @returns {Promise<object>}
 */
export const updateBookingPayment = async (bookingId, paymentStatus, paymentMethod, paymentId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingRef = db.collection(bookingsCollection).doc(bookingId)

    await bookingRef.update({
      paymentStatus,
      paymentMethod,
      paymentId,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating booking payment:", error)
    return { success: false, error: error.message || "Failed to update booking payment" }
  }
}

/**
 * Get bookings by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of bookings
 */
export const getBookingsByUserId = async (userId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingsRef = db.collection(bookingsCollection).where("userId", "==", userId)
    const snapshot = await bookingsRef.get()

    const bookings = []
    snapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error("Error getting bookings by user:", error)
    return { success: false, error: error.message || "Failed to get bookings by user" }
  }
}

/**
 * Get bookings by plot ID
 * @param {string} plotId - Plot ID
 * @returns {Promise<Array>} Array of bookings
 */
export const getBookingsByPlotId = async (plotId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingsRef = db.collection(bookingsCollection).where("plotId", "==", plotId)
    const snapshot = await bookingsRef.get()

    const bookings = []
    snapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error("Error getting bookings by plot:", error)
    return { success: false, error: error.message || "Failed to get bookings by plot" }
  }
}

/**
 * Get upcoming bookings by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of upcoming bookings
 */
export const getUpcomingBookingsByUserId = async (userId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const today = new Date().toISOString().split("T")[0] // YYYY-MM-DD

    const bookingsRef = db
      .collection(bookingsCollection)
      .where("userId", "==", userId)
      .where("date", ">=", today)
      .where("status", "==", "confirmed")

    const snapshot = await bookingsRef.get()

    const bookings = []
    snapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    // Sort by date and time
    bookings.sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date)
      }
      return a.startTime.localeCompare(b.startTime)
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error("Error getting upcoming bookings:", error)
    return { success: false, error: error.message || "Failed to get upcoming bookings" }
  }
}


/**
 * Get all bookings
 * @returns {Promise<Array>} Array of all bookings
 */
export const getAllBookings = async () => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const bookingsRef = db.collection(bookingsCollection)
    const snapshot = await bookingsRef.get()

    const bookings = []
    snapshot.forEach((doc) => {
      bookings.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: bookings }
  } catch (error) {
    console.error("Error getting all bookings:", error)
    return { success: false, error: error.message || "Failed to get all bookings" }
  }
}
