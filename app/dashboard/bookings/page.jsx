"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/firebase/auth-context"
import { useDatabase } from "@/lib/hooks/use-database"
import { Calendar, Clock, MapPin, Loader2 } from "lucide-react"

export default function BookingsPage() {
  const { user } = useAuth()
  const { getBookings, loading } = useDatabase()
  const [bookings, setBookings] = useState([])
  const [isLoading, setIsLoading] = useState(true)
 
  useEffect(() => {
    const fetchBookings = async () => {
      if (!user) return
  
      try {
        setIsLoading(true)
        const bookingsResponse = await fetch(`/api/bookings?userId=${user.uid}`)
          if (bookingsResponse.ok) {
            const bookingsData = await bookingsResponse.json()

            if (bookingsData.success && Array.isArray(bookingsData.data)) {
              setBookings(bookingsData.data)
            } else if (Array.isArray(bookingsData)) {

              setBookings(bookingsData)
          }
          else {
            console.error("Unexpected bookingsData response format:", bookingsData)
            setBookings([])
          }
        }
          else {
            console.error("Failed to fetch bookings:", await bookingsResponse.text())
          }
       // setBookings(Array.isArray(data) ? data : Object.values(data));
      } catch (error) {
        console.error("Error fetching bookings:", error)
      } finally {
        setIsLoading(false)
      }
    }
  
    if (user) {
      fetchBookings()
    }
  }, [user, getBookings])
    

  // Filter bookings by status
  const upcomingBookings = bookings.filter((booking) => booking.status === "confirmed" || booking.status === "pending")

  const pastBookings = bookings.filter((booking) => booking.status === "completed" || booking.status === "cancelled")

  if (isLoading || loading) {
    return (
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold mb-6">My Bookings</h1>
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto">
      <h1 className="text-3xl font-bold mb-6">My Bookings</h1>

      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming ({upcomingBookings.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({pastBookings.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6">
          {upcomingBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="mb-4">You don't have any upcoming bookings.</p>
                <Link href="/dashboard/find">
                  <Button>Find Parking</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingBookings.map((booking) => (
                <Card key={booking.id} className="border-primary">
                  <CardHeader>
                    <CardTitle>{booking.plotName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {booking.plotAddress || booking.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="font-medium">Total Paid:</span>
                          <span className="font-bold">₹{booking.price}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    <Link href={`/dashboard/bookings/${booking.id}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                    <Link href={`/dashboard/plots/${booking.plotId}`} className="flex-1">
                      <Button variant="outline" className="w-full">
                        View Location
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6">
          {pastBookings.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p>You don't have any past bookings.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pastBookings.map((booking) => (
                <Card key={booking.id}>
                  <CardHeader>
                    <CardTitle>{booking.plotName}</CardTitle>
                    <CardDescription className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {booking.plotAddress || booking.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {booking.startTime} - {booking.endTime}
                        </span>
                      </div>
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between">
                          <span className="font-medium">Total Paid:</span>
                          <span className="font-bold">₹{booking.price}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Link href={`/dashboard/bookings/${booking.id}`} className="w-full">
                      <Button variant="outline" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
