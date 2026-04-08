"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Users, Car, Clock, CreditCard, ClipboardCheck, AlertCircle } from "lucide-react"

export default function AdminDashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [pendingPlots, setPendingPlots] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [recentBookings, setRecentBookings] = useState([])
 
  useEffect(() => {
    
    const fetchAdminData = async () => {
      try {
        setLoading(true)

        // Fetch admin stats
        const statsResponse = await fetch("/api/admin/stats")
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }

        // Fetch pending plots
        const pendingPlotsResponse = await fetch("/api/admin/plots/status?status=pending")
        if (pendingPlotsResponse.ok) {
          const pendingPlotsData = await pendingPlotsResponse.json()
          setPendingPlots(pendingPlotsData)
        }

        // Fetch recent users
        const recentUsersResponse = await fetch("/api/admin/users/recent")
        if (recentUsersResponse.ok) {
          const recentUsersData = await recentUsersResponse.json()
          setRecentUsers(recentUsersData)
        }

        // Fetch recent bookings
        const recentBookingsResponse = await fetch("/api/admin/bookings/recent")
        if (recentBookingsResponse.ok) {
          const recentBookingsData = await recentBookingsResponse.json()
          setRecentBookings(recentBookingsData)
        }
      } catch (error) {
        console.error("Error fetching admin data:", error)
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchAdminData()
    } else {
      setLoading(false)
    }
  }, [user, router])

  
  
  

  if (loading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid gap-6">
          <div className="grid gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </div>
      </div>
    )
  }

 
  const displayStats = stats
  const displayPendingPlots = pendingPlots
  const displayRecentUsers = recentUsers
  const displayRecentBookings = recentBookings

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <div className="grid gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Users className="h-10 w-10 text-primary" />
                <h2 className="text-3xl font-bold">{displayStats.totalUsers}</h2>
                <p className="text-sm text-muted-foreground">Total Users</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Car className="h-10 w-10 text-primary" />
                <h2 className="text-3xl font-bold">{displayStats.totalPlots}</h2>
                <p className="text-sm text-muted-foreground">Total Plots</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-2">
                <Clock className="h-10 w-10 text-primary" />
                <h2 className="text-3xl font-bold">{displayStats.totalBookings}</h2>
                <p className="text-sm text-muted-foreground">Total Bookings</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-2">
                <CreditCard className="h-10 w-10 text-green-500" />
                <h2 className="text-3xl font-bold">₹{displayStats.totalRevenue}</h2>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription>Plots waiting for approval</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {displayPendingPlots.length === 0 ? (
                  <p className="text-center text-muted-foreground">No pending approvals</p>
                ) : (
                  displayPendingPlots.map((plot) => (
                    <div key={plot.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                      <div>
                        <p className="font-medium">{plot.name}</p>
                        <p className="text-sm text-muted-foreground">{plot.address}</p>
                        <p className="text-xs text-muted-foreground">Owner: {plot.ownerName}</p>
                      </div>
                      <Link href={`/admin/plots/${plot.id}`}>
                        <Button size="sm">Review</Button>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
            {displayPendingPlots.length > 0 && (
              <CardFooter>
                <Link href="/admin/approvals" className="w-full">
                  <Button variant="outline" className="w-full">
                    View All Pending Approvals
                  </Button>
                </Link>
              </CardFooter>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest users and bookings</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="users">
                <TabsList className="mb-4">
                  <TabsTrigger value="users">Users</TabsTrigger>
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                </TabsList>
                <TabsContent value="users">
                  <div className="space-y-4">
                    {displayRecentUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm capitalize">{user.role}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="bookings">
                  <div className="space-y-4">
                    {displayRecentBookings.map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between border-b pb-4 last:border-0">
                        <div>
                          <p className="font-medium">{booking.plotName}</p>
                          <p className="text-sm text-muted-foreground">{booking.date}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm">₹{booking.amount}</p>
                          <p
                            className={`text-xs ${booking.status === "confirmed" ? "text-green-500" : "text-red-500"}`}
                          >
                            {booking.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>System Overview</CardTitle>
              <CardDescription>Key metrics and statistics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                  <Users className="h-8 w-8 text-primary mb-2" />
                  <p className="text-lg font-bold">{displayStats.totalOwners}</p>
                  <p className="text-sm text-muted-foreground">Plot Owners</p>
                </div>
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mb-2" />
                  <p className="text-lg font-bold">{displayStats.pendingPlots}</p>
                  <p className="text-sm text-muted-foreground">Pending Plots</p>
                </div>
                <div className="flex flex-col items-center p-4 bg-muted rounded-lg">
                  <ClipboardCheck className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-lg font-bold">{displayStats.totalPlots - displayStats.pendingPlots}</p>
                  <p className="text-sm text-muted-foreground">Approved Plots</p>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-between w-full">
                <Link href="/admin/users">
                  <Button variant="outline">Manage Users</Button>
                </Link>
                <Link href="/admin/plots">
                  <Button variant="outline">Manage Plots</Button>
                </Link>
                <Link href="/admin/bookings">
                  <Button variant="outline">View Bookings</Button>
                </Link>
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
