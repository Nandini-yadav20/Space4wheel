import { getAdminFirestore } from "../firebase-admin"

const vehiclesCollection = "vehicles"

/**
 * Get all vehicles
 * @returns {Promise<object>} Result with success status and data/error
 */
export const getAllVehicles = async () => {
  try {
    const db = getAdminFirestore()
    const vehiclesRef = db.collection(vehiclesCollection)
    const querySnapshot = await vehiclesRef.orderBy("createdAt", "desc").get()

    const vehicles = []
    querySnapshot.forEach((doc) => {
      vehicles.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: vehicles }
  } catch (error) {
    console.error("Error getting all vehicles:", error)
    return { success: false, error }
  }
}

/**
 * Get vehicles by user ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Result with success status and data/error
 */
export const getUserVehicles = async (userId) => {
  try {
    const db = getAdminFirestore()
    const vehiclesRef = db.collection(vehiclesCollection)
    const querySnapshot = await vehiclesRef
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get()

    const vehicles = []
    querySnapshot.forEach((doc) => {
      vehicles.push({
        id: doc.id,
        ...doc.data(),
      })
    })

    return { success: true, data: vehicles }
  } catch (error) {
    console.error("Error getting user vehicles:", error)
    return { success: false, error }
  }
}

/**
 * Get vehicle by ID
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<object>} Result with success status and data/error
 */
export const getVehicleById = async (vehicleId) => {
  try {
    const db = getAdminFirestore()
    const vehicleRef = db.collection(vehiclesCollection).doc(vehicleId)
    const vehicleSnap = await vehicleRef.get()

    if (vehicleSnap.exists) {
      return {
        success: true,
        data: {
          id: vehicleSnap.id,
          ...vehicleSnap.data(),
        },
      }
    } else {
      return { success: false, error: "Vehicle not found" }
    }
  } catch (error) {
    console.error("Error getting vehicle:", error)
    return { success: false, error }
  }
}

/**
 * Add a new vehicle
 * @param {string} userId - User ID
 * @param {object} vehicleData - Vehicle data
 * @returns {Promise<object>} Result with success status and data/error
 */
export const addVehicle = async (userId, vehicleData) => {
  try {
    const db = getAdminFirestore()
    const vehiclesRef = db.collection(vehiclesCollection)

    const newVehicle = {
      ...vehicleData,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const docRef = await vehiclesRef.add(newVehicle)

    return {
      success: true,
      data: {
        id: docRef.id,
        ...newVehicle,
      },
    }
  } catch (error) {
    console.error("Error adding vehicle:", error)
    return { success: false, error }
  }
}

/**
 * Update a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @param {object} vehicleData - Updated vehicle data
 * @returns {Promise<object>} Result with success status and data/error
 */
export const updateVehicle = async (vehicleId, vehicleData) => {
  try {
    const db = getAdminFirestore()
    const vehicleRef = db.collection(vehiclesCollection).doc(vehicleId)

    const updatedVehicle = {
      ...vehicleData,
      updatedAt: new Date(),
    }

    await vehicleRef.update(updatedVehicle)

    return {
      success: true,
      data: {
        id: vehicleId,
        ...updatedVehicle,
      },
    }
  } catch (error) {
    console.error("Error updating vehicle:", error)
    return { success: false, error }
  }
}

/**
 * Delete a vehicle
 * @param {string} vehicleId - Vehicle ID
 * @returns {Promise<object>} Result with success status
 */
export const deleteVehicle = async (vehicleId) => {
  try {
    const db = getAdminFirestore()
    const vehicleRef = db.collection(vehiclesCollection).doc(vehicleId)
    await vehicleRef.delete()

    return { success: true }
  } catch (error) {
    console.error("Error deleting vehicle:", error)
    return { success: false, error }
  }
}

/**
 * Get vehicle statistics
 * @returns {Promise<object>} Result with success status and data/error
 */
export const getVehicleStats = async () => {
  try {
    const db = getAdminFirestore()
    const vehiclesRef = db.collection(vehiclesCollection)
    const querySnapshot = await vehiclesRef.get()

    const stats = {
      total: 0,
      byType: {
        Car: 0,
        Bike: 0,
        Van: 0,
        Truck: 0,
        EV: 0,
      },
      byFuelType: {
        Petrol: 0,
        Diesel: 0,
        Electric: 0,
        Hybrid: 0,
      },
    }

    querySnapshot.forEach((doc) => {
      const vehicle = doc.data()
      stats.total++

      if (vehicle.type) {
        stats.byType[vehicle.type] = (stats.byType[vehicle.type] || 0) + 1
      }

      if (vehicle.fuelType) {
        stats.byFuelType[vehicle.fuelType] = (stats.byFuelType[vehicle.fuelType] || 0) + 1
      }
    })

    return { success: true, data: stats }
  } catch (error) {
    console.error("Error getting vehicle stats:", error)
    return { success: false, error }
  }
}
