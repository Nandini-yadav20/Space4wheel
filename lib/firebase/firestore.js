// lib/firebase/firestore.js
// Client-side Firestore initialization

import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { firebaseConfig } from "./firebase-config"

let app
let db

// Initialize Firebase app if not already done
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig)
} else {
  app = getApp()
}

// Get Firestore instance
db = getFirestore(app)

export { db }
