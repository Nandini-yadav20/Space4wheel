import { getAdminFirestore } from "../firebase-admin"

const reviewsCollection = "reviews"

/**
 * Create a new review
 * @param {object} reviewData - Review data
 * @returns {Promise<object>} Created review data with ID
 */
export const createReview = async (reviewData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const newReview = {
      ...reviewData,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await db.collection(reviewsCollection).add(newReview)
    console.log("Review created with ID:", docRef.id)

    // Update plot rating
    if (reviewData.plotId && reviewData.rating) {
      try {
        const plotRef = db.collection("plots").doc(reviewData.plotId)
        const plotSnap = await plotRef.get()

        if (plotSnap.exists) {
          const plotData = plotSnap.data()
          const currentReviewCount = plotData.reviewCount || 0
          const currentRating = plotData.rating || 0

          // Calculate new average rating
          const newReviewCount = currentReviewCount + 1
          const newAverageRating = (currentRating * currentReviewCount + reviewData.rating) / newReviewCount

          await plotRef.update({
            rating: Number.parseFloat(newAverageRating.toFixed(1)),
            reviewCount: newReviewCount,
            updatedAt: new Date(),
          })
        }
      } catch (plotError) {
        console.error("Error updating plot rating:", plotError)
        // We don't want to fail the review creation if this fails
      }
    }

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newReview,
      },
    }
  } catch (error) {
    console.error("Error creating review:", error)
    return { success: false, error: error.message || "Failed to create review" }
  }
}

/**
 * Get reviews by plot ID
 * @param {string} plotId - Plot ID
 * @returns {Promise<Array>} Array of reviews
 */
export const getReviewsByPlotId = async (plotId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const reviewsRef = db.collection(reviewsCollection).where("plotId", "==", plotId)
    const snapshot = await reviewsRef.get()

    const reviews = []
    snapshot.forEach((doc) => {
      reviews.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: reviews }
  } catch (error) {
    console.error("Error getting reviews by plot:", error)
    return { success: false, error: error.message || "Failed to get reviews by plot" }
  }
}

/**
 * Get reviews by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of reviews
 */
export const getReviewsByUserId = async (userId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const reviewsRef = db.collection(reviewsCollection).where("userId", "==", userId)
    const snapshot = await reviewsRef.get()

    const reviews = []
    snapshot.forEach((doc) => {
      reviews.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: reviews }
  } catch (error) {
    console.error("Error getting reviews by user:", error)
    return { success: false, error: error.message || "Failed to get reviews by user" }
  }
}

/**
 * Update review
 * @param {string} reviewId - Review ID
 * @param {object} reviewData - Updated review data
 * @returns {Promise<object>}
 */
export const updateReview = async (reviewId, reviewData) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const reviewRef = db.collection(reviewsCollection).doc(reviewId)

    await reviewRef.update({
      ...reviewData,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating review:", error)
    return { success: false, error: error.message || "Failed to update review" }
  }
}

/**
 * Delete review
 * @param {string} reviewId - Review ID
 * @returns {Promise<object>}
 */
export const deleteReview = async (reviewId) => {
  try {
    const db = getAdminFirestore()

    if (!db) {
      throw new Error("Firestore instance is undefined")
    }

    const reviewRef = db.collection(reviewsCollection).doc(reviewId)
    await reviewRef.delete()

    // Note: In a production app, you would also update the plot rating
    // This would require more complex logic to recalculate the average

    return { success: true }
  } catch (error) {
    console.error("Error deleting review:", error)
    return { success: false, error: error.message || "Failed to delete review" }
  }
}
