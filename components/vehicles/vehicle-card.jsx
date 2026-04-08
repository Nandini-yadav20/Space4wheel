"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Car, Bike, Truck, Trash2, Edit } from "lucide-react"

export function VehicleCard({ vehicle, onEdit, onDelete }) {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await onDelete(vehicle.id)
    } catch (error) {
      console.error("Error deleting vehicle:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const getVehicleIcon = () => {
    switch (vehicle.type) {
      case "Car":
      case "EV":
        return <Car className="h-6 w-6" />
      case "Bike":
        return <Bike className="h-6 w-6" />
      case "Van":
      case "Truck":
        return <Truck className="h-6 w-6" />
      default:
        return <Car className="h-6 w-6" />
    }
  }

  const getFuelTypeColor = () => {
    switch (vehicle.fuelType) {
      case "Petrol":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "Diesel":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "Electric":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "Hybrid":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">{getVehicleIcon()}</div>
            <div>
              <CardTitle className="text-lg">{vehicle.nickname || `${vehicle.brand} ${vehicle.model}`}</CardTitle>
              {vehicle.nickname && (
                <CardDescription>
                  {vehicle.brand} {vehicle.model}
                </CardDescription>
              )}
            </div>
          </div>
          <Badge variant="outline" className={`${getFuelTypeColor()} border-none`}>
            {vehicle.fuelType}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <div className="grid grid-cols-2 gap-y-2 text-sm">
          <div>
            <span className="text-muted-foreground">Registration:</span>
          </div>
          <div className="font-medium">{vehicle.registrationNumber}</div>

          <div>
            <span className="text-muted-foreground">Type:</span>
          </div>
          <div>{vehicle.type}</div>

          <div>
            <span className="text-muted-foreground">Color:</span>
          </div>
          <div>{vehicle.color}</div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" size="sm" onClick={() => onEdit(vehicle)}>
          <Edit className="h-4 w-4 mr-1" /> Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your vehicle information. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  )
}
