import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const limit = searchParams.get("limit") ? Number.parseInt(searchParams.get("limit")) : 20

    if (!userId) {
      return NextResponse.json({ error: "Missing userId parameter" }, { status: 400 })
    }

    const result = await adminDbService.notifications.getNotificationsByUserId(userId, limit)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("Error fetching notifications:", error)
    return NextResponse.json({ error: "Failed to fetch notifications: " + error.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    // Initialize Firebase Admin
    initAdmin()

    const data = await request.json()

    // Validate required fields
    if (!data.userId || !data.type || !data.title || !data.message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const result = await adminDbService.notifications.createNotification(data)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result.data, { status: 201 })
  } catch (error) {
    console.error("Error creating notification:", error)
    return NextResponse.json({ error: "Failed to create notification: " + error.message }, { status: 500 })
  }
}
