"use client"

// components/dashboard/dashboard-nav.jsx

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  Car, Menu, Home, Map, Calendar, User, LogOut, Plus, LayoutGrid,
  Bell, Settings, ChevronDown, BarChart3, BookOpen,
} from "lucide-react"

// ── Nav item component ────────────────────────────────────────────────────────
function NavItem({ href, icon: Icon, title, active }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 text-sm font-medium transition-colors relative group
        ${active
          ? "text-primary"
          : "text-muted-foreground hover:text-foreground"
        }`}
    >
      <Icon className="h-4 w-4" />
      {title}
      {active && (
        <span className="absolute -bottom-[1.35rem] left-0 right-0 h-0.5 bg-primary rounded-full" />
      )}
    </Link>
  )
}

// ── Mobile nav item ───────────────────────────────────────────────────────────
function MobileNavItem({ href, icon: Icon, title, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
        ${active ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"}`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-primary" : "text-muted-foreground"}`} />
      {title}
    </Link>
  )
}

export function DashboardNav({ userRole }) {
  const { user, signOut } = useAuth()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [pendingPlots, setPendingPlots] = useState(0)

  // Fetch pending count for owners
  useEffect(() => {
    if (userRole !== "owner" || !user) return
    const fetchPending = async () => {
      try {
        const res = await fetch(`/api/plots?ownerId=${user.uid}`)
        if (!res.ok) return
        const data = await res.json()
        const arr = Array.isArray(data) ? data : []
        setPendingPlots(arr.filter(p => p.approvalStatus === "pending").length)
      } catch { /* silent */ }
    }
    fetchPending()
  }, [user, userRole])

  const userNavItems = [
    { title: "Dashboard",    href: "/dashboard",          icon: Home     },
    { title: "Find Parking", href: "/dashboard/find",     icon: Map      },
    { title: "My Bookings",  href: "/dashboard/bookings", icon: Calendar },
    { title: "My Vehicles",  href: "/dashboard/vehicles", icon: Car      },
  ]

  const ownerNavItems = [
    { title: "Dashboard",  href: "/dashboard/owner-dashboard", icon: Home        },
    { title: "My Plots",   href: "/dashboard/plots",           icon: LayoutGrid  },
    { title: "Add Plot",   href: "/dashboard/plots/add",       icon: Plus        },
    { title: "Bookings",   href: "/dashboard/bookings",        icon: BookOpen    },
  ]

  const navItems = userRole === "owner" ? ownerNavItems : userNavItems

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    if (href === "/dashboard/owner-dashboard") return pathname === "/dashboard/owner-dashboard"
    return pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">

        {/* Left: logo + mobile menu */}
        <div className="flex items-center gap-3">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <div className="flex items-center gap-2 pb-6 pt-2 border-b">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Car className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <span className="text-sm font-bold">Space4Wheels</span>
                  <p className="text-xs text-muted-foreground capitalize">{userRole} account</p>
                </div>
              </div>
              <nav className="flex flex-col gap-1 py-4">
                {navItems.map((item) => (
                  <MobileNavItem
                    key={item.href}
                    {...item}
                    active={isActive(item.href)}
                    onClick={() => setIsOpen(false)}
                  />
                ))}
                {userRole === "owner" && pendingPlots > 0 && (
                  <div className="mt-2 mx-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
                      {pendingPlots} plot{pendingPlots > 1 ? "s" : ""} awaiting approval
                    </p>
                  </div>
                )}
              </nav>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                <Link href="/dashboard/profile" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Profile Settings
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 mt-1"
                  onClick={() => { signOut(); setIsOpen(false) }}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          <Link href={userRole === "owner" ? "/dashboard/owner-dashboard" : "/dashboard"} className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <Car className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold hidden sm:inline-block">Space4Wheels</span>
          </Link>
        </div>

        {/* Center: desktop nav */}
        <nav className="hidden md:flex items-center gap-6 h-full">
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              title={item.title}
              active={isActive(item.href)}
            />
          ))}
        </nav>

        {/* Right: user menu */}
        <div className="flex items-center gap-2">
          {/* Pending badge for owners */}
          {userRole === "owner" && pendingPlots > 0 && (
            <Link href="/dashboard/plots">
              <Button variant="ghost" size="sm" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 gap-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                {pendingPlots} pending
              </Button>
            </Link>
          )}

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 max-w-[180px]">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary">
                    {(user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                  </span>
                </div>
                <span className="hidden sm:inline-block truncate text-sm">
                  {user?.displayName || user?.email?.split("@")[0]}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>
                <p className="text-sm font-medium truncate">{user?.displayName || "User"}</p>
                <p className="text-xs font-normal text-muted-foreground truncate">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {userRole === "owner" && (
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/plots/add" className="flex items-center">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Plot
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/20"
                onClick={() => signOut()}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}