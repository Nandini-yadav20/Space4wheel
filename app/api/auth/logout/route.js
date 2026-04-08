// app/api/auth/logout/route.js
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete("session")
    
    return NextResponse.json({
      success: true,
      message: "Logged out successfully"
    })
  } catch (error) {
    console.error("Error during logout:", error)
    return NextResponse.json({ error: "Logout failed" }, { status: 500 })
  }
}
