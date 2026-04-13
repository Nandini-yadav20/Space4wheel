"use client"

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react"
import { useRouter } from "next/navigation"
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth"
import { useFirebase } from "./firebase-provider"

// ✅ safer default
const AuthContext = createContext(null)

function mapFirebaseAuthError(err) {
  const code = err?.code || ""
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "Invalid email or password."
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later."
    case "auth/network-request-failed":
      return "Network error. Check your internet connection and try again."
    default:
      return err?.message || "Authentication failed."
  }
}

// ── helper: ensure user doc exists ─────────────────
async function ensureUserDoc(uid, email, displayName) {
  try {
    let res = await fetch(`/api/users/${uid}`)

    if (res.status === 404) {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          email,
          name: displayName || "",
          role: "user",
          createdAt: new Date().toISOString(),
        }),
      })

      res = await fetch(`/api/users/${uid}`)
    }

    if (!res.ok) return {}
    return await res.json()
  } catch (err) {
    console.error("ensureUserDoc error:", err)
    return {}
  }
}

// ── helper: create session cookie ─────────────────
async function createServerSession(idToken) {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    })

    return res.ok
  } catch (err) {
    console.error("Session error:", err)
    return false
  }
}

export function AuthProvider({ children }) {
  const { auth, isInitialized } = useFirebase()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const router = useRouter()

  // ── Auth state listener ─────────────────
  useEffect(() => {
   if (!isInitialized || !auth) {
  setLoading(false)
  return
}

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          setUser(null)
          return
        }

        const idToken = await firebaseUser.getIdToken()

        const ok = await createServerSession(idToken)
        if (!ok) {
          await firebaseSignOut(auth)
          setUser(null)
          return
        }

        const userData = await ensureUserDoc(
          firebaseUser.uid,
          firebaseUser.email,
          firebaseUser.displayName
        )

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          role: userData.role || "user",
          profile: userData,
        })
      } catch (err) {
        console.error("Auth error:", err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [auth, isInitialized])

  // ── Sign In ─────────────────
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true)

      if (!auth) {
        return { success: false, error: "Authentication service is not ready." }
      }

      const safeEmail = String(email || "").trim().toLowerCase()
      const safePassword = String(password || "")
      const credential = await signInWithEmailAndPassword(auth, safeEmail, safePassword)

      if (!credential.user.emailVerified) {
        await firebaseSignOut(auth)
        return {
          success: false,
          emailVerificationNeeded: true,
          email: safeEmail,
          error: "Verify email first",
        }
      }

      const idToken = await credential.user.getIdToken()
      const ok = await createServerSession(idToken)

      if (!ok) throw new Error("Session failed")

      const userData = await ensureUserDoc(
        credential.user.uid,
        credential.user.email,
        credential.user.displayName
      )

      const role = userData.role || "user"

      if (role === "admin") router.push("/admin")
      else if (role === "owner") router.push("/dashboard/owner-dashboard")
      else router.push("/dashboard")

      return { success: true }
    } catch (err) {
      console.error("signIn:", err)
      return { success: false, error: mapFirebaseAuthError(err) }
    } finally {
      setLoading(false)
    }
  }, [auth, router])

  const resendVerificationEmail = useCallback(async (email, password) => {
    try {
      if (!auth) {
        return { success: false, error: "Authentication service is not ready." }
      }

      const safeEmail = String(email || "").trim().toLowerCase()
      const safePassword = String(password || "")
      const credential = await signInWithEmailAndPassword(auth, safeEmail, safePassword)

      if (credential.user.emailVerified) {
        await firebaseSignOut(auth)
        return { success: false, error: "Email is already verified." }
      }

      await sendEmailVerification(credential.user)
      await firebaseSignOut(auth)
      return { success: true }
    } catch (err) {
      return { success: false, error: mapFirebaseAuthError(err) }
    }
  }, [auth])

  // ── Sign Up ─────────────────
  const signUp = useCallback(async (email, password, name, role) => {
    try {
      setLoading(true)

      const credential = await createUserWithEmailAndPassword(auth, email, password)

      await updateProfile(credential.user, { displayName: name })
      await sendEmailVerification(credential.user)

      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: credential.user.uid,
          email,
          name,
          role: role || "user",
          createdAt: new Date().toISOString(),
        }),
      })

      await firebaseSignOut(auth)

      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [auth])

  // ── Sign Out ─────────────────
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      await fetch("/api/auth/logout", { method: "POST" })
      await firebaseSignOut(auth)
      router.push("/")
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [auth, router])

  // ── Reset Password ───────────
  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [auth])

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isInitialized,
        signIn,
        signUp,
        signOut,
        resetPassword,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ✅ SAFE HOOK
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}