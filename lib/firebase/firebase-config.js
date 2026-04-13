
function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl
  const trimmed = String(rawUrl).trim()
  if (!trimmed) return trimmed

  // Prefer firebaseio.com for better compatibility with some DNS resolvers.
  if (trimmed.includes(".firebasedatabase.app")) {
    return trimmed.replace(".firebasedatabase.app", ".firebaseio.com")
  }
  return trimmed
}

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBOsk6EDki11fGUiGZlyasFoWisKrqIVVA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "park-it-rent-it.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "park-it-rent-it",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "park-it-rent-it.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "603429257402",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:603429257402:web:fe99bc8d57cfbdc63e0283",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
  databaseURL: normalizeDatabaseUrl(
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL || "https://park-it-rent-it-default-rtdb.firebaseio.com"
  ),
}

