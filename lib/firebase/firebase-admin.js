import { initializeApp, getApps, cert } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"
import { getStorage } from "firebase-admin/storage"
import { getAuth } from "firebase-admin/auth"
import { getDatabase } from "firebase-admin/database"

let adminApp
let adminDb
let adminStorage
let adminAuth
let adminRtdb

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl
  const trimmed = String(rawUrl).trim()
  if (!trimmed) return trimmed
  if (trimmed.includes(".firebasedatabase.app")) {
    return trimmed.replace(".firebasedatabase.app", ".firebaseio.com")
  }
  return trimmed
}

function getServiceAccount() {
  // Try individual environment variables first (new format)
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID || "",
      private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID || "",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL || "",
    }
  }

  // Fall back to FIREBASE_ADMIN_SDK_KEY (old format)
  if (process.env.FIREBASE_ADMIN_SDK_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY)
    } catch (error) {
      throw new Error(
        `Failed to parse FIREBASE_ADMIN_SDK_KEY: ${error.message}. Ensure it's a valid JSON string.`
      )
    }
  }

  throw new Error(
    "Firebase service account credentials not found. Please set either FIREBASE_ADMIN_SDK_KEY or the individual Firebase environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)."
  )
}

export function initAdmin() {
  if (adminApp) {
    return { adminApp, adminDb, adminStorage, adminAuth, adminRtdb }
  }

  try {
    if (getApps().length === 0) {
      const serviceAccount = getServiceAccount()
      adminApp = initializeApp({
        credential: cert(serviceAccount),
        databaseURL: normalizeDatabaseUrl(
          process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ||
          process.env.FIREBASE_DATABASE_URL ||
          "https://park-it-rent-it-default-rtdb.firebaseio.com"
        ),
        storageBucket: "park-it-rent-it.appspot.com",
      })
      console.log("Firebase Admin initialized successfully")
    } else {
      adminApp = getApps()[0]
      console.log("Using existing Firebase Admin app")
    }

    adminDb = getFirestore(adminApp)
    adminStorage = getStorage(adminApp)
    adminAuth = getAuth(adminApp)
    adminRtdb = getDatabase(adminApp)
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error)
    throw new Error(`Failed to initialize Firebase Admin: ${error.message}`)
  }

  return { adminApp, adminDb, adminStorage, adminAuth, adminRtdb }
}

export function getAdminFirestore() {
  if (!adminDb) {
    initAdmin()
  }
  return adminDb
}

export function getAdminStorage() {
  if (!adminStorage) {
    initAdmin()
  }
  return adminStorage
}

export function getAdminAuth() {
  if (!adminAuth) {
    initAdmin()
  }
  return adminAuth
}

export function getAdminRealtimeDb() {
  if (!adminRtdb) {
    initAdmin()
  }
  return adminRtdb
}