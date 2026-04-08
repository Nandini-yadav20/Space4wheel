"use client"

import { createContext, useContext, useState, useEffect } from "react"
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

export function AuthProvider({ children }) {
  const { auth, isInitialized } = useFirebase()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // 🔁 AUTH STATE LISTENER
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

        // ✅ Create session
        const sessionRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        })

        // ✅ Check ok BEFORE calling .json()
        if (!sessionRes.ok) {
          const text = await sessionRes.text()
          console.error("Session creation failed:", sessionRes.status, text)
          await firebaseSignOut(auth)
          setUser(null)
          setLoading(false)
          return
        }

        const sessionData = await sessionRes.json()
        console.log("SESSION RESPONSE:", sessionRes.status, sessionData)

        // ✅ Fetch user from DB
        let userRes = await fetch(`/api/users/${firebaseUser.uid}`)

        // 🔥 Auto-create user if not found
        if (userRes.status === 404) {
          const createRes = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              name: firebaseUser.displayName || "",
              role: "user",
              createdAt: new Date().toISOString(),
            }),
          })

          // ✅ Check user creation succeeded before re-fetching
          if (!createRes.ok) {
            const text = await createRes.text()
            console.error("User creation failed:", createRes.status, text)
          }

          userRes = await fetch(`/api/users/${firebaseUser.uid}`)
        }

        // ✅ Check ok before parsing
        let userData = {}
        if (userRes.ok) {
          userData = await userRes.json()
        } else {
          const text = await userRes.text()
          console.error("User fetch failed:", userRes.status, text)
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          emailVerified: firebaseUser.emailVerified,
          role: userData.role || "user",
          profile: userData,
        })
      } catch (error) {
        console.error("Auth error:", error)
        setUser(null)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [auth, isInitialized])

  // 🔐 SIGN IN
  const signIn = async (email, password) => {
    try {
      setLoading(true)

      const userCredential = await signInWithEmailAndPassword(auth, email, password)

      // ❗ Email verification check
      if (!userCredential.user.emailVerified) {
        await firebaseSignOut(auth)
        return {
          success: false,
          error: "Please verify your email before logging in.",
        }
      }

      const idToken = await userCredential.user.getIdToken()

      // ✅ Fixed URL (was "app/api/auth/login/route.js")
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      })

      // ✅ Check ok BEFORE calling .json()
      if (!res.ok) {
        const text = await res.text()
        console.error("Login session failed:", res.status, text)
        throw new Error("Session creation failed")
      }

      const data = await res.json()
      console.log("LOGIN RESPONSE:", res.status, data)

      // ✅ Get user data
      let userRes = await fetch(`/api/users/${userCredential.user.uid}`)

      if (userRes.status === 404) {
        const createRes = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            name: userCredential.user.displayName || "",
            role: "user",
            createdAt: new Date().toISOString(),
          }),
        })

        if (!createRes.ok) {
          const text = await createRes.text()
          console.error("User creation failed:", createRes.status, text)
        }

        userRes = await fetch(`/api/users/${userCredential.user.uid}`)
      }

      // ✅ Check ok before parsing
      let userData = {}
      if (userRes.ok) {
        userData = await userRes.json()
      } else {
        const text = await userRes.text()
        console.error("User fetch failed:", userRes.status, text)
      }

      // 🎯 Role-based routing
      if (userData.role === "admin") {
        router.push("/admin")
      } else if (userData.role === "owner") {
        router.push("/dashboard/owner-dashboard")
      } else {
        router.push("/dashboard")
      }

      return { success: true }
    } catch (error) {
      console.error("SignIn error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 📝 SIGN UP
  const signUp = async (email, password, name, role) => {
    try {
      setLoading(true)

      const userCredential = await createUserWithEmailAndPassword(auth, email, password)
      const user = userCredential.user

      await updateProfile(user, { displayName: name })
      await sendEmailVerification(user)

      // ✅ Create user in DB
      const createRes = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          name,
          role: role || "user",
          createdAt: new Date().toISOString(),
        }),
      })

      if (!createRes.ok) {
        const text = await createRes.text()
        console.error("User creation failed during signup:", createRes.status, text)
      }

      await firebaseSignOut(auth)

      return {
        success: true,
        emailVerificationSent: true,
        email,
      }
    } catch (error) {
      console.error("SignUp error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 🚪 SIGN OUT
  const signOut = async () => {
    try {
      setLoading(true)

      const logoutRes = await fetch("/api/auth/logout", { method: "POST" })
      if (!logoutRes.ok) {
        const text = await logoutRes.text()
        console.error("Logout API failed:", logoutRes.status, text)
      }

      await firebaseSignOut(auth)
      router.push("/")
      return { success: true }
    } catch (error) {
      console.error("SignOut error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  // 🔁 RESET PASSWORD
  const resetPassword = async (email) => {
    try {
      setLoading(true)
      await sendPasswordResetEmail(auth, email)
      return { success: true }
    } catch (error) {
      console.error("ResetPassword error:", error)
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        isInitialized,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// ✅ Hook
export const useAuth = () => useContext(AuthContext)