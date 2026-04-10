// lib/firebase/plot-actions.js
// Firestore operations for plot management

import { db } from "./firestore"
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDocs,
  serverTimestamp,
  getDoc,
} from "firebase/firestore"

/**
 * Add a new plot to Firestore
 * @param {Object} data - Plot data
 * @param {string} data.name - Plot name
 * @param {string} data.address - Plot address
 * @param {number} data.price - Price per slot/hour
 * @param {number} data.totalSlots - Total number of slots
 * @param {string} data.ownerId - Owner's Firebase user ID
 * @param {Array} data.images - Array of image objects with url property
 * @returns {Promise<string>} - Document ID of created plot
 */
export async function addPlot({
  name,
  address,
  price,
  totalSlots,
  ownerId,
  images = [],
}) {
  try {
    const plotData = {
      name,
      address,
      price: Number(price),
      totalSlots: Number(totalSlots),
      availableSlots: Number(totalSlots),
      ownerId,
      images: images || [],
      approvalStatus: "pending",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      rating: 0,
      reviewCount: 0,
    }

    const docRef = await addDoc(collection(db, "plots"), plotData)
    console.log("Plot created with ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("Error adding plot:", error)
    throw new Error(`Failed to add plot: ${error.message}`)
  }
}

/**
 * Get all plots for a specific owner
 * @param {string} userId - Owner's Firebase user ID
 * @returns {Promise<Array>} - Array of plot documents with id
 */
export async function getOwnerPlots(userId) {
  try {
    const q = query(collection(db, "plots"), where("ownerId", "==", userId))
    const snapshot = await getDocs(q)
    const plots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return plots
  } catch (error) {
    console.error("Error fetching owner plots:", error)
    throw new Error(`Failed to fetch plots: ${error.message}`)
  }
}

/**
 * Get a single plot by ID
 * @param {string} plotId - Plot document ID
 * @returns {Promise<Object>} - Plot document data with id
 */
export async function getPlot(plotId) {
  try {
    const docRef = doc(db, "plots", plotId)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      throw new Error("Plot not found")
    }

    return {
      id: docSnap.id,
      ...docSnap.data(),
    }
  } catch (error) {
    console.error("Error fetching plot:", error)
    throw new Error(`Failed to fetch plot: ${error.message}`)
  }
}

/**
 * Update a plot
 * @param {string} plotId - Plot document ID
 * @param {Object} data - Updated plot data
 * @returns {Promise<void>}
 */
export async function updatePlot(plotId, data) {
  try {
    const docRef = doc(db, "plots", plotId)
    const updateData = {
      ...data,
      updatedAt: serverTimestamp(),
    }

    // Convert numeric fields
    if (data.price !== undefined) {
      updateData.price = Number(data.price)
    }
    if (data.totalSlots !== undefined) {
      updateData.totalSlots = Number(data.totalSlots)
    }
    if (data.availableSlots !== undefined) {
      updateData.availableSlots = Number(data.availableSlots)
    }

    await updateDoc(docRef, updateData)
    console.log("Plot updated:", plotId)
  } catch (error) {
    console.error("Error updating plot:", error)
    throw new Error(`Failed to update plot: ${error.message}`)
  }
}

/**
 * Delete a plot
 * @param {string} plotId - Plot document ID
 * @returns {Promise<void>}
 */
export async function deletePlot(plotId) {
  try {
    const docRef = doc(db, "plots", plotId)
    await deleteDoc(docRef)
    console.log("Plot deleted:", plotId)
  } catch (error) {
    console.error("Error deleting plot:", error)
    throw new Error(`Failed to delete plot: ${error.message}`)
  }
}

/**
 * Update plot's approval status (admin only)
 * @param {string} plotId - Plot document ID
 * @param {string} status - 'approved', 'rejected', or 'pending'
 * @returns {Promise<void>}
 */
export async function updatePlotApprovalStatus(plotId, status) {
  try {
    await updatePlot(plotId, {
      approvalStatus: status,
      approvalUpdatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error("Error updating approval status:", error)
    throw error
  }
}

/**
 * Get all plots (used for admin/public view)
 * @returns {Promise<Array>} - Array of all plots
 */
export async function getAllPlots() {
  try {
    const snapshot = await getDocs(collection(db, "plots"))
    const plots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return plots
  } catch (error) {
    console.error("Error fetching all plots:", error)
    throw new Error(`Failed to fetch all plots: ${error.message}`)
  }
}

/**
 * Update available slots (when a booking is made)
 * @param {string} plotId - Plot document ID
 * @param {number} count - Number of slots to decrement (-) or increment (+)
 * @returns {Promise<void>}
 */
export async function updateAvailableSlots(plotId, count) {
  try {
    const plot = await getPlot(plotId)
    const newAvailable = Math.max(
      0,
      (plot.availableSlots || plot.totalSlots) + count
    )
    await updatePlot(plotId, {
      availableSlots: newAvailable,
    })
  } catch (error) {
    console.error("Error updating available slots:", error)
    throw error
  }
}

/**
 * Get all approved plots (for user booking view)
 * @returns {Promise<Array>} - Array of approved plots
 */
export async function getApprovedPlots() {
  try {
    const q = query(
      collection(db, "plots"),
      where("approvalStatus", "==", "approved")
    )
    const snapshot = await getDocs(q)
    const plots = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    return plots
  } catch (error) {
    console.error("Error fetching approved plots:", error)
    throw error
  }
}
