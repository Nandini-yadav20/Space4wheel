import { getAdminFirestore } from "../firebase-admin"

const plotsCollection = "plots"

/**
 * Create a new parking plot
 * @param {object} plotData - Plot data
 * @returns {Promise<object>} Created plot data with ID
 */
export const createPlot = async (plotData) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK methods correctly
    const newPlot = {
      ...plotData,
      availableSlots: plotData.totalSlots,
      rating: 0,
      reviewCount: 0,
      isActive: true,
      approvalStatus: "pending", // Add approval status
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    // Use the Admin SDK syntax for adding documents
    const docRef = await db.collection(plotsCollection).add(newPlot)

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newPlot,
      },
    }
  } catch (error) {
    console.error("Error creating plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get plot by ID
 * @param {string} plotId - Plot ID
 * @returns {Promise<object|null>} Plot data or null if not found
 */
export const getPlotById = async (plotId) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for getting documents
    const plotRef = db.collection(plotsCollection).doc(plotId)
    const plotSnap = await plotRef.get()

    if (plotSnap.exists) {
      return {
        success: true,
        data: {
          id: plotSnap.id,
          ...plotSnap.data(),
        },
      }
    } else {
      return { success: false, error: "Plot not found" }
    }
  } catch (error) {
    console.error("Error getting plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Update plot data
 * @param {string} plotId - Plot ID
 * @param {object} plotData - Updated plot data
 * @returns {Promise<void>}
 */
export const updatePlot = async (plotId, plotData) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for updating documents
    const plotRef = db.collection(plotsCollection).doc(plotId)

    await plotRef.update({
      ...plotData,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete plot
 * @param {string} plotId - Plot ID
 * @returns {Promise<void>}
 */
export const deletePlot = async (plotId) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for deleting documents
    const plotRef = db.collection(plotsCollection).doc(plotId)
    await plotRef.delete()

    return { success: true }
  } catch (error) {
    console.error("Error deleting plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get plots by owner ID
 * @param {string} ownerId - Owner ID
 * @returns {Promise<Array>} Array of plots
 */
export const getPlotsByOwnerId = async (ownerId) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for querying documents
    const plotsRef = db.collection(plotsCollection)
    const querySnapshot = await plotsRef.where("ownerId", "==", ownerId).orderBy("createdAt", "desc").get()

    const plots = []
    querySnapshot.forEach((doc) => {
      plots.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: plots }
  } catch (error) {
    console.error("Error getting plots by owner:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Get plots within a specified radius of coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusMiles - Radius in miles
 * @param {string} searchQuery - Optional search query
 * @returns {Promise<Array>} Array of plots within the radius
 */
export const getPlotsByRadius = async (lat, lng, radiusMiles = 5, searchQuery = "") => {
  try {
    console.log(`Searching for plots near [${lat}, ${lng}] within ${radiusMiles} miles`)

    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // In a production app, you would use Firestore's geoqueries
    // or a specialized geospatial database/service
    // This implementation fetches all plots and filters them by distance

    const plotsRef = db.collection(plotsCollection)
    // Only get approved and active plots
    const querySnapshot = await plotsRef.where("isActive", "==", true).where("approvalStatus", "==", "approved").get()

    console.log(`Found ${querySnapshot.size} total approved plots in database`)

    const plots = []
    querySnapshot.forEach((doc) => {
      const plotData = doc.data()

      // Skip plots without coordinates
      if (!plotData.lat || !plotData.lng) {
        console.log(`Plot ${doc.id} skipped: missing coordinates`)
        return
      }

      // Calculate distance using Haversine formula
      const distance = calculateDistance(lat, lng, plotData.lat, plotData.lng)

      // Check if plot is within radius and matches search query if provided
      const matchesRadius = distance <= radiusMiles
      const matchesQuery =
        !searchQuery ||
        plotData.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plotData.address.toLowerCase().includes(searchQuery.toLowerCase())

      if (matchesRadius && matchesQuery) {
        plots.push({
          id: doc.id,
          ...plotData,
          distance: Number.parseFloat(distance.toFixed(1)),
        })
      }
    })

    console.log(`Found ${plots.length} plots within ${radiusMiles} miles of [${lat}, ${lng}]`)

    // Sort by distance
    plots.sort((a, b) => a.distance - b.distance)

    return { success: true, data: plots }
  } catch (error) {
    console.error("Error getting plots by radius:", error)
    return { success: false, error: error.message }
  }
}

/**
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3958.8 // Radius of the Earth in miles
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distanceInMiles = R * c
  const distanceInKm = distanceInMiles * 1.60934
  return distanceInKm
}

/**
 * Converts degrees to radians
 * @param {number} deg
 * @returns {number}
 */
function deg2rad(deg) {
  return deg * (Math.PI / 180)
}


/**
 * Get nearby plots based on coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusKm - Radius in kilometers
 * @returns {Promise<Array>} Array of nearby plots
 */
export const getNearbyPlots = async (lat, lng, radiusKm = 5) => {
  // Convert km to miles for consistency
  const radiusMiles = radiusKm * 0.621371
  return getPlotsByRadius(lat, lng, radiusMiles)
}

/**
 * Get plots by status
 * @returns {Promise<Array>} Array of  plots
 */
export const getPlotsByStatus = async (status) => {
  try {
    const db = getAdminFirestore()
    if (!db) return { success: false, error: "Database connection failed" }

    const plotsRef = db.collection(plotsCollection)
    const querySnapshot = await plotsRef.where("approvalStatus", "==", status).orderBy("createdAt", "desc").get()

    const plots = []
    querySnapshot.forEach((doc) => {
      plots.push({ id: doc.id, ...doc.data() })
    })

    return { success: true, data: plots }
  } catch (error) {
    console.error("Error getting plots by status:", error)
    return { success: false, error: error.message }
  }
}


/**
 * Approve a plot
 * @param {string} plotId - Plot ID
 * @returns {Promise<object>} Result
 */
export const approvePlot = async (plotId) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for updating documents
    const plotRef = db.collection(plotsCollection).doc(plotId)

    await plotRef.update({
      approvalStatus: "approved",
      approvedAt: new Date(),
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error approving plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Reject a plot
 * @param {string} plotId - Plot ID
 * @param {string} reason - Rejection reason
 * @returns {Promise<object>} Result
 */
export const rejectPlot = async (plotId, reason) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for updating documents
    const plotRef = db.collection(plotsCollection).doc(plotId)

    await plotRef.update({
      approvalStatus: "rejected",
      rejectionReason: reason,
      rejectedAt: new Date(),
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error rejecting plot:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Update plot availability
 * @param {string} plotId - Plot ID
 * @param {number} slotsChange - Number of slots to add (positive) or remove (negative)
 * @returns {Promise<void>}
 */
export const updatePlotAvailability = async (plotId, slotsChange) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for updating documents
    const plotRef = db.collection(plotsCollection).doc(plotId)
    const plotDoc = await plotRef.get()

    if (!plotDoc.exists) {
      return { success: false, error: "Plot not found" }
    }

    const plotData = plotDoc.data()
    const currentAvailableSlots = plotData.availableSlots || 0

    await plotRef.update({
      availableSlots: currentAvailableSlots + slotsChange,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating plot availability:", error)
    return { success: false, error: error.message }
  }
}

/**
 * Update plot rating when a new review is added
 * @param {string} plotId - Plot ID
 * @param {number} newRating - New rating value
 * @returns {Promise<void>}
 */
export const updatePlotRating = async (plotId, newRating) => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      console.error("Firestore instance not available")
      return { success: false, error: "Database connection failed" }
    }

    // Use the Admin SDK syntax for getting and updating documents
    const plotRef = db.collection(plotsCollection).doc(plotId)
    const plotSnap = await plotRef.get()

    if (!plotSnap.exists) {
      return { success: false, error: "Plot not found" }
    }

    const plotData = plotSnap.data()
    const currentReviewCount = plotData.reviewCount || 0
    const currentRating = plotData.rating || 0

    // Calculate new average rating
    const newReviewCount = currentReviewCount + 1
    const newAverageRating = (currentRating * currentReviewCount + newRating) / newReviewCount

    await plotRef.update({
      rating: Number.parseFloat(newAverageRating.toFixed(1)),
      reviewCount: newReviewCount,
      updatedAt: new Date(),
    })

    return { success: true }
  } catch (error) {
    console.error("Error updating plot rating:", error)
    return { success: false, error: error.message }
  }
}
/**
 * Get all plots
 * @returns {Promise<object>} All plots
 */
export const getAllPlots = async () => {
  try {
    const db = getAdminFirestore()
    if (!db) {
      return { success: false, error: "Database connection failed" }
    }

    const plotsRef = db.collection("plots")
    const snapshot = await plotsRef.get()

    const plots = []
    snapshot.forEach(doc => {
      plots.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: plots }
  } catch (error) {
    console.error("Error fetching all plots:", error)
    return { success: false, error: error.message }
  }
}
