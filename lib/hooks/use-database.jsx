"use client"

import { useState, useCallback } from "react"
import { useAuth } from "@/lib/firebase/auth-context"

export function useDatabase() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)

  // Get plot by ID
  const getPlotById = useCallback(async (plotId) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/plots/${plotId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch plot")
      }

      const data = await response.json()
      return data.success ? data.data : null
    } catch (error) {
      console.error("Error fetching plot:", error)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  // Get reviews by plot ID
  const getReviewsByPlotId = useCallback(async (plotId) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/reviews?plotId=${plotId}`)

      if (!response.ok) {
        throw new Error("Failed to fetch reviews")
      }

      const data = await response.json()
      return data.success ? data.data : []
    } catch (error) {
      console.error("Error fetching reviews:", error)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  // Create booking
  const createBooking = useCallback(
    async (bookingData) => {
      if (!user) {
        console.error("User not authenticated")
        return null
      }

      try {
        setLoading(true)
        const response = await fetch("/api/bookings", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...bookingData,
            userId: user.uid,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to create booking")
        }

        const data = await response.json()
        return data.success ? data.data : null
      } catch (error) {
        console.error("Error creating booking:", error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  // Process payment
  const processPayment = useCallback(
    async (bookingId, paymentDetails) => {
      if (!user) {
        console.error("User not authenticated")
        return null
      }

      try {
        setLoading(true)
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId,
            ...paymentDetails,
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to process payment")
        }

        const data = await response.json()
        return data.success ? data.data : null
      } catch (error) {
        console.error("Error processing payment:", error)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user],
  )

  // Get user bookings
  const getUserBookings = useCallback(async () => {
    if (!user) {
      console.error("User not authenticated")
      return []
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/bookings?userId=${user.uid}`)

      if (!response.ok) {
        throw new Error("Failed to fetch bookings")
      }

      const data = await response.json()
      return data.success ? data.data : []
    } catch (error) {
      console.error("Error fetching bookings:", error)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    loading,
    getPlotById,
    getReviewsByPlotId,
    createBooking,
    processPayment,
    getUserBookings,
  }
}
