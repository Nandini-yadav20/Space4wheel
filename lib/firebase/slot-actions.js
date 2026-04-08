import { ref, update } from "firebase/database"
import { getDatabase } from "firebase/database"
import { app } from "./firebase-config"

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