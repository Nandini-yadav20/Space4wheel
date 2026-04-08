import { NextResponse } from "next/server"
import adminDbService from "@/lib/firebase/admin-database"
import { initAdmin } from "@/lib/firebase/firebase-admin"

// Initialize Firebase Admin
initAdmin()

export async function GET(request) {
  try {
    // Get total users
    const usersResult = await adminDbService.users.getAllUsers()
    if (!usersResult.success) {
      return NextResponse.json({ error: usersResult.error }, { status: 500 })
    }
    const users = usersResult.data

    // Get total plots
    const plotsResult = await adminDbService.plots.getAllPlots()
    if (!plotsResult.success) {
      return NextResponse.json({ error: plotsResult.error }, { status: 500 })
    }
    const plots = plotsResult.data

    // Get total bookings
    const bookingsResult = await adminDbService.bookings.getAllBookings()
    if (!bookingsResult.success) {
      return NextResponse.json({ error: bookingsResult.error }, { status: 500 })
    }
    const bookings = bookingsResult.data

    // Calculate statistics
    const totalUsers = users.length
    const totalOwners = users.filter((user) => user.role === "owner").length
    const totalPlots = plots.length
    const pendingPlots = plots.filter((plot) => plot.approvalStatus === "pending").length
    const totalBookings = bookings.length

    // Calculate total revenue (from confirmed bookings)
    const totalRevenue = bookings
      .filter((booking) => booking.status === "confirmed")
      .reduce((sum, booking) => sum + (booking.amount || 0), 0)

    return NextResponse.json({
      totalUsers,
      totalOwners,
      totalPlots,
      pendingPlots,
      totalBookings,
      totalRevenue,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json({ error: "Failed to fetch admin stats" }, { status: 500 })
  }
}
