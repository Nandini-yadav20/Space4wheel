"use client"

const CHECKOUT_SESSION_KEY = "pendingSlotBooking"

export function saveCheckoutSession(session) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(CHECKOUT_SESSION_KEY, JSON.stringify(session))
}

export function readCheckoutSession() {
  if (typeof window === "undefined") return null

  try {
    const raw = sessionStorage.getItem(CHECKOUT_SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function clearCheckoutSession() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(CHECKOUT_SESSION_KEY)
}

export function hasActiveCheckoutForSlot(plotId, slotKey) {
  const session = readCheckoutSession()
  if (!session) return false

  return session.status === "active" && session.plotId === plotId && session.slotKey === slotKey
}
