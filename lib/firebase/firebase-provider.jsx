"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth"
import { firebaseConfig } from "./firebase-config"

const FirebaseContext = createContext(null)

export function FirebaseProvider({ children }) {
  const [firebaseApp, setFirebaseApp] = useState(null)
  const [database, setDatabase] = useState(null)
  const [firebaseStorage, setFirebaseStorage] = useState(null)
  const [firebaseAuth, setFirebaseAuth] = useState(null)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    try {
      console.log("Initializing Firebase with config:", {
        projectId: firebaseConfig.projectId,
        databaseURL: firebaseConfig.databaseURL,
        authDomain: firebaseConfig.authDomain,
      })

      let app
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig)
      } else {
        app = getApp()
      }

      const db = getDatabase(app)
      const storage = getStorage(app)
      const auth = getAuth(app)

      setFirebaseApp(app)
      setDatabase(db)
      setFirebaseStorage(storage)
      setFirebaseAuth(auth)
      setIsInitialized(true)

      console.log("Firebase initialized successfully")
    } catch (error) {
      console.error("Firebase Init Error:", error)
    }
  }, [])

  return (
    <FirebaseContext.Provider
      value={{
        app: firebaseApp,
        db: database,
        storage: firebaseStorage,
        auth: firebaseAuth,
        isInitialized,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  )
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext)
  if (!context) {
    throw new Error("useFirebase must be used within a FirebaseProvider")
  }
  return context
}

export const useFirebaseApp = () => {
  const { app } = useFirebase()
  return app
}

export const useDatabase = () => {
  const { db } = useFirebase()
  return db
}

export const useStorage = () => {
  const { storage } = useFirebase()
  return storage
}

export const useAuth = () => {
  const { auth } = useFirebase()
  return auth
}