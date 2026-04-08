"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/firebase/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Calendar, Clock, Car, MapPin, Search, Navigation, Bookmark } from "lucide-react"

export default function UserDashboard() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [nearbyPlots, setNearbyPlots] = useState([])
  const [recentBookings, setRecentBookings] = useState([])
  const [userLocation, setUserLocation] = useState({ lat: 40.7128, lng: -74.006 }) // Default to NYC
  const [error, setError] = useState(null)

  useEffect(() => {
    console.log("Dashboard page effect running", {
      loading,
      user: user ? "User exists" : "No user",
      userRole: user?.role,
    })

    // Don't do anything if auth is still loading
    if (loading) return

    // Redirect if not a regular user
    if (user && user.role !== "user") {
      if (user.role === "owner") { 
        router.push("dashboard/owner-dashboard")
      } else if (user.role === "admin") {
        router.push("/admin")
      }
      return
    }

    // Get user's location if available
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("Error getting location:", error)
        },
      )
    }

    const fetchDashboardData = async () => {
      try {
        setDashboardLoading(true)
        setError(null)

        // Fetch nearby plots
        const nearbyResponse = await fetch(
          `/api/plots/nearby?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=10`,
        )
        if (nearbyResponse.ok) {
          const nearbyData = await nearbyResponse.json()
          // Check if the response has a data property and it's an array
          if (nearbyData.success && Array.isArray(nearbyData.data)) {
            setNearbyPlots(nearbyData.data)
          } else if (Array.isArray(nearbyData)) {
            setNearbyPlots(nearbyData)
          } else {
            console.error("Unexpected nearby plots response format:", nearbyData)
            setNearbyPlots([])
          }
        } else {
          console.error("Failed to fetch nearby plots:", await nearbyResponse.text())
          setNearbyPlots([])
        }

        // Fetch user's bookings
        if (user) {
          const bookingsResponse = await fetch(`/api/bookings?userId=${user.uid}`)
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json()
            // Check if the response has a data property and it's an array
            if (bookingsData.success && Array.isArray(bookingsData.data)) {
              setRecentBookings(bookingsData.data)
            } else if (Array.isArray(bookingsData)) {
              setRecentBookings(bookingsData)
            } else {
              console.error("Unexpected bookings response format:", bookingsData)
              setRecentBookings([])
            }
          } else {
            console.error("Failed to fetch bookings:", await bookingsResponse.text())
            setRecentBookings([])
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
        setError("Failed to load dashboard data. Please try again.")
        setNearbyPlots([])
        setRecentBookings([])
      } finally {
        setDashboardLoading(false)
      }
    }

    if (user) {
      fetchDashboardData()
    } else {
      setDashboardLoading(false)
    }
  }, [user, loading, router, userLocation.lat, userLocation.lng])

  // Show loading state when auth is loading
  if (loading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
        <div className="grid gap-6">
          <div className="grid gap-4">
            <Skeleton className="h-8 w-48" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">User Dashboard</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
        <h1 className="text-3xl font-bold">Welcome, {user?.displayName || "User"}</h1>
        <div className="mt-4 md:mt-0 flex gap-3">
          <Button className="btn-hover-effect" onClick={() => router.push("/dashboard/vehicles")}>
            <Car className="h-5 w-5" />
            My Vehicles
          </Button>
          <Button className="btn-hover-effect" onClick={() => router.push("/dashboard/find")}>
            <Search className="mr-2 h-4 w-4" />
            Find Parking
          </Button>
          <Button variant="outline" className="btn-hover-effect" onClick={() => router.push("/dashboard/bookings")}>
            <Bookmark className="mr-2 h-4 w-4" />
            My Bookings
          </Button>
        </div>
      </div>

      <div className="grid gap-8">
        <div className="gradient-border">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-none">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold mb-2">Find the Perfect Parking Spot</h2>
                  <p className="text-muted-foreground mb-4">
                    Search for parking spots near your destination, compare prices, and book in advance.
                  </p>
                  <Button className="btn-hover-effect" size="lg" onClick={() => router.push("/dashboard/find")}>
                    <Navigation className="mr-2 h-5 w-5" />
                    Explore Nearby Spots
                  </Button>
                </div>
                <div className="w-full md:w-1/3 flex justify-center">
                  <div className="relative w-48 h-48 animate-float">
                    <div className="absolute inset-0 bg-blue-500 rounded-full opacity-10 animate-pulse-shadow"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Car className="h-24 w-24 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="nearby" className="mt-6">
          <TabsList className="mb-6 bg-muted/50 p-1">
            <TabsTrigger value="nearby" className="text-base py-2 px-4">
              <MapPin className="mr-2 h-4 w-4" />
              Nearby Parking
            </TabsTrigger>
            <TabsTrigger value="bookings" className="text-base py-2 px-4">
              <Calendar className="mr-2 h-4 w-4" />
              My Bookings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="nearby">
            {dashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nearbyPlots.length === 0 ? (
                  <Card className="col-span-full">
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center">
                        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg mb-4">No nearby parking spots found.</p>
                        <Link href="/dashboard/find">
                          <Button className="btn-hover-effect">Find Parking</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  nearbyPlots.map((plot) => (
                    <Card key={plot.id} className="card-interactive overflow-hidden">
                      <div className="h-40 bg-muted relative">
                        {plot.images && plot.images.length > 0 ? (
                          <img
                            src={plot.images[0] || "/placeholder.svg"}
                            alt={plot.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-blue-100 dark:bg-blue-900">
                            <Car className="h-16 w-16 text-blue-500/50" />
                          </div>
                        )}
                        <div className="absolute top-2 right-2 bg-primary text-white text-sm font-medium px-2 py-1 rounded">
                          ₹{plot.price}/hr
                        </div>
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle>{plot.name}</CardTitle>
                        <CardDescription className="flex items-center">
                          <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{plot.address}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center">
                            <Car className="h-4 w-4 text-muted-foreground mr-1" />
                            <span>
                              {plot.availableSlots}/{plot.totalSlots} slots
                            </span>
                          </div>
                          <div className="flex items-center">
                            <Navigation className="h-4 w-4 text-muted-foreground mr-1" />
                            <span>{plot.distance?.toFixed(1) || "N/A"} Kilometers</span>
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Link href={`/dashboard/plots/${plot.id}`} className="w-full">
                          <Button className="w-full btn-hover-effect">Book Now</Button>
                        </Link>
                      </CardFooter>
                    </Card>
                  ))
                )}
              </div>
            )}

            <div className="mt-8 text-center">
              <Link href="/dashboard/find">
                <Button variant="outline" className="btn-hover-effect">
                  <Search className="mr-2 h-4 w-4" />
                  View All Parking Spots
                </Button>
              </Link>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            {dashboardLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
              </div>
            ) : (
              <>
                {recentBookings.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="flex flex-col items-center">
                        <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-lg mb-4">You don't have any bookings yet.</p>
                        <Link href="/dashboard/find">
                          <Button className="btn-hover-effect">Find Parking</Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {recentBookings.map((booking) => (
                      <Card
                        key={booking.id}
                        className={`card-interactive ${
                          booking.status === "confirmed"
                            ? "border-l-4 border-l-green-500"
                            : booking.status === "cancelled"
                              ? "border-l-4 border-l-red-500"
                              : ""
                        }`}
                      >
                        <CardHeader>
                          <CardTitle>{booking.plotName}</CardTitle>
                          <CardDescription>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>{booking.date}</span>
                            </div>
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-2">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {booking.startTime} - {booking.endTime}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate">{booking.plotAddress}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Car className="h-4 w-4 text-muted-foreground" />
                              <span>
                                Status:{" "}
                                <span
                                  className={`capitalize font-medium ${
                                    booking.status === "confirmed"
                                      ? "text-green-500"
                                      : booking.status === "cancelled"
                                        ? "text-red-500"
                                        : "text-yellow-500"
                                  }`}
                                >
                                  {booking.status}
                                </span>
                              </span>
                            </div>
                          </div>
                        </CardContent>
                        <CardFooter>
                          <Link href={`/dashboard/bookings/${booking.id}`} className="w-full">
                            <Button variant="outline" className="w-full btn-hover-effect">
                              View Details
                            </Button>
                          </Link>
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            <div className="mt-8 text-center">
              <Link href="/dashboard/bookings">
                <Button variant="outline" className="btn-hover-effect">
                  <Bookmark className="mr-2 h-4 w-4" />
                  View All Bookings
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
