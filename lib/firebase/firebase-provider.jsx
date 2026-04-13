"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"
import { firebaseConfig } from "./firebase-config"

const FirebaseContext = createContext(null)

export function FirebaseProvider({ children }) {
  const [firebase, setFirebase] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      // ✅ Initialize only once
      const app = getApps().length === 0
        ? initializeApp(firebaseConfig)
        : getApp()

      // ⚠️ IMPORTANT: ensure databaseURL exists
      if (!firebaseConfig.databaseURL) {
        console.error("Firebase databaseURL missing (Realtime DB will fail)")
      }

      const firebaseServices = {
        app,
        db: getDatabase(app),
        firestore: getFirestore(app),
        storage: getStorage(app),
        auth: getAuth(app),
      }

      setFirebase(firebaseServices)
      setIsInitialized(true)

    } catch (error) {
      console.error("Firebase Init Error:", error)
    }
  }, [])

  const value = {
    app: firebase?.app || null,
    db: firebase?.db || null,
    firestore: firebase?.firestore || null,
    storage: firebase?.storage || null,
    auth: firebase?.auth || null,
    isInitialized,
  }

  return (
    <FirebaseContext.Provider value={value}>
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext)

  if (!context) {
    throw new Error("useFirebase must be used within FirebaseProvider")
  }

  return context
}