"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthProvider } from "@/lib/firebase/auth-context"
import { useAuth } from "@/lib/firebase/auth-context"
import { AdminNav } from "@/components/admin/admin-nav"
import { Loader2 } from "lucide-react"

export default function AdminLayout({ children }) {
  return (
    <AuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AuthProvider>
  )
}

function AdminLayoutContent({ children }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [userRole, setUserRole] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login")
      } else {
        // Get user role from Firestore
        const fetchUserRole = async () => {
          try {
            const userDoc = await fetch(`/api/users/${user.uid}`)
            const userData = await userDoc.json()

            if (userData.role !== "admin") {
              // Redirect non-admin users
              router.push("/dashboard")
              return
            }

            setUserRole(userData.role)
          } catch (error) {
            console.error("Error fetching user role:", error)
            router.push("/dashboard")
          } finally {
            setIsLoading(false)
          }
        }

        fetchUserRole()
      }
    }
  }, [user, loading, router])

  if (loading || isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user || userRole !== "admin") {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AdminNav />
      <main className="flex-1 p-4 md:p-6">{children}</main>
    </div>
  )
}
