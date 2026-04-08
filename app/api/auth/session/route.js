import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { initAdmin } from "@/lib/firebase/firebase-admin"
import adminDbService from "@/lib/firebase/admin-database"

export async function POST(request) {
  try {
    initAdmin()

    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { success: false, error: "ID token is required" },
        { status: 400 }
      )
    }

    const sessionCookieResult = await adminDbService.auth.createSessionCookie(
      idToken,
      { expiresIn: 60 * 60 * 24 * 5 * 1000 } // 5 days in ms
    )

    if (!sessionCookieResult.success) {
      console.error("Session cookie creation failed:", sessionCookieResult.error)
      return NextResponse.json(
        { success: false, error: "Failed to create session" },
        { status: 401 }
      )
    }

    const cookieStore = await cookies()
    cookieStore.set({
      name: "session",
      value: sessionCookieResult.data.sessionCookie, // ✅ fixed: was .sessionCookie, now .data.sessionCookie
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 5,
      path: "/",
      sameSite: "strict",
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error creating session:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}