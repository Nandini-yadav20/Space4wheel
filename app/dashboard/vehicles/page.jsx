"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { VehicleForm } from "@/components/vehicles/vehicle-form"
import { VehicleCard } from "@/components/vehicles/vehicle-card"
import { useAuth } from "@/lib/firebase/auth-context"
import { Plus, Car, Loader2 } from "lucide-react"

export default function VehiclesPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { toast } = useToast()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentVehicle, setCurrentVehicle] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/auth/login")
      return
    }
  
    fetchVehicles()
  }, [user, router])

  const fetchVehicles = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/vehicles");

      if (!response.ok) {
        throw new Error("Failed to fetch vehicles")
      }

      const data = await response.json()
      setVehicles(data.data || [])
    } catch (error) {
      console.error("Error fetching vehicles:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load your vehicles. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddVehicle = () => {
    setCurrentVehicle(null)
    setIsDialogOpen(true)
  }

  const handleEditVehicle = (vehicle) => {
    setCurrentVehicle(vehicle)
    setIsDialogOpen(true)
  }

  const handleDeleteVehicle = async (vehicleId) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete vehicle")
      }

      setVehicles(vehicles.filter((v) => v.id !== vehicleId))

      toast({
        title: "Vehicle Deleted",
        description: "Your vehicle has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting vehicle:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete vehicle. Please try again.",
      })
    }
  }

  const handleSubmitVehicle = async (data) => {
    setIsSubmitting(true)

    try {
      if (currentVehicle) {
        // Update existing vehicle
       const response = await fetch(`/api/vehicles/${currentVehicle.id}`, {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    ...data,
   
  }),
})


        if (!response.ok) {
          throw new Error("Failed to update vehicle")
        }

        const updatedData = await response.json()

        setVehicles(vehicles.map((v) => (v.id === currentVehicle.id ? updatedData.data : v)))

        toast({
          title: "Vehicle Updated",
          description: "Your vehicle has been updated successfully.",
        })
      } else {
        // Add new vehicle
       

            const response = await fetch("/api/vehicles", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(data), 
            });

        if (!response.ok) {
          throw new Error("Failed to add vehicle")
        }

        const newData = await response.json()

        setVehicles([...vehicles, newData.data])

        toast({
          title: "Vehicle Added",
          description: "Your vehicle has been added successfully.",
        })
      }

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error saving vehicle:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Vehicles</h1>
        <Button onClick={handleAddVehicle}>
          <Plus className="h-4 w-4 mr-2" /> Add Vehicle
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2 text-lg">Loading your vehicles...</span>
        </div>
      ) : vehicles.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <Car className="h-12 w-12 text-primary" />
            </div>
            <CardTitle className="text-xl mb-2">No Vehicles Added Yet</CardTitle>
            <CardDescription className="text-center mb-6">
              Add your vehicles to quickly select them when making a booking.
            </CardDescription>
            <Button onClick={handleAddVehicle}>
              <Plus className="h-4 w-4 mr-2" /> Add Your First Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <VehicleCard key={vehicle.id} vehicle={vehicle} onEdit={handleEditVehicle} onDelete={handleDeleteVehicle} />
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{currentVehicle ? "Edit Vehicle" : "Add New Vehicle"}</DialogTitle>
            <DialogDescription>
              {currentVehicle
                ? "Update your vehicle information below."
                : "Fill in your vehicle details. This information will be used during bookings."}
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            vehicle={currentVehicle}
            onSubmit={handleSubmitVehicle}
            onCancel={() => setIsDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
