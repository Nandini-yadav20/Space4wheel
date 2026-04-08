"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { DashboardNav } from "@/components/dashboard/dashboard-nav"
import { Loader2 } from "lucide-react"

// Don't wrap with AuthProvider here since it should be at a higher level
export default function DashboardLayout({ children }) {
  const { user, loading, isInitialized } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [redirected, setRedirected] = useState(false)

  useEffect(() => {
    console.log("Dashboard layout effect running", {
      loading,
      isInitialized,
      user: user ? "User exists" : "No user",
      userRole: user?.role,
      redirected,
    })

    // Only proceed when auth is initialized and not loading
    if (!loading && isInitialized) {
      if (!user) {
        console.log("No user, redirecting to login")
        if (!redirected) {
          setRedirected(true)
          router.push("/auth/login")
        }
      } else {
        console.log("User found, role:", user.role)

        // IMPORTANT: Only redirect if we haven't already redirected
        // and if the user is not on the correct dashboard
        if (!redirected) {
          const currentPath = window.location.pathname

          // Check if user has the correct role for this section
          if (user.role === "admin" && !currentPath.startsWith("/admin")) {
            console.log("Admin user, redirecting to admin")
            setRedirected(true)
            router.push("/admin")
            return
          } else if (user.role === "owner" && !currentPath.startsWith("/dashboard/owner-dashboard")) {
            console.log("Owner user, redirecting to owner dashboard")
            setRedirected(true)
            router.push("/dashboard/owner-dashboard")
            return
          } else if (user.role === "user" && currentPath !== "/dashboard") {
            console.log("Regular user, redirecting to dashboard")
            setRedirected(true)
            router.push("/dashboard")
            return
          }
        }

        // If we're on the correct page for the user role, stop loading
        setIsLoading(false)
      }
    }
  }, [user, loading, isInitialized, router, redirected])

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.log("Forcing loading state to end after timeout")
        setIsLoading(false)
      }
    }, 5000) // 5 seconds timeout

    return () => clearTimeout(timeout)
  }, [isLoading])

  // Show loading state when auth is initializing or checking user
  if (loading || !isInitialized || (isLoading && user)) {
    console.log("Showing loading UI")
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  // Don't render anything if no user (will redirect to login)
  if (!user) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardNav userRole={user.role} />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
