import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function GET(request) {
  try {
    // Get all users
    const result = await adminDbService.users.getAllUsers()

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    // Sort by creation date (most recent first) and limit to 5
    const recentUsers = result.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

    return NextResponse.json(recentUsers)
  } catch (error) {
    console.error("Error fetching recent users:", error)
    return NextResponse.json({ error: "Failed to fetch recent users" }, { status: 500 })
  }
}
