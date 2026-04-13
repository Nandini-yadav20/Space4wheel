import { initializeApp, getApps, getApp } from "firebase/app"
import { ref, update, getDatabase } from "firebase/database"
import { firebaseConfig } from "./firebase-config"

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
const db = getDatabase(app)

export const bookSlot = async (slotId) => {
  try {
    await update(ref(db, `slots/${slotId}`), {
      status: "booked"
    })
  } catch (error) {
    console.error("Booking failed:", error)
  }
}

export const releaseSlot = async (slotId) => {
  try {
    await update(ref(db, `slots/${slotId}`), {
      status: "available"
    })
  } catch (error) {
    console.error("Release failed:", error)
  }
}