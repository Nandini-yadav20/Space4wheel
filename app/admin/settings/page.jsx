"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/firebase/auth-context"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { Settings, Shield, Bell, CreditCard } from "lucide-react"

export default function AdminSettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(true)
  const [settings, setSettings] = useState({
    general: {
      siteName: "ParkEase",
      contactEmail: "admin@parkease.com",
      supportPhone: "+1 (555) 123-4567",
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      newUserAlerts: true,
      newPlotAlerts: true,
      bookingAlerts: false,
    },
    security: {
      twoFactorAuth: false,
      passwordExpiry: 90,
      sessionTimeout: 30,
    },
    payments: {
      commissionRate: 10,
      minimumPayout: 50,
      payoutSchedule: "weekly",
    },
  })

  useEffect(() => {
    // Redirect if not an admin
    if (user && user.role !== "admin") {
      if (user.role === "owner") {
        router.push("/owner")
      } else {
        router.push("/dashboard")
      }
      return
    }

    const fetchSettings = async () => {
      try {
        setIsLoading(true)
        // In a real app, you would fetch settings from the API
        // const response = await fetch("/api/admin/settings")
        // const data = await response.json()
        // setSettings(data)

        // For demo purposes, we'll use the default settings
        setTimeout(() => {
          setIsLoading(false)
        }, 1000)
      } catch (error) {
        console.error("Error fetching settings:", error)
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load settings. Please try again.",
        })
        setIsLoading(false)
      }
    }

    if (user) {
      fetchSettings()
    }
  }, [user, router, toast])

  const handleGeneralSettingsChange = (e) => {
    const { name, value } = e.target
    setSettings({
      ...settings,
      general: {
        ...settings.general,
        [name]: value,
      },
    })
  }

  const handleNotificationSettingsChange = (key, value) => {
    setSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    })
  }

  const handleSecuritySettingsChange = (e) => {
    const { name, value } = e.target
    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [name]: value,
      },
    })
  }

  const handleSecurityToggleChange = (key, value) => {
    setSettings({
      ...settings,
      security: {
        ...settings.security,
        [key]: value,
      },
    })
  }

  const handlePaymentSettingsChange = (e) => {
    const { name, value } = e.target
    setSettings({
      ...settings,
      payments: {
        ...settings.payments,
        [name]: value,
      },
    })
  }

  const handleSaveSettings = async () => {
    try {
      // In a real app, you would save settings to the API
      // const response = await fetch("/api/admin/settings", {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify(settings),
      // })

      // For demo purposes, we'll just show a success toast
      toast({
        title: "Settings Saved",
        description: "Your settings have been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings. Please try again.",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>
        <Card>
          <CardHeader>
            <CardTitle>Admin Settings</CardTitle>
            <CardDescription>Configure system settings and preferences</CardDescription>
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
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Admin Settings</CardTitle>
          <CardDescription>Configure system settings and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general">
                <Settings className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="notifications">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </TabsTrigger>
              <TabsTrigger value="security">
                <Shield className="h-4 w-4 mr-2" />
                Security
              </TabsTrigger>
              <TabsTrigger value="payments">
                <CreditCard className="h-4 w-4 mr-2" />
                Payments
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="siteName">Site Name</Label>
                    <Input
                      id="siteName"
                      name="siteName"
                      value={settings.general.siteName}
                      onChange={handleGeneralSettingsChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">Contact Email</Label>
                    <Input
                      id="contactEmail"
                      name="contactEmail"
                      type="email"
                      value={settings.general.contactEmail}
                      onChange={handleGeneralSettingsChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="supportPhone">Support Phone</Label>
                    <Input
                      id="supportPhone"
                      name="supportPhone"
                      value={settings.general.supportPhone}
                      onChange={handleGeneralSettingsChange}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="notifications">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="emailNotifications">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive email notifications for important events</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={settings.notifications.emailNotifications}
                    onCheckedChange={(value) => handleNotificationSettingsChange("emailNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="smsNotifications">SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive SMS notifications for important events</p>
                  </div>
                  <Switch
                    id="smsNotifications"
                    checked={settings.notifications.smsNotifications}
                    onCheckedChange={(value) => handleNotificationSettingsChange("smsNotifications", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newUserAlerts">New User Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when new users register</p>
                  </div>
                  <Switch
                    id="newUserAlerts"
                    checked={settings.notifications.newUserAlerts}
                    onCheckedChange={(value) => handleNotificationSettingsChange("newUserAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="newPlotAlerts">New Plot Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified when new parking plots are added</p>
                  </div>
                  <Switch
                    id="newPlotAlerts"
                    checked={settings.notifications.newPlotAlerts}
                    onCheckedChange={(value) => handleNotificationSettingsChange("newPlotAlerts", value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="bookingAlerts">Booking Alerts</Label>
                    <p className="text-sm text-muted-foreground">Get notified for all new bookings</p>
                  </div>
                  <Switch
                    id="bookingAlerts"
                    checked={settings.notifications.bookingAlerts}
                    onCheckedChange={(value) => handleNotificationSettingsChange("bookingAlerts", value)}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="twoFactorAuth">Two-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require two-factor authentication for admin accounts
                    </p>
                  </div>
                  <Switch
                    id="twoFactorAuth"
                    checked={settings.security.twoFactorAuth}
                    onCheckedChange={(value) => handleSecurityToggleChange("twoFactorAuth", value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="passwordExpiry">Password Expiry (days)</Label>
                  <Input
                    id="passwordExpiry"
                    name="passwordExpiry"
                    type="number"
                    min="0"
                    value={settings.security.passwordExpiry}
                    onChange={handleSecuritySettingsChange}
                  />
                  <p className="text-sm text-muted-foreground">Number of days before passwords expire (0 for never)</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    name="sessionTimeout"
                    type="number"
                    min="5"
                    value={settings.security.sessionTimeout}
                    onChange={handleSecuritySettingsChange}
                  />
                  <p className="text-sm text-muted-foreground">Inactive session timeout in minutes</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payments">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    name="commissionRate"
                    type="number"
                    min="0"
                    max="100"
                    value={settings.payments.commissionRate}
                    onChange={handlePaymentSettingsChange}
                  />
                  <p className="text-sm text-muted-foreground">Percentage commission on each booking</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimumPayout">Minimum Payout Amount (₹)</Label>
                  <Input
                    id="minimumPayout"
                    name="minimumPayout"
                    type="number"
                    min="0"
                    value={settings.payments.minimumPayout}
                    onChange={handlePaymentSettingsChange}
                  />
                  <p className="text-sm text-muted-foreground">Minimum amount required for owner payouts</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payoutSchedule">Payout Schedule</Label>
                  <select
                    id="payoutSchedule"
                    name="payoutSchedule"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={settings.payments.payoutSchedule}
                    onChange={handlePaymentSettingsChange}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                  <p className="text-sm text-muted-foreground">How often payouts are processed to owners</p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSaveSettings}>Save Settings</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
