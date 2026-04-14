"use client"

// app/dashboard/owner-dashboard/page.jsx

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import {
  Plus, Car, Clock, CreditCard, AlertCircle, TrendingUp,
  Edit2, Eye, MapPin, BarChart3, Calendar, IndianRupee,
  CheckCircle2, XCircle, Hourglass, RefreshCw, ArrowUpRight,
  Layers, Star, Users, Trash2,
} from "lucide-react"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700" },
    pending:  { label: "Pending",  cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700" },
    rejected: { label: "Rejected", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-700" },
  }
  const cfg = map[status] || map.pending
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      {cfg.label}
    </span>
  )
}

// ── Booking status badge ──────────────────────────────────────────────────────
function BookingBadge({ status }) {
  const map = {
    confirmed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    pending:   "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    cancelled: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
    completed: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${map[status] || map.pending}`}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </span>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, value, label, iconClass, trend }) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
            {trend !== undefined && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                <ArrowUpRight className="h-3 w-3" />
                {trend >= 0 ? "+" : ""}{trend}% this month
              </p>
            )}
          </div>
          <div className={`p-3 rounded-xl ${iconClass}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Plot card ─────────────────────────────────────────────────────────────────
function PlotCard({ plot, bookingCount, revenue, onDelete }) {
  const imageUrl = plot.images?.[0]
    ? (typeof plot.images[0] === "object" ? plot.images[0].url : plot.images[0])
    : null

  const occupancyPct = plot.totalSlots > 0
    ? Math.round(((plot.totalSlots - (plot.availableSlots ?? plot.totalSlots)) / plot.totalSlots) * 100)
    : 0

  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
      {/* Image */}
      <div className="relative h-44 bg-muted overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={plot.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => { e.target.style.display = "none" }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <Car className="h-12 w-12 text-slate-400" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <StatusBadge status={plot.approvalStatus} />
        </div>
        {/* Occupancy overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-3 py-2">
          <div className="flex items-center justify-between text-white text-xs">
            <span>{plot.availableSlots ?? plot.totalSlots}/{plot.totalSlots} slots free</span>
            <span className="font-semibold">₹{plot.price}/hr</span>
          </div>
          <div className="mt-1 h-1 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-400 rounded-full transition-all"
              style={{ width: `${100 - occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-1">{plot.name}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs line-clamp-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {plot.address}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-3 flex-grow">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Bookings</span>
            <span className="font-semibold">{bookingCount ?? 0}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground text-xs">Revenue</span>
            <span className="font-semibold text-emerald-600">₹{(revenue ?? 0).toFixed(0)}</span>
          </div>
          {plot.rating > 0 && (
            <div className="flex items-center gap-1 col-span-2">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-medium">{plot.rating.toFixed(1)}</span>
              <span className="text-xs text-muted-foreground">({plot.reviewCount ?? 0} reviews)</span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        <Link href={`/dashboard/plots/${plot.id}`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">
            <Eye className="mr-1.5 h-3.5 w-3.5" />
            View
          </Button>
        </Link>
        <Link href={`/dashboard/plots/${plot.id}/manage`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
        <Button variant="destructive" size="sm" onClick={() => onDelete(plot)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function OwnerDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [userPlots, setUserPlots] = useState([])
  const [allBookings, setAllBookings] = useState([])
  const [monthlyEarnings, setMonthlyEarnings] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const [plotBookingMap, setPlotBookingMap]   = useState({}) // plotId → { count, revenue }
  const [selectedSlotPlotId, setSelectedSlotPlotId] = useState("all")
  const [stats, setStats] = useState({
    totalPlots: 0, pendingPlots: 0, approvedPlots: 0,
    totalBookings: 0, totalRevenue: 0, monthlyRevenue: 0,
  })

  const fetchOwnerData = useCallback(async (showRefresh = false) => {
    if (!user) return
    showRefresh ? setRefreshing(true) : setLoading(true)

    try {
      // 1. Fetch plots
      const plotsRes = await fetch(`/api/plots?ownerId=${user.uid}`)
      if (!plotsRes.ok) throw new Error("Failed to fetch plots")
      const plotsData = await plotsRes.json()
      const plots = Array.isArray(plotsData)
        ? plotsData
        : Array.isArray(plotsData?.data)
          ? plotsData.data
          : []
      setUserPlots(plots)

      const pending  = plots.filter(p => p.approvalStatus === "pending").length
      const approved = plots.filter(p => p.approvalStatus === "approved").length

      // 2. Fetch bookings for every plot in parallel
      const bookingsByPlot = await Promise.all(
        plots.map(async (plot) => {
          try {
            const res = await fetch(`/api/bookings?plotId=${plot.id}`)
            if (!res.ok) return { plotId: plot.id, bookings: [] }
            const data = await res.json()
            const arr = Array.isArray(data)
              ? data
              : Array.isArray(data.data) ? data.data : []
            return { plotId: plot.id, bookings: arr }
          } catch {
            return { plotId: plot.id, bookings: [] }
          }
        })
      )

      // Flatten + build per-plot map
      const pbMap = {}
      const flat = []
      bookingsByPlot.forEach(({ plotId, bookings }) => {
        let count = 0, revenue = 0
        bookings.forEach(b => {
          flat.push(b)
          if (b.status !== "cancelled") {
            count++
            revenue += b.amount || b.totalPrice || 0
          }
        })
        pbMap[plotId] = { count, revenue }
      })
      flat.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setAllBookings(flat)
      setPlotBookingMap(pbMap)

      // 3. Revenue aggregation
      const totalRevenue = flat.reduce((s, b) =>
        b.status !== "cancelled" ? s + (b.amount || b.totalPrice || 0) : s, 0)

      const monthlyData = {}
      flat.forEach(b => {
        if (b.status !== "cancelled" && b.createdAt) {
          const m = new Date(b.createdAt).toISOString().slice(0, 7)
          monthlyData[m] = (monthlyData[m] || 0) + (b.amount || b.totalPrice || 0)
        }
      })
      setMonthlyEarnings(monthlyData)

      const curMonth = new Date().toISOString().slice(0, 7)

      setStats({
        totalPlots: plots.length,
        pendingPlots: pending,
        approvedPlots: approved,
        totalBookings: flat.filter(b => b.status !== "cancelled").length,
        totalRevenue,
        monthlyRevenue: monthlyData[curMonth] || 0,
      })
    } catch (err) {
      console.error("Owner data fetch error:", err)
      toast({ variant: "destructive", title: "Error", description: "Failed to load dashboard data." })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user, toast])

  const handleDeletePlot = async (plot) => {
    const confirmed = window.confirm(`Delete "${plot.name}" permanently?`)
    if (!confirmed) return

    try {
      const res = await fetch(`/api/plots/${plot.id}`, { method: "DELETE" })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok || payload?.success === false) {
        throw new Error(payload?.error || "Failed to delete plot")
      }

      toast({ title: "Plot deleted", description: `${plot.name} was removed successfully.` })
      fetchOwnerData(true)
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error?.message || "Could not delete plot",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (user && user.role !== "owner") {
      router.push(user.role === "admin" ? "/admin" : "/dashboard")
      return
    }
    if (user) fetchOwnerData()
    else setLoading(false)
  }, [user, router, fetchOwnerData])

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72" />)}
        </div>
      </div>
    )
  }

  const recentBookings = allBookings.slice(0, 8)
  const monthOptions = Object.keys(monthlyEarnings).sort().reverse()
  const selectedSlotPlot =
    selectedSlotPlotId === "all"
      ? null
      : userPlots.find((plot) => plot.id === selectedSlotPlotId) || null
  const selectedSlotsBooked = selectedSlotPlot
    ? Math.max(0, (selectedSlotPlot.totalSlots || 0) - (selectedSlotPlot.availableSlots ?? selectedSlotPlot.totalSlots ?? 0))
    : userPlots.reduce((sum, plot) => sum + Math.max(0, (plot.totalSlots || 0) - (plot.availableSlots ?? plot.totalSlots ?? 0)), 0)
  const selectedSlotsTotal = selectedSlotPlot
    ? selectedSlotPlot.totalSlots || 0
    : userPlots.reduce((sum, plot) => sum + (plot.totalSlots || 0), 0)
  const selectedSlotsAvailable = selectedSlotPlot
    ? selectedSlotPlot.availableSlots ?? selectedSlotPlot.totalSlots ?? 0
    : userPlots.reduce((sum, plot) => sum + (plot.availableSlots ?? plot.totalSlots ?? 0), 0)
  const selectedSlotsHeld = Math.max(0, selectedSlotsTotal - selectedSlotsAvailable - selectedSlotsBooked)
  const occupancyRate = selectedSlotsTotal > 0
    ? Math.round((selectedSlotsBooked / selectedSlotsTotal) * 100)
    : 0

  return (
    <div className="container mx-auto py-6 space-y-8">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Owner Dashboard</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Welcome back, {user?.displayName?.split(" ")[0] || "Owner"} 👋
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchOwnerData(true)}
            disabled={refreshing}
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
          <Link href="/dashboard/plots/add">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Plot
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="col-span-2 md:col-span-3 lg:col-span-2">
          <StatCard
            icon={IndianRupee}
            value={`₹${stats.totalRevenue.toFixed(0)}`}
            label="Total Revenue"
            iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          />
        </div>
        <div className="col-span-2 md:col-span-3 lg:col-span-2">
          <StatCard
            icon={TrendingUp}
            value={`₹${stats.monthlyRevenue.toFixed(0)}`}
            label="This Month"
            iconClass="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400"
          />
        </div>
        <StatCard
          icon={Car}
          value={stats.totalPlots}
          label="Total Plots"
          iconClass="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400"
        />
        <StatCard
          icon={Clock}
          value={stats.totalBookings}
          label="Total Bookings"
          iconClass="bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400"
        />
      </div>

      {/* ── Approval status bar ── */}
      {stats.pendingPlots > 0 && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/20">
          <Hourglass className="h-5 w-5 text-amber-600 shrink-0" />
          <div className="flex-grow">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {stats.pendingPlots} plot{stats.pendingPlots > 1 ? "s" : ""} pending admin approval
            </p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70">
              You'll be notified once they're reviewed. Active plots: {stats.approvedPlots}
            </p>
          </div>
        </div>
      )}

      {/* ── Main tabs ── */}
      <Tabs defaultValue="plots">
        <TabsList className="mb-2">
          <TabsTrigger value="plots" className="gap-1.5">
            <Layers className="h-4 w-4" />
            My Plots ({userPlots.length})
          </TabsTrigger>
          <TabsTrigger value="bookings" className="gap-1.5">
            <Calendar className="h-4 w-4" />
            Bookings ({allBookings.length})
          </TabsTrigger>
          <TabsTrigger value="earnings" className="gap-1.5">
            <BarChart3 className="h-4 w-4" />
            Earnings
          </TabsTrigger>
          <TabsTrigger value="slots" className="gap-1.5">
            <Car className="h-4 w-4" />
            Slot Management
          </TabsTrigger>
        </TabsList>

        {/* ── PLOTS TAB ── */}
        <TabsContent value="plots" className="mt-4">
          {userPlots.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Car className="h-8 w-8 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-lg">No parking plots yet</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    Add your first parking plot to start earning.
                  </p>
                </div>
                <Link href="/dashboard/plots/add">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Plot
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Filter strip */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {["all", "approved", "pending", "rejected"].map(f => {
                  const count = f === "all"
                    ? userPlots.length
                    : userPlots.filter(p => p.approvalStatus === f).length
                  return (
                    <button key={f} className="px-3 py-1 text-xs rounded-full border font-medium transition-colors hover:bg-muted capitalize">
                      {f} ({count})
                    </button>
                  )
                })}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {userPlots.map(plot => (
                  <PlotCard
                    key={plot.id}
                    plot={plot}
                    bookingCount={plotBookingMap[plot.id]?.count}
                    revenue={plotBookingMap[plot.id]?.revenue}
                    onDelete={handleDeletePlot}
                  />
                ))}

                {/* Add new card */}
                <Link href="/dashboard/plots/add" className="block">
                  <div className="h-full min-h-[280px] rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer">
                    <Plus className="h-8 w-8" />
                    <span className="text-sm font-medium">Add New Plot</span>
                  </div>
                </Link>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── BOOKINGS TAB ── */}
        <TabsContent value="bookings" className="mt-4">
          {allBookings.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Calendar className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                <p className="font-medium">No bookings yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Bookings for your plots will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Recent Bookings</CardTitle>
                <CardDescription>Showing {Math.min(allBookings.length, 8)} of {allBookings.length} bookings</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {recentBookings.map((booking) => {
                    const plot = userPlots.find(p => p.id === booking.plotId)
                    return (
                      <div key={booking.id} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/40 transition-colors">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                          <Car className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-grow min-w-0">
                          <p className="font-medium text-sm truncate">
                            {booking.plotName || plot?.name || "Parking Slot"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.slotNumber ? `Slot #${booking.slotNumber} · ` : ""}
                            {booking.date || (booking.startTime ? new Date(booking.startTime).toLocaleDateString("en-IN") : "—")}
                          </p>
                          {(booking.vehicle?.registrationNumber || booking.vehicleNumber) && (
                            <p className="text-xs text-muted-foreground">
                              {booking.vehicle?.registrationNumber || booking.vehicleNumber}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-semibold text-sm text-emerald-600">
                            ₹{(booking.amount || booking.totalPrice || 0).toFixed(0)}
                          </p>
                          <BookingBadge status={booking.status} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
              {allBookings.length > 8 && (
                <CardFooter className="pt-4">
                  <p className="text-xs text-muted-foreground text-center w-full">
                    Showing 8 of {allBookings.length} bookings
                  </p>
                </CardFooter>
              )}
            </Card>
          )}
        </TabsContent>

        {/* ── EARNINGS TAB ── */}
        <TabsContent value="earnings" className="mt-4 space-y-4">
          {/* Month picker + spotlight */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <CardTitle className="text-base">Monthly Breakdown</CardTitle>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.length > 0 ? (
                      monthOptions.map(m => (
                        <SelectItem key={m} value={m}>
                          {new Date(m + "-01").toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={selectedMonth}>
                        {new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Earnings</p>
                <p className="text-5xl font-bold text-emerald-600">
                  ₹{(monthlyEarnings[selectedMonth] || 0).toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground mt-3">
                  {new Date(selectedMonth + "-01").toLocaleDateString("en-IN", { year: "numeric", month: "long" })}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Per-plot earnings */}
          {userPlots.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Per-Plot Earnings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {userPlots.map(plot => {
                  const rev = plotBookingMap[plot.id]?.revenue || 0
                  const maxRev = Math.max(...Object.values(plotBookingMap).map(v => v.revenue), 1)
                  return (
                    <div key={plot.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium truncate max-w-[60%]">{plot.name}</span>
                        <span className="font-semibold text-emerald-600">₹{rev.toFixed(0)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${(rev / maxRev) * 100}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* All-time summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <IndianRupee className="h-6 w-6 mx-auto text-emerald-500 mb-2" />
                <p className="text-2xl font-bold">₹{stats.totalRevenue.toFixed(0)}</p>
                <p className="text-xs text-muted-foreground mt-1">All-time Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <Users className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{stats.totalBookings}</p>
                <p className="text-xs text-muted-foreground mt-1">Total Bookings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <CheckCircle2 className="h-6 w-6 mx-auto text-violet-500 mb-2" />
                <p className="text-2xl font-bold">{stats.approvedPlots}</p>
                <p className="text-xs text-muted-foreground mt-1">Active Plots</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slots" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <CardTitle className="text-base">Live Slot Status</CardTitle>
                  <CardDescription>Track available, booked, and held slots in real time.</CardDescription>
                </div>
                <Select value={selectedSlotPlotId} onValueChange={setSelectedSlotPlotId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select plot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All plots</SelectItem>
                    {userPlots.map((plot) => (
                      <SelectItem key={plot.id} value={plot.id}>
                        {plot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-emerald-600">{selectedSlotsAvailable}</p>
                    <p className="text-xs text-muted-foreground mt-1">Available</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-blue-600">{selectedSlotsBooked}</p>
                    <p className="text-xs text-muted-foreground mt-1">Booked</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-3xl font-bold text-amber-600">{selectedSlotsHeld}</p>
                    <p className="text-xs text-muted-foreground mt-1">Held</p>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Occupancy Rate</span>
                  <span className="font-semibold">{occupancyRate}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${occupancyRate}%` }}
                  />
                </div>
              </div>
              {selectedSlotPlot && (
                <Link href={`/dashboard/plots/${selectedSlotPlot.id}/manage`}>
                  <Button variant="outline" className="w-full">Manage Selected Plot</Button>
                </Link>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}