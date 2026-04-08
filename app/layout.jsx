import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { FirebaseProvider } from "@/lib/firebase/firebase-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/firebase/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Space4Wheels - Find and Book Parking Spots",
  description: "Find and book parking spots near you with ease",
  generator: "v0.dev",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <FirebaseProvider>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </FirebaseProvider>
      </body>
    </html>
  )
}
