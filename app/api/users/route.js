import { NextResponse } from "next/server"
import { initAdmin } from "@/lib/firebase/firebase-admin"
import adminDbService from "@/lib/firebase/admin-database"

export async function POST(request) {
  try {
    console.log("POST /api/users - initializing admin...")
    initAdmin()
    console.log("POST /api/users - admin initialized")

    const body = await request.json()
    console.log("POST /api/users - body received:", {
      uid: body.uid,
      email: body.email,
      name: body.name,
      role: body.role,
    })

    const { uid, email, name, role, createdAt } = body

    if (!uid || !email || !name || !role) {
      console.error("POST /api/users - missing fields:", { uid, email, name, role })
      return NextResponse.json(
        { success: false, error: "uid, email, name and role are required" },
        { status: 400 }
      )
    }

    console.log("POST /api/users - creating user in Firestore...")
    const result = await adminDbService.users.createUser(uid, {
      email,
      name,
      role,
      createdAt: createdAt || new Date().toISOString(),
    })

    console.log("POST /api/users - createUser result:", result)

    if (!result.success) {
      console.error("POST /api/users - Firestore error:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("POST /api/users - caught exception:")
    console.error("  message:", error.message)
    console.error("  stack:", error.stack)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}

export async function GET(request) {
  try {
    initAdmin()

    const { searchParams } = new URL(request.url)
    const role = searchParams.get("role")

    let result
    if (role) {
      result = await adminDbService.users.getUsersByRole(role)
    } else {
      result = await adminDbService.users.getAllUsers()
    }

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data: result.data })
  } catch (error) {
    console.error("Error in GET /api/users:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}