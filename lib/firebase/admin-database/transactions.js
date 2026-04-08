import { getAdminFirestore } from "../firebase-admin"
import { updateBookingPayment } from "./bookings"

const transactionsCollection = "transactions"

/**
 * Create a new transaction
 * @param {object} transactionData - Transaction data
 * @returns {Promise<object>} Created transaction data with ID
 */
export const createTransaction = async (transactionData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const newTransaction = {
      ...transactionData,
      createdAt: new Date(),
    }

    const docRef = await db.collection(transactionsCollection).add(newTransaction)
    console.log("Transaction created with ID:", docRef.id)

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newTransaction,
      },
    }
  } catch (error) {
    console.error("Error creating transaction:", error)
    return { success: false, error: error.message || "Failed to create transaction" }
  }
}

/**
 * Update transaction status
 * @param {string} transactionId - Transaction ID
 * @param {string} status - New status
 * @returns {Promise<object>}
 */
export const updateTransactionStatus = async (transactionId, status) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const transactionRef = db.collection(transactionsCollection).doc(transactionId)

    await transactionRef.update({
      status,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating transaction status:", error)
    return { success: false, error: error.message || "Failed to update transaction status" }
  }
}

/**
 * Get transactions by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of transactions
 */
export const getTransactionsByUserId = async (userId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const transactionsRef = db
      .collection(transactionsCollection)
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")

    const snapshot = await transactionsRef.get()

    const transactions = []
    snapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: transactions }
  } catch (error) {
    console.error("Error getting transactions by user:", error)
    return { success: false, error: error.message || "Failed to get transactions by user" }
  }
}

/**
 * Get transactions by booking ID
 * @param {string} bookingId - Booking ID
 * @returns {Promise<Array>} Array of transactions
 */
export const getTransactionsByBookingId = async (bookingId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const transactionsRef = db
      .collection(transactionsCollection)
      .where("bookingId", "==", bookingId)
      .orderBy("createdAt", "desc")

    const snapshot = await transactionsRef.get()

    const transactions = []
    snapshot.forEach((doc) => {
      transactions.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: transactions }
  } catch (error) {
    console.error("Error getting transactions by booking:", error)
    return { success: false, error: error.message || "Failed to get transactions by booking" }
  }
}

/**
 * Process a payment for a booking
 * @param {object} paymentData - Payment data
 * @returns {Promise<object>}
 */
export const processPayment = async (paymentData) => {
  try {
    const { bookingId, ...transactionData } = paymentData
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    // Create a new transaction
    const transactionResult = await createTransaction({
      bookingId,
      ...transactionData,
      status: "completed", // Assuming payment is successful
    })

    if (!transactionResult.success) {
      return transactionResult
    }

    // Update booking payment status
    const bookingUpdateResult = await updateBookingPayment(bookingId, "paid", "credit_card", transactionResult.data.id)

    if (!bookingUpdateResult.success) {
      return bookingUpdateResult
    }

    return transactionResult
  } catch (error) {
    console.error("Error processing payment:", error)
    return { success: false, error: error.message || "Failed to process payment" }
  }
}
