"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { VehicleForm } from "@/components/vehicles/vehicle-form"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { getAuth } from "firebase/auth"
import { Car, Plus, Loader2 } from "lucide-react"

export function VehicleSelector({ onVehicleSelect, selectedVehicleId }) {
  const { toast } = useToast()
  const { user } = useAuth()

  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔥 Fetch vehicles only when user is ready
  useEffect(() => {
    if (user) {
      fetchVehicles()
    }
  }, [user])

  const fetchVehicles = async () => {
    try {
      setLoading(true)

      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error("User not logged in")
      }

      const token = await currentUser.getIdToken()

      const response = await fetch("/api/vehicles", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch vehicles")
      }

      const data = await response.json()
      const vehiclesData = data.data || []

      setVehicles(vehiclesData)

      // Reset selection if needed
      if (selectedVehicleId && !vehiclesData.some((v) => v.id === selectedVehicleId)) {
        onVehicleSelect(null)
      }

      // Auto select first vehicle
      if (!selectedVehicleId && vehiclesData.length > 0) {
        onVehicleSelect(vehiclesData[0])
      }
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

  const handleAddVehicle = async (data) => {
    setIsSubmitting(true)

    try {
      const auth = getAuth()
      const currentUser = auth.currentUser

      if (!currentUser) {
        throw new Error("User not logged in")
      }

      const token = await currentUser.getIdToken()

      const response = await fetch("/api/vehicles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to add vehicle")
      }

      const newData = await response.json()
      const newVehicle = newData.data

      setVehicles((prev) => [...prev, newVehicle])
      onVehicleSelect(newVehicle)

      toast({
        title: "Vehicle Added",
        description: "Your vehicle has been added successfully.",
      })

      setIsDialogOpen(false)
    } catch (error) {
      console.error("Error adding vehicle:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to add vehicle. Please try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 🔄 Loading UI
  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-primary mr-2" />
        <span>Loading your vehicles...</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {vehicles.length === 0 ? (
        <Card className="bg-muted/50">
          <CardContent className="flex flex-col items-center justify-center py-6">
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <Car className="h-8 w-8 text-primary" />
            </div>
            <p className="text-center mb-4">
              You don't have any saved vehicles. Add a vehicle to continue.
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <RadioGroup
            value={selectedVehicleId}
            onValueChange={(value) => {
              const selected = vehicles.find((v) => v.id === value)
              onVehicleSelect(selected)
            }}
            className="space-y-3"
          >
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className={`flex items-center space-x-2 border rounded-md p-3 cursor-pointer transition-colors ${
                  selectedVehicleId === vehicle.id
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => onVehicleSelect(vehicle)}
              >
                <RadioGroupItem value={vehicle.id} id={vehicle.id} />
                <Label htmlFor={vehicle.id} className="flex-1 cursor-pointer">
                  <div className="font-medium">
                    {vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {vehicle.registrationNumber} • {vehicle.color} • {vehicle.fuelType}
                  </div>
                </Label>
              </div>
            ))}
          </RadioGroup>

          <Button variant="outline" className="w-full" onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Add Another Vehicle
          </Button>
        </>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Vehicle</DialogTitle>
            <DialogDescription>
              Fill in your vehicle details. This information will be used during bookings.
            </DialogDescription>
          </DialogHeader>
          <VehicleForm
            onSubmit={handleAddVehicle}
            onCancel={() => setIsDialogOpen(false)}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}