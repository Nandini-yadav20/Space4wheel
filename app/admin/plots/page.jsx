"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { MoreHorizontal, Search, MapPin, Star, Car } from "lucide-react"

export default function AdminPlotsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [plots, setPlots] = useState([])
  const [filteredPlots, setFilteredPlots] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect if not an admin
    if (user && user.role !== "admin") {
      if (user.role === "owner") {
        router.push("/dashboard/owner-dashboard")
      } else {
        router.push("/dashboard")
      }
      return
    }

    const fetchPlots = async () => {
      try {
        setIsLoading(true)
        const response = await fetch("/api/admin/plots")

        if (!response.ok) {
          throw new Error("Failed to fetch plots")
        }

        const data = await response.json()
        setPlots(data)
        setFilteredPlots(data)
      } catch (error) {
        console.error("Error fetching plots:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load plots. Please try again.",
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (user) {
      fetchPlots()
    }
  }, [user, router, toast])

  useEffect(() => {
    let filtered = plots

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((plot) => plot.approvalStatus === statusFilter)
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      const lowercasedQuery = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (plot) =>
          plot.name?.toLowerCase().includes(lowercasedQuery) ||
          plot.address?.toLowerCase().includes(lowercasedQuery) ||
          plot.ownerName?.toLowerCase().includes(lowercasedQuery),
      )
    }

    setFilteredPlots(filtered)
  }, [searchQuery, statusFilter, plots])

  const handleViewPlot = (plotId) => {
    router.push(`/admin/plots/${plotId}`)
  }

  const handleApprovePlot = async (plotId) => {
    try {
      const response = await fetch(`/api/admin/plots/${plotId}/approve`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to approve plot")
      }

      // Update local state
      const updatedPlots = plots.map((plot) => (plot.id === plotId ? { ...plot, approvalStatus: "approved" } : plot))

      setPlots(updatedPlots)

      toast({
        title: "Plot Approved",
        description: "The plot has been approved successfully.",
      })
    } catch (error) {
      console.error("Error approving plot:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to approve plot. Please try again.",
      })
    }
  }

  const handleRejectPlot = async (plotId) => {
    try {
      // In a real app, you would prompt for a reason
      const reason = "Does not meet our requirements"

      const response = await fetch(`/api/admin/plots/${plotId}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject plot")
      }

      // Update local state
      const updatedPlots = plots.map((plot) => (plot.id === plotId ? { ...plot, approvalStatus: "rejected" } : plot))

      setPlots(updatedPlots)

      toast({
        title: "Plot Rejected",
        description: "The plot has been rejected.",
      })
    } catch (error) {
      console.error("Error rejecting plot:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to reject plot. Please try again.",
      })
    }
  }

  
 
  const displayPlots = filteredPlots;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Plot Management</h1>
        <Card>
          <CardHeader>
            <CardTitle>Parking Plots</CardTitle>
            <CardDescription>Manage all parking plots in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-96 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Plot Management</h1>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Parking Plots</CardTitle>
              <CardDescription>Manage all parking plots in the system</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Search plots..."
                  className="pl-8 w-full md:w-[250px]"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Slots</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayPlots.map((plot) => (
                <TableRow key={plot.id}>
                  <TableCell className="font-medium">{plot.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate max-w-[150px]">{plot.address}</span>
                    </div>
                  </TableCell>
                  <TableCell>{plot.ownerName}</TableCell>
                  <TableCell>₹{plot.price}/hr</TableCell>
                  <TableCell>
                    {plot.availableSlots}/{plot.totalSlots}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span>
                        {plot.rating} ({plot.reviewCount})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        plot.approvalStatus === "approved"
                          ? "success"
                          : plot.approvalStatus === "pending"
                            ? "outline"
                            : "destructive"
                      }
                    >
                      {plot.approvalStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewPlot(plot.id)}>View Details</DropdownMenuItem>
                        {plot.approvalStatus === "pending" && (
                          <>
                            <DropdownMenuItem onClick={() => handleApprovePlot(plot.id)}>Approve</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600" onClick={() => handleRejectPlot(plot.id)}>
                              Reject
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Total: {displayPlots.length} plots</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
