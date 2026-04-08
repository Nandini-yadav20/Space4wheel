"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { MapComponent } from "@/components/map-component"
import {
  Search,
  MapPin,
  List,
  Loader2,
  Clock,
  IndianRupee,
  Zap,
  AlertCircle,
  CheckCircle2,
  Navigation,
  Car,
  ArrowUpDown,
  Star,
  StarHalf,
  Bookmark,
  Share2,
  SlidersHorizontal,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

// Maximum search radius in kilometers
const MAX_SEARCH_RADIUS = 20
// Initial search radius in kilometers
const INITIAL_SEARCH_RADIUS = 5
// Radius increment in kilometers when expanding search
const RADIUS_INCREMENT = 2

// Function to navigate to a location using Google Maps
function navigateToLocation(destination) {
  if (!navigator.geolocation) {
    alert("Geolocation not supported")
    return
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude
      const userLng = position.coords.longitude

      const destLat = destination.lat || destination.latitude
      const destLng = destination.lng || destination.longitude

      if (!destLat || !destLng) {
        alert("Destination coordinates not available")
        return
      }

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLat},${userLng}&destination=${destLat},${destLng}&travelmode=driving`
      window.open(mapsUrl, "_blank")
    },
    (error) => {
      console.error("Geolocation error:", error)
      alert("Could not get your location")
    },
    { enableHighAccuracy: true },
  )
}

export default function FindParkingPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchRadius, setSearchRadius] = useState(INITIAL_SEARCH_RADIUS)
  const [maxPrice, setMaxPrice] = useState(150)
  const [minAvailability, setMinAvailability] = useState(1)
  const [sortBy, setSortBy] = useState("distance")
  const [plots, setPlots] = useState([])
  const [filteredPlots, setFilteredPlots] = useState([])
  const [selectedPlot, setSelectedPlot] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSearching, setIsSearching] = useState(false)
  const [userLocation, setUserLocation] = useState(null)
  const [searchStatus, setSearchStatus] = useState("")
  const [searchProgress, setSearchProgress] = useState(0)
  const [expandingSearch, setExpandingSearch] = useState(false)
  const [currentSearchRadius, setCurrentSearchRadius] = useState(INITIAL_SEARCH_RADIUS)
  const [showFilters, setShowFilters] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [viewMode, setViewMode] = useState("grid") // grid or list
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState([])
  const [mapLayerVisible, setMapLayerVisible] = useState(true)
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false)

  // Get user's location on component mount
  useEffect(() => {
   const getUserLocation = () => {
  if (!navigator.geolocation) {
    setSearchError("Geolocation is not supported by your browser.")
    setIsLoading(false)
    return
  }

  setSearchStatus("Getting your location...")

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords

      console.log("User location:", latitude, longitude)

      setUserLocation({ lat: latitude, lng: longitude })
      setSearchStatus("Location found! Ready to search.")

      fetchNearbyPlots(latitude, longitude, searchRadius)
    },
    (error) => {
      console.error("Geolocation error:", error)

      // 🔥 FALLBACK LOCATION (VERY IMPORTANT)
      const fallback = { lat: 22.7196, lng: 75.8577 } // Indore

      setUserLocation(fallback)
      setSearchStatus("Using default location (Indore)")

      fetchNearbyPlots(fallback.lat, fallback.lng, searchRadius)

      setSearchError("Location access denied. Showing default location.")
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    }
  )
}

    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem("parkingFavorites")
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (e) {
        console.error("Error loading favorites:", e)
      }
    }
  }, [])

  // Save favorites to localStorage when they change
  useEffect(() => {
    localStorage.setItem("parkingFavorites", JSON.stringify(favorites))
  }, [favorites])

  // Fetch nearby plots based on coordinates and radius
  const fetchNearbyPlots = useCallback(
    async (lat, lng, radius) => {
      try {
        setIsSearching(true)
        setSearchStatus(`Searching for parking within ${radius} kilometers...`)
        setSearchProgress(30)

        // API call to get nearby plots
        const response = await fetch(`/api/plots/nearby?lat=${lat}&lng=${lng}&radius=${radius}`)

        setSearchProgress(70)

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch nearby plots")
        }

        const data = await response.json()
        setSearchProgress(100)

        // Ensure we have a valid data array
        const plotsData = Array.isArray(data.data) ? data.data : []

        if (data.success && plotsData.length > 0) {
          console.log(`Found ${plotsData.length} plots within ${radius} kilometers`, plotsData)

          // Add a random rating to each plot for demo purposes
          const enhancedPlots = plotsData.map((plot) => ({
            ...plot,
            rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3.0 and 5.0
            isFavorite: favorites.includes(plot.id),
          }))

          // Sort plots by distance
          const sortedPlots = sortPlots(enhancedPlots, sortBy)
          setPlots(sortedPlots)
          setFilteredPlots(sortedPlots)
          setSearchStatus(`Found ${plotsData.length} parking spots near you!`)
          return true // Results found
        } else {
          console.log(`No plots found within ${radius} kilometers`)
          setPlots([])
          setFilteredPlots([])
          setSearchStatus(`No parking spots found within ${radius} kilometers.`)
          return false // No results
        }
      } catch (error) {
        console.error("Error fetching nearby plots:", error)
        setSearchError(`Error searching for parking: ${error.message}`)
        setPlots([])
        setFilteredPlots([])
        return false
      } finally {
        setIsSearching(false)
        setIsLoading(false)
      }
    },
    [sortBy, favorites],
  )

  // Auto-expand search radius when no results are found
  const expandSearchRadius = useCallback(async () => {
    if (!userLocation) return

    setExpandingSearch(true)
    let radius = INITIAL_SEARCH_RADIUS
    let resultsFound = false

    while (!resultsFound && radius <= MAX_SEARCH_RADIUS) {
      setCurrentSearchRadius(radius)
      setSearchStatus(`Expanding search to ${radius} kilometers...`)

      resultsFound = await fetchNearbyPlots(userLocation.lat, userLocation.lng, radius)

      if (!resultsFound) {
        radius += RADIUS_INCREMENT
      }
    }

    if (!resultsFound) {
      setSearchStatus(`No parking spots found within ${MAX_SEARCH_RADIUS} kilometers.`)
      toast({
        title: "No Results Found",
        description: `We couldn't find any parking spots within ${MAX_SEARCH_RADIUS} kilometers of your location.`,
        variant: "destructive",
      })
    } else {
      toast({
        title: "Parking Spots Found!",
        description: `We found parking spots within ${radius} kilometers of your location.`,
      })
    }

    setExpandingSearch(false)
    setSearchRadius(radius)
  }, [userLocation, fetchNearbyPlots, toast])

  // Handle manual search submission
  const handleSearch = async (e) => {
    e.preventDefault()
    setSearchError(null)

    if (!searchQuery.trim() && !userLocation) {
      setSearchError("Please enter a location or allow location access")
      return
    }

    try {
      setIsSearching(true)
      setSearchStatus("Searching for your location...")
      setSearchProgress(20)

      let searchLat, searchLng

      if (searchQuery.trim()) {
        // In a real app, you would use a geocoding service
        // For now, we'll use a simple approach to parse coordinates or use a mock location
        const coordinates = parseCoordinates(searchQuery)
        if (coordinates) {
          searchLat = coordinates.lat
          searchLng = coordinates.lng
        } else {
          // Use a geocoding service here
          // For now, we'll use a mock location (Indore, India)
          searchLat = 22.719568
          searchLng = 75.857727
          toast({
            title: "Using approximate location",
            description: "For demo purposes, we're using Indore, India as the search location.",
          })
        }
      } else {
        // Use user's current location
        searchLat = userLocation.lat
        searchLng = userLocation.lng
      }

      setSearchProgress(40)

      // Start with initial radius
      const resultsFound = await fetchNearbyPlots(searchLat, searchLng, searchRadius)

      // If no results, ask user if they want to expand search
      if (!resultsFound) {
        toast({
          title: "No Results Found",
          description: `No parking spots found within ${searchRadius} kilometers. Would you like to expand your search?`,
          action: (
            <Button variant="outline" onClick={expandSearchRadius}>
              Expand Search
            </Button>
          ),
        })
      }
    } catch (error) {
      console.error("Error during search:", error)
      setSearchError(`Search error: ${error.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  // Parse coordinates from a string (e.g., "40.7128, -74.006")
  const parseCoordinates = (input) => {
    // Try to match a pattern like "lat, lng" or "lat,lng"
    const match = input.match(/^\s*(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)\s*$/)
    if (match) {
      return {
        lat: Number.parseFloat(match[1]),
        lng: Number.parseFloat(match[3]),
      }
    }
    return null
  }

  // Sort plots based on selected criteria
  const sortPlots = (plotsToSort, sortCriteria) => {
    if (!Array.isArray(plotsToSort)) {
      console.error("sortPlots received non-array:", plotsToSort)
      return []
    }

    return [...plotsToSort].sort((a, b) => {
      switch (sortCriteria) {
        case "distance":
          return a.distance - b.distance
        case "price":
          return a.price - b.price
        case "rating":
          return Number.parseFloat(b.rating) - Number.parseFloat(a.rating)
        case "availability":
          return b.availableSlots / b.totalSlots - a.availableSlots / a.totalSlots
        default:
          return a.distance - b.distance
      }
    })
  }

  // Apply filters and sorting
  useEffect(() => {
    if (!Array.isArray(plots) || plots.length === 0) {
      setFilteredPlots([])
      return
    }

    let filtered = plots.filter((plot) => plot.price <= maxPrice && plot.availableSlots >= minAvailability)

    // Filter by favorites if showFavorites is true
    if (showFavorites) {
      filtered = filtered.filter((plot) => favorites.includes(plot.id))
    }

    filtered = sortPlots(filtered, sortBy)
    setFilteredPlots(filtered)

    // If there was a selected plot that's no longer in the filtered results, clear selection
    if (selectedPlot && !filtered.some((plot) => plot.id === selectedPlot)) {
      setSelectedPlot(null)
    }
  }, [plots, maxPrice, minAvailability, sortBy, selectedPlot, favorites, showFavorites])

  // Handle plot selection from map or list
  const handleSelectPlot = (plotId) => {
    setSelectedPlot(plotId)

    // Scroll to the selected plot in the list if on mobile
    if (window.innerWidth < 1024) {
      const element = document.getElementById(`plot-${plotId}`)
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }

  // Reset filters to default
  const resetFilters = () => {
    setMaxPrice(150)
    setMinAvailability(1)
    setSortBy("distance")
    setShowFavorites(false)
  }

  // Apply filters and search again
  const applyFilters = () => {
    if (userLocation) {
      fetchNearbyPlots(userLocation.lat, userLocation.lng, searchRadius)
    }
  }

  // Toggle favorite status for a plot
  const toggleFavorite = (plotId, e) => {
    e.stopPropagation() // Prevent triggering card click

    if (favorites.includes(plotId)) {
      setFavorites(favorites.filter((id) => id !== plotId))

      // Update the plot in the state
      setPlots(plots.map((plot) => (plot.id === plotId ? { ...plot, isFavorite: false } : plot)))
    } else {
      setFavorites([...favorites, plotId])

      // Update the plot in the state
      setPlots(plots.map((plot) => (plot.id === plotId ? { ...plot, isFavorite: true } : plot)))
    }
  }

  // Get the selected plot details
  const selectedPlotDetails = useMemo(() => {
    if (!selectedPlot) return null
    return filteredPlots.find((plot) => plot.id === selectedPlot)
  }, [selectedPlot, filteredPlots])

  // Render star rating
  const renderRating = (rating) => {
    const fullStars = Math.floor(rating)
    const hasHalfStar = rating % 1 >= 0.5

    return (
      <div className="flex items-center">
        {[...Array(fullStars)].map((_, i) => (
          <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
        ))}
        {hasHalfStar && <StarHalf className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
        {[...Array(5 - fullStars - (hasHalfStar ? 1 : 0))].map((_, i) => (
          <Star key={`empty-${i}`} className="h-4 w-4 text-gray-300" />
        ))}
        <span className="ml-1 text-sm font-medium">{rating}</span>
      </div>
    )
  }

  // Filter component that's used in both the sidebar and sheet
  const FilterControls = ({ inSheet = false }) => (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Search Radius</span>
          <span className="text-sm text-muted-foreground">{searchRadius} km</span>
        </div>
        <Slider
          value={[searchRadius]}
          min={1}
          max={MAX_SEARCH_RADIUS}
          step={1}
          onValueChange={(value) => setSearchRadius(value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Max Price</span>
          <span className="text-sm text-muted-foreground">₹{maxPrice}/hour</span>
        </div>
        <Slider value={[maxPrice]} min={50} max={500} step={10} onValueChange={(value) => setMaxPrice(value[0])} />
        <div className="flex justify-between text-xs text-muted-foreground px-1">
          <span>₹50</span>
          <span>₹500</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Minimum Available Spots</span>
          <span className="text-sm text-muted-foreground">{minAvailability}</span>
        </div>
        <Slider
          value={[minAvailability]}
          min={1}
          max={10}
          step={1}
          onValueChange={(value) => setMinAvailability(value[0])}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Sort By</span>
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger>
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="distance">Distance</SelectItem>
            <SelectItem value="price">Price (Low to High)</SelectItem>
            <SelectItem value="rating">Rating (High to Low)</SelectItem>
            <SelectItem value="availability">Availability</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2 pt-2">
        <Switch
          id={inSheet ? "show-favorites-sheet" : "show-favorites-sidebar"}
          checked={showFavorites}
          onCheckedChange={setShowFavorites}
        />
        <Label htmlFor={inSheet ? "show-favorites-sheet" : "show-favorites-sidebar"}>Show favorites only</Label>
      </div>
    </div>
  )

  return (
    <div className="container mx-auto pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold">Find Parking</h1>

        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <Switch id="show-favorites" checked={showFavorites} onCheckedChange={setShowFavorites} />
                  <Label htmlFor="show-favorites" className="cursor-pointer">
                    Favorites
                  </Label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Show only favorite parking spots</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <ArrowUpDown className="h-4 w-4 mr-2" />
                {sortBy === "distance"
                  ? "Nearest"
                  : sortBy === "price"
                    ? "Cheapest"
                    : sortBy === "rating"
                      ? "Top Rated"
                      : "Most Available"}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("distance")}>
                <MapPin className="h-4 w-4 mr-2" />
                Nearest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("price")}>
                <IndianRupee className="h-4 w-4 mr-2" />
                Cheapest First
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("rating")}>
                <Star className="h-4 w-4 mr-2" />
                Top Rated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("availability")}>
                <Car className="h-4 w-4 mr-2" />
                Most Available
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {searchError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{searchError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by location or address"
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSearching} className="flex-1 md:flex-none">
              {isSearching ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                "Search"
              )}
            </Button>
            <Sheet open={isFilterSheetOpen} onOpenChange={setIsFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Search Filters</SheetTitle>
                  <SheetDescription>Customize your parking search</SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <FilterControls inSheet={true} />
                </div>
                <SheetFooter>
                  <Button variant="outline" onClick={resetFilters}>
                    Reset
                  </Button>
                  <SheetClose asChild>
                    <Button onClick={applyFilters}>Apply Filters</Button>
                  </SheetClose>
                </SheetFooter>
              </SheetContent>
            </Sheet>
          </div>
        </form>

        {isSearching && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{searchStatus}</span>
              <span className="text-sm">{searchProgress}%</span>
            </div>
            <Progress value={searchProgress} className="h-2" />
          </div>
        )}

        {expandingSearch && (
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Expanding Search</AlertTitle>
            <AlertDescription>Searching within {currentSearchRadius} kilometers of your location...</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar with filters - only visible on desktop */}
          <div className="lg:col-span-4 space-y-6">
            <Card className="bg-white dark:bg-gray-950 shadow-sm hidden md:block">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <CardTitle>Filters</CardTitle>
                  <Button variant="ghost" size="sm" onClick={resetFilters}>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <FilterControls />
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Results ({filteredPlots.length})</h2>
                <div className="flex gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "grid" ? "default" : "outline"}
                          size="icon"
                          onClick={() => setViewMode("grid")}
                          className="h-8 w-8"
                        >
                          <div className="grid grid-cols-2 gap-0.5">
                            <div className="w-2 h-2 bg-current rounded-sm"></div>
                            <div className="w-2 h-2 bg-current rounded-sm"></div>
                            <div className="w-2 h-2 bg-current rounded-sm"></div>
                            <div className="w-2 h-2 bg-current rounded-sm"></div>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Grid view</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={viewMode === "list" ? "default" : "outline"}
                          size="icon"
                          onClick={() => setViewMode("list")}
                          className="h-8 w-8"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>List view</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="overflow-hidden">
                      <div className="h-32 bg-muted">
                        <Skeleton className="h-full w-full" />
                      </div>
                      <CardHeader className="pb-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent className="pb-2">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-9 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                  {!Array.isArray(filteredPlots) || filteredPlots.length === 0 ? (
                    <div className="text-center py-8 space-y-4">
                      <p className="text-muted-foreground">No parking spots found matching your criteria.</p>
                      {Array.isArray(plots) && plots.length > 0 && (
                        <Button variant="outline" onClick={resetFilters}>
                          Reset Filters
                        </Button>
                      )}
                      {(!Array.isArray(plots) || plots.length === 0) && !expandingSearch && (
                        <Button onClick={expandSearchRadius}>Expand Search Radius</Button>
                      )}
                    </div>
                  ) : (
                    <AnimatePresence>
                      {filteredPlots.map((plot) => (
                        <motion.div
                          key={plot.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card
                            id={`plot-${plot.id}`}
                            className={`cursor-pointer transition-all overflow-hidden ${
                              selectedPlot === plot.id ? "ring-2 ring-primary" : ""
                            }`}
                            onClick={() => handleSelectPlot(plot.id)}
                          >
                            <div className="relative h-32 bg-muted">
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <Car className="h-12 w-12 text-gray-400" />
                              </div>
                              {plot.images && plot.images[0] && (
                                <Image
                                  src={plot.images[0] || "/placeholder.svg"}
                                  alt={plot.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none"
                                  }}
                                />
                              )}
                              <button
                                className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                                onClick={(e) => toggleFavorite(plot.id, e)}
                              >
                                <Bookmark
                                  className={`h-4 w-4 ${favorites.includes(plot.id) ? "fill-primary text-primary" : "text-gray-500"}`}
                                />
                              </button>
                            </div>
                            <CardHeader className="pb-2">
                              <CardTitle className="text-lg">{plot.name}</CardTitle>
                              <CardDescription className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {plot.address}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="pb-2">
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="flex items-center gap-1">
                                  <IndianRupee className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">₹{plot.price}/hour</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">{plot.distance.toFixed(1)} km</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-medium">
                                    {plot.availableSlots}/{plot.totalSlots} slots
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">{renderRating(plot.rating)}</div>
                              </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-2">
                              <Link href={`/dashboard/plots/${plot.id}`} className="w-full">
                                <Button size="sm" className="w-full">
                                  Book Now
                                </Button>
                              </Link>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  if (plot.lat && plot.lng) {
                                    navigateToLocation({ lat: plot.lat, lng: plot.lng })
                                  } else {
                                    toast({
                                      title: "Navigation Error",
                                      description: "Plot coordinates are missing",
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <Navigation className="h-3 w-3 mr-1" />
                                Navigate
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main content area with map and details */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="map" className="h-full">
              <div className="flex justify-between items-center mb-4">
                <TabsList>
                  <TabsTrigger value="map">
                    <MapPin className="h-4 w-4 mr-2" />
                    Map View
                  </TabsTrigger>
                  <TabsTrigger value="list">
                    <List className="h-4 w-4 mr-2" />
                    List View
                  </TabsTrigger>
                </TabsList>

                {/* Mobile filter button */}
                <div className="md:hidden">
                  <Button variant="outline" size="sm" onClick={() => setIsFilterSheetOpen(true)}>
                    <SlidersHorizontal className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </div>

                {selectedPlotDetails && (
                  <Button variant="outline" size="sm" onClick={() => setSelectedPlot(null)}>
                    Clear Selection
                  </Button>
                )}
              </div>

              <TabsContent value="map" className="mt-0 h-full">
                <Card className="h-full">
                  <CardContent className="p-0 h-full">
                    <div className="h-[600px] w-full rounded-md overflow-hidden">
                      {isLoading ? (
                        <div className="flex justify-center items-center h-full bg-muted">
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                            <p className="text-sm text-muted-foreground">{searchStatus}</p>
                          </div>
                        </div>
                      ) : (
                        <MapComponent
                          plots={Array.isArray(filteredPlots) ? filteredPlots : []}
                          selectedPlotId={selectedPlot}
                          onSelectPlot={handleSelectPlot}
                          userLocation={userLocation}
                          searchRadius={searchRadius}
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Selected plot details panel */}
                <AnimatePresence>
                  {selectedPlotDetails && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="mt-4"
                    >
                      <Card className="bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
                        <div className="md:flex">
                          <div className="relative h-48 md:h-auto md:w-1/3 bg-muted">
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <Car className="h-16 w-16 text-gray-400" />
                            </div>
                            {selectedPlotDetails.images && selectedPlotDetails.images[0] && (
                              <Image
                                src={selectedPlotDetails.images[0] || "/placeholder.svg"}
                                alt={selectedPlotDetails.name}
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.target.style.display = "none"
                                }}
                              />
                            )}
                          </div>
                          <div className="md:w-2/3">
                            <CardHeader>
                              <div className="flex justify-between items-start">
                                <div>
                                  <CardTitle className="text-xl">{selectedPlotDetails.name}</CardTitle>
                                  <CardDescription className="flex items-center gap-1 mt-1">
                                    <MapPin className="h-3 w-3" />
                                    {selectedPlotDetails.address}
                                  </CardDescription>
                                </div>
                                <div className="flex gap-2">
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            toggleFavorite(selectedPlotDetails.id, e)
                                          }}
                                        >
                                          <Bookmark
                                            className={`h-4 w-4 ${favorites.includes(selectedPlotDetails.id) ? "fill-primary text-primary" : ""}`}
                                          />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>
                                          {favorites.includes(selectedPlotDetails.id)
                                            ? "Remove from favorites"
                                            : "Add to favorites"}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            // Share functionality would go here
                                            navigator.clipboard.writeText(window.location.href)
                                            toast({
                                              title: "Link Copied",
                                              description: "Parking spot link copied to clipboard",
                                            })
                                          }}
                                        >
                                          <Share2 className="h-4 w-4" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>Share this parking spot</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                  <p className="text-sm text-muted-foreground">Price</p>
                                  <p className="font-medium flex items-center">
                                    <IndianRupee className="h-4 w-4 mr-1" />
                                    {selectedPlotDetails.price}/hour
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Distance</p>
                                  <p className="font-medium flex items-center">
                                    <MapPin className="h-4 w-4 mr-1" />
                                    {selectedPlotDetails.distance.toFixed(1)} km away
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Availability</p>
                                  <p className="font-medium flex items-center">
                                    <Car className="h-4 w-4 mr-1" />
                                    {selectedPlotDetails.availableSlots}/{selectedPlotDetails.totalSlots} spots
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Rating</p>
                                  <div className="font-medium">{renderRating(selectedPlotDetails.rating)}</div>
                                </div>
                              </div>

                              {selectedPlotDetails.features && selectedPlotDetails.features.length > 0 && (
                                <div className="mb-4">
                                  <p className="text-sm font-medium mb-2">Features</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedPlotDetails.features.map((feature, index) => (
                                      <Badge key={index} variant="outline" className="flex items-center gap-1">
                                        <CheckCircle2 className="h-3 w-3 text-green-500" />
                                        {feature}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </CardContent>
                            <CardFooter className="flex gap-3">
                              <Link href={`/dashboard/plots/${selectedPlotDetails.id}`} className="flex-1">
                                <Button className="w-full">Book Now</Button>
                              </Link>
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  if (selectedPlotDetails.lat && selectedPlotDetails.lng) {
                                    navigateToLocation({
                                      lat: selectedPlotDetails.lat,
                                      lng: selectedPlotDetails.lng,
                                    })
                                  } else {
                                    toast({
                                      title: "Navigation Error",
                                      description: "Plot coordinates are missing",
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                Navigate
                              </Button>
                            </CardFooter>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              </TabsContent>

              <TabsContent value="list" className="mt-0">
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {!Array.isArray(filteredPlots) || filteredPlots.length === 0 ? (
                      <p className="col-span-2 text-center text-muted-foreground py-4">
                        No parking spots found matching your criteria.
                      </p>
                    ) : (
                      filteredPlots.map((plot) => (
                        <motion.div
                          key={plot.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Card className={`h-full ${selectedPlot === plot.id ? "ring-2 ring-primary" : ""}`}>
                            <div className="relative h-48 bg-muted">
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <Car className="h-16 w-16 text-gray-400" />
                              </div>
                              {plot.images && plot.images[0] && (
                                <Image
                                  src={plot.images[0] || "/placeholder.svg"}
                                  alt={plot.name}
                                  fill
                                  className="object-cover"
                                  onError={(e) => {
                                    e.target.style.display = "none"
                                  }}
                                />
                              )}
                              <button
                                className="absolute top-2 right-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-full hover:bg-white transition-colors"
                                onClick={(e) => toggleFavorite(plot.id, e)}
                              >
                                <Bookmark
                                  className={`h-4 w-4 ${favorites.includes(plot.id) ? "fill-primary text-primary" : "text-gray-500"}`}
                                />
                              </button>
                            </div>
                            <CardHeader>
                              <CardTitle>{plot.name}</CardTitle>
                              <CardDescription>{plot.address}</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="grid gap-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Price:</span>
                                  <span className="font-medium">₹{plot.price}/hour</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Available:</span>
                                  <span className="font-medium">
                                    {plot.availableSlots}/{plot.totalSlots} slots
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Distance:</span>
                                  <span className="font-medium">{plot.distance.toFixed(1)} km</span>
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="text-muted-foreground">Rating:</span>
                                  {renderRating(plot.rating)}
                                </div>
                                {plot.features && plot.features.length > 0 && (
                                  <Accordion type="single" collapsible className="mt-2">
                                    <AccordionItem value="features">
                                      <AccordionTrigger className="text-sm">Features</AccordionTrigger>
                                      <AccordionContent>
                                        <ul className="text-sm space-y-1">
                                          {plot.features.map((feature, index) => (
                                            <li key={index} className="flex items-center gap-2">
                                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                                              {feature}
                                            </li>
                                          ))}
                                        </ul>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </div>
                            </CardContent>
                            <CardFooter className="grid grid-cols-2 gap-3">
                              <Link href={`/dashboard/plots/${plot.id}`} className="w-full">
                                <Button className="w-full">Book Now</Button>
                              </Link>
                              <Button
                                variant="outline"
                                className="w-full"
                                onClick={() => {
                                  if (plot.lat && plot.lng) {
                                    navigateToLocation({ lat: plot.lat, lng: plot.lng })
                                  } else {
                                    toast({
                                      title: "Navigation Error",
                                      description: "Plot coordinates are missing",
                                      variant: "destructive",
                                    })
                                  }
                                }}
                              >
                                <Navigation className="h-4 w-4 mr-2" />
                                Navigate
                              </Button>
                            </CardFooter>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  )
}
