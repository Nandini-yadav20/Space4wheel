"use client"

/**
 * lib/firebase/auth-context.jsx  — FIXED
 *
 * Root cause of 401 on /api/vehicles (and any cookie-gated API):
 *   The original code called POST /api/auth/login which only VERIFIES the idToken.
 *   It never called POST /api/auth/session, which is the only route that actually
 *   sets the HttpOnly "session" cookie that getUserFromSession() reads.
 *
 * Fix: replace every fetch("/api/auth/login") with fetch("/api/auth/session").
 *      The /api/auth/session route verifies the token AND sets the cookie.
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react"
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

const AuthContext = createContext()

// ── helper: ensure user doc exists in Firestore ──────────────────────────────
async function ensureUserDoc(uid, email, displayName) {
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
  return res.json()
}

// ── helper: create the HttpOnly session cookie via /api/auth/session ─────────
async function createServerSession(idToken) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  })
  if (!res.ok) {
    const text = await res.text()
    console.error("Session creation failed:", res.status, text)
    return false
  }
  return true
}

export function AuthProvider({ children }) {
  const { auth, isInitialized } = useFirebase()
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // ── Auth state listener ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isInitialized || !auth) return

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        const idToken = await firebaseUser.getIdToken()

        // ✅ FIX: call /api/auth/session (sets the cookie), not /api/auth/login
        const ok = await createServerSession(idToken)
        if (!ok) {
          await firebaseSignOut(auth)
          setUser(null)
          setLoading(false)
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
        console.error("Auth state error:", err)
        setUser(null)
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [auth, isInitialized])

  // ── Sign In ────────────────────────────────────────────────────────────────
  const signIn = useCallback(async (email, password) => {
    try {
      setLoading(true)

      const credential = await signInWithEmailAndPassword(auth, email, password)

      if (!credential.user.emailVerified) {
        await firebaseSignOut(auth)
        return {
          success: false,
          emailVerificationNeeded: true,
          email,
          error: "Please verify your email before logging in.",
        }
      }

      const idToken = await credential.user.getIdToken()

      // ✅ FIX: /api/auth/session sets the HttpOnly cookie
      const ok = await createServerSession(idToken)
      if (!ok) throw new Error("Failed to create server session")

      const userData = await ensureUserDoc(
        credential.user.uid,
        credential.user.email,
        credential.user.displayName
      )

      const role = userData.role || "user"

      if (role === "admin")       router.push("/admin")
      else if (role === "owner")  router.push("/dashboard/owner-dashboard")
      else                        router.push("/dashboard")

      return { success: true }
    } catch (err) {
      console.error("signIn error:", err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [auth, router])

  // ── Sign Up ────────────────────────────────────────────────────────────────
  const signUp = useCallback(async (email, password, name, role) => {
    try {
      setLoading(true)

      const credential = await createUserWithEmailAndPassword(auth, email, password)
      const firebaseUser = credential.user

      await updateProfile(firebaseUser, { displayName: name })
      await sendEmailVerification(firebaseUser)

      // Create Firestore doc right away (with correct role)
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          name,
          role: role || "user",
          createdAt: new Date().toISOString(),
        }),
      })

      // Sign out — they must verify email first
      await firebaseSignOut(auth)

      return { success: true, emailVerificationSent: true, email }
    } catch (err) {
      console.error("signUp error:", err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [auth])

  // ── Sign Out ───────────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    try {
      setLoading(true)
      // Clear server-side session cookie
      await fetch("/api/auth/logout", { method: "POST" })
      await firebaseSignOut(auth)
      router.push("/")
      return { success: true }
    } catch (err) {
      console.error("signOut error:", err)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [auth, router])

  // ── Reset Password ─────────────────────────────────────────────────────────
  const resetPassword = useCallback(async (email) => {
    try {
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [auth])

  // ── Resend verification email ──────────────────────────────────────────────
  const resendVerificationEmail = useCallback(async (email, password) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      await sendEmailVerification(credential.user)
      await firebaseSignOut(auth)
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

export const useAuth = () => useContext(AuthContext)