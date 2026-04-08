"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Car, Loader2, Mail, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/firebase/auth-context"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

const resendFormSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
})

export default function LoginPage() {
  const { signIn, resendVerificationEmail, loading, isInitialized } = useAuth()
  const router = useRouter()
  const [error, setError] = useState("")
  const [verificationNeeded, setVerificationNeeded] = useState(false)
  const [unverifiedEmail, setUnverifiedEmail] = useState("")
  const [resendDialogOpen, setResendDialogOpen] = useState(false)
  const [resendStatus, setResendStatus] = useState({ message: "", isError: false })
  const [resendLoading, setResendLoading] = useState(false)

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  const resendForm = useForm({
    resolver: zodResolver(resendFormSchema),
    defaultValues: {
      password: "",
    },
  })

  async function onSubmit(values) {
    try {
      setError("")
      setVerificationNeeded(false)

      if (!isInitialized) {
        setError("Authentication service is initializing. Please try again in a moment.")
        return
      }

      const result = await signIn(values.email, values.password)

      if (!result.success) {
        if (result.emailVerificationNeeded) {
          setVerificationNeeded(true)
          setUnverifiedEmail(result.email)
        } else {
          setError(result.error || "Failed to sign in")
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      setError(error.message || "An error occurred during login")
    }
  }

  async function handleResendVerification(values) {
    try {
      setResendLoading(true)
      setResendStatus({ message: "", isError: false })

      const result = await resendVerificationEmail(unverifiedEmail, values.password)

      if (result.success) {
        setResendStatus({
          message: "Verification email sent successfully. Please check your inbox.",
          isError: false,
        })
        // Close dialog after a delay
        setTimeout(() => {
          setResendDialogOpen(false)
          resendForm.reset()
        }, 3000)
      } else {
        setResendStatus({
          message: result.error || "Failed to resend verification email",
          isError: true,
        })
      }
    } catch (error) {
      console.error("Error resending verification:", error)
      setResendStatus({
        message: error.message || "An error occurred",
        isError: true,
      })
    } finally {
      setResendLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center">
            <Car className="h-10 w-10 text-primary" />
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">Sign in to your account</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        {!isInitialized && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertDescription>Initializing authentication service... Please wait.</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {verificationNeeded && (
          <Alert className="bg-amber-50 border-amber-200">
            <div className="flex items-center">
              <Mail className="h-4 w-4 mr-2 text-amber-800" />
              <AlertDescription className="text-amber-800 flex-grow">
                Please verify your email before logging in.
              </AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="ml-2 border-amber-300 text-amber-800 hover:bg-amber-100"
                onClick={() => setResendDialogOpen(true)}
              >
                Resend
              </Button>
            </div>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-8 space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email address</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div>
              <Button type="submit" className="w-full" disabled={loading || !isInitialized}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>

      {/* Resend Verification Dialog */}
      <Dialog open={resendDialogOpen} onOpenChange={setResendDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Resend verification email</DialogTitle>
            <DialogDescription>
              Please enter your password to resend the verification email to{" "}
              <span className="font-medium">{unverifiedEmail}</span>
            </DialogDescription>
          </DialogHeader>

          {resendStatus.message && (
            <Alert className={resendStatus.isError ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}>
              <AlertDescription className={resendStatus.isError ? "text-red-800" : "text-green-800"}>
                {resendStatus.message}
              </AlertDescription>
            </Alert>
          )}

          <Form {...resendForm}>
            <form onSubmit={resendForm.handleSubmit(handleResendVerification)} className="space-y-4">
              <FormField
                control={resendForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setResendDialogOpen(false)
                    resendForm.reset()
                  }}
                  disabled={resendLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={resendLoading}>
                  {resendLoading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Resend verification email"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
