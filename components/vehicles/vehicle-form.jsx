"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const vehicleSchema = z.object({
  nickname: z.string().optional(),
  type: z.enum(["Car", "Bike", "Van", "Truck", "EV" , "Tractor" , "Auto"]),
  brand: z.string().min(1, "Brand is required"),
  model: z.string().min(1, "Model is required"),
  registrationNumber: z.string().min(1, "Registration number is required"),
  color: z.string().min(1, "Color is required"),
  fuelType: z.enum(["Petrol", "Diesel", "Electric", "Hybrid"]),
})

export function VehicleForm({ vehicle, onSubmit, onCancel, isSubmitting }) {
  const { toast } = useToast()

  const form = useForm({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      nickname: vehicle?.nickname || "",
      type: vehicle?.type || "",
      brand: vehicle?.brand || "",
      model: vehicle?.model || "",
      registrationNumber: vehicle?.registrationNumber || "",
      color: vehicle?.color || "",
      fuelType: vehicle?.fuelType || "",
    },
  })

  const handleSubmit = async (data) => {
    try {
      await onSubmit(data)
    } catch (error) {
      console.error("Error submitting form:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="nickname"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Vehicle Nickname (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Dad's SUV" {...field} />
              </FormControl>
              <FormDescription>A friendly name to identify your vehicle</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Car">Car</SelectItem>
                    <SelectItem value="Bike">Bike</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="EV">EV</SelectItem>
                    <SelectItem value="Tractor">Tractor</SelectItem>
                    <SelectItem value="Auto">Auto Rickshaw</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Petrol">Petrol</SelectItem>
                    <SelectItem value="Diesel">Diesel</SelectItem>
                    <SelectItem value="Electric">Electric</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Brand</FormLabel>
                <FormControl>
                  <Input placeholder="Hyundai, Honda, BMW" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Model</FormLabel>
                <FormControl>
                  <Input placeholder="Creta, Civic, X5" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="registrationNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Number</FormLabel>
                <FormControl>
                  <Input placeholder="MP09 XX 1234" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Vehicle Color</FormLabel>
                <FormControl>
                  <Input placeholder="Red, Black, Silver" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : vehicle ? (
              "Update Vehicle"
            ) : (
              "Add Vehicle"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
