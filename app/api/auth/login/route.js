import { NextResponse } from "next/server"
import { getAdminAuth } from "@/lib/firebase/firebase-admin"

export async function POST(req) {
  try {
    const { idToken } = await req.json()

    if (!idToken) {
      return NextResponse.json({ error: "No token provided" }, { status: 400 })
    }

    const adminAuth = getAdminAuth()
    const decodedToken = await adminAuth.verifyIdToken(idToken)

    return NextResponse.json({ success: true, uid: decodedToken.uid }, { status: 200 })
  } catch (error) {
    console.error("LOGIN API ERROR:", error.code, error.message)
    return NextResponse.json({ error: error.message, code: error.code }, { status: 401 })
  }
}
