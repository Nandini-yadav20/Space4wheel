"use client"

// app/dashboard/plots/page.jsx

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import {
  MapPin, Plus, Car, Clock, Search, Eye, Edit2, Trash2,
  Star, IndianRupee, CheckCircle2, XCircle, Hourglass,
  AlertTriangle, MoreVertical, BarChart3,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  approved: { label: "Approved", icon: CheckCircle2, cls: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200" },
  pending:  { label: "Pending",  icon: Hourglass,    cls: "text-amber-600  bg-amber-50  dark:bg-amber-900/30  border-amber-200"  },
  rejected: { label: "Rejected", icon: XCircle,      cls: "text-red-600   bg-red-50    dark:bg-red-900/30    border-red-200"    },
}

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  )
}

// ── Plot list row ─────────────────────────────────────────────────────────────
function PlotRow({ plot, onDelete }) {
  const imageUrl = plot.images?.[0]
    ? (typeof plot.images[0] === "object" ? plot.images[0].url : plot.images[0])
    : null

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:shadow-sm transition-shadow group">
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={plot.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = "none" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Car className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-sm truncate">{plot.name}</p>
          <StatusPill status={plot.approvalStatus} />
        </div>
        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
          <MapPin className="h-3 w-3 shrink-0" />
          {plot.address}
        </p>
        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-0.5">
            <IndianRupee className="h-3 w-3" />
            {plot.price}/hr
          </span>
          <span className="flex items-center gap-0.5">
            <Car className="h-3 w-3" />
            {plot.availableSlots ?? plot.totalSlots}/{plot.totalSlots} slots
          </span>
          {plot.rating > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {plot.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        <Link href={`/dashboard/plots/${plot.id}`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </Link>
        <Link href={`/dashboard/plots/${plot.id}/edit`}>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Edit2 className="h-4 w-4" />
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/plots/${plot.id}`}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/plots/${plot.id}/edit`}>
                <Edit2 className="mr-2 h-4 w-4" /> Edit Plot
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => onDelete(plot)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete Plot
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ── Plot card (grid view) ─────────────────────────────────────────────────────
function PlotCard({ plot, onDelete }) {
  const imageUrl = plot.images?.[0]
    ? (typeof plot.images[0] === "object" ? plot.images[0].url : plot.images[0])
    : null

  return (
    <Card className="group flex flex-col overflow-hidden hover:shadow-md transition-shadow">
      <div className="relative h-40 bg-muted overflow-hidden">
        {imageUrl ? (
          <img src={imageUrl} alt={plot.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" onError={e => { e.target.style.display = "none" }} />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <Car className="h-10 w-10 text-slate-400" />
          </div>
        )}
        <div className="absolute top-2 right-2">
          <StatusPill status={plot.approvalStatus} />
        </div>
        {/* Image count badge */}
        {plot.images?.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
            +{plot.images.length - 1} more
          </div>
        )}
      </div>

      <CardHeader className="pb-2 pt-3">
        <CardTitle className="text-sm font-semibold line-clamp-1">{plot.name}</CardTitle>
        <CardDescription className="flex items-center gap-1 text-xs line-clamp-1">
          <MapPin className="h-3 w-3 shrink-0" />
          {plot.address}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-2 flex-grow">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div>
            <span className="text-muted-foreground">Price</span>
            <p className="font-semibold text-emerald-600">₹{plot.price}/hr</p>
          </div>
          <div>
            <span className="text-muted-foreground">Slots</span>
            <p className="font-semibold">{plot.availableSlots ?? plot.totalSlots}/{plot.totalSlots}</p>
          </div>
          {plot.rating > 0 && (
            <div className="col-span-2 flex items-center gap-1 mt-1">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              <span className="font-medium">{plot.rating.toFixed(1)}</span>
              <span className="text-muted-foreground">({plot.reviewCount ?? 0})</span>
            </div>
          )}
          {plot.description && (
            <p className="col-span-2 text-muted-foreground line-clamp-2 mt-1">{plot.description}</p>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-0 gap-2">
        <Link href={`/dashboard/plots/${plot.id}`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">
            <Eye className="mr-1.5 h-3.5 w-3.5" /> View
          </Button>
        </Link>
        <Link href={`/dashboard/plots/${plot.id}/edit`} className="flex-1">
          <Button variant="outline" className="w-full" size="sm">
            <Edit2 className="mr-1.5 h-3.5 w-3.5" /> Edit
          </Button>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => onDelete(plot)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function MyPlotsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [plots, setPlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [viewMode, setViewMode] = useState("grid") // "grid" | "list"
  const [deletingPlot, setDeletingPlot] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchPlots = async () => {
      if (!user) return
      try {
        setLoading(true)
        const res = await fetch(`/api/plots?ownerId=${user.uid}`)
        if (!res.ok) throw new Error("Failed to fetch plots")
        const data = await res.json()
        setPlots(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error(err)
        toast({ variant: "destructive", title: "Error", description: "Could not load your plots." })
      } finally {
        setLoading(false)
      }
    }
    fetchPlots()
  }, [user, toast])

  // Delete handler
  const handleDeleteConfirm = async () => {
    if (!deletingPlot) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/plots/${deletingPlot.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")
      setPlots(prev => prev.filter(p => p.id !== deletingPlot.id))
      toast({ title: "Plot deleted", description: `"${deletingPlot.name}" has been removed.` })
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Could not delete the plot." })
    } finally {
      setIsDeleting(false)
      setDeletingPlot(null)
    }
  }

  // Filtered + searched plots
  const displayed = useMemo(() => {
    let result = plots
    if (statusFilter !== "all") result = result.filter(p => p.approvalStatus === statusFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q)
      )
    }
    return result
  }, [plots, statusFilter, searchQuery])

  const counts = {
    all: plots.length,
    approved: plots.filter(p => p.approvalStatus === "approved").length,
    pending:  plots.filter(p => p.approvalStatus === "pending").length,
    rejected: plots.filter(p => p.approvalStatus === "rejected").length,
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Parking Plots</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your {plots.length} listed parking locations
          </p>
        </div>
        <Link href="/dashboard/plots/add">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New Plot
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or address…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ({counts.all})</SelectItem>
            <SelectItem value="approved">Approved ({counts.approved})</SelectItem>
            <SelectItem value="pending">Pending ({counts.pending})</SelectItem>
            <SelectItem value="rejected">Rejected ({counts.rejected})</SelectItem>
          </SelectContent>
        </Select>

        {/* View toggle */}
        <div className="flex items-center border rounded-md overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode("grid")}
            className={`px-3 py-2 transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <div className="grid grid-cols-2 gap-0.5">
              {[...Array(4)].map((_, i) => <div key={i} className="w-1.5 h-1.5 bg-current rounded-[1px]" />)}
            </div>
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-2 transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
          >
            <div className="flex flex-col gap-0.5">
              {[...Array(3)].map((_, i) => <div key={i} className="w-4 h-1 bg-current rounded-full" />)}
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {displayed.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-4">
            {searchQuery || statusFilter !== "all" ? (
              <>
                <Search className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No plots match your filters</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your search or filter.
                  </p>
                </div>
                <Button variant="outline" onClick={() => { setSearchQuery(""); setStatusFilter("all") }}>
                  Clear Filters
                </Button>
              </>
            ) : (
              <>
                <Car className="h-10 w-10 text-muted-foreground" />
                <div>
                  <p className="font-medium">No plots yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Add your first parking plot to get started.</p>
                </div>
                <Link href="/dashboard/plots/add">
                  <Button><Plus className="mr-2 h-4 w-4" /> Add First Plot</Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayed.map(plot => (
            <PlotCard key={plot.id} plot={plot} onDelete={setDeletingPlot} />
          ))}
          <Link href="/dashboard/plots/add" className="block">
            <div className="h-full min-h-[260px] rounded-xl border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all cursor-pointer">
              <Plus className="h-7 w-7" />
              <span className="text-sm font-medium">Add Plot</span>
            </div>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(plot => (
            <PlotRow key={plot.id} plot={plot} onDelete={setDeletingPlot} />
          ))}
        </div>
      )}

      {/* Results count */}
      {displayed.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Showing {displayed.length} of {plots.length} plots
        </p>
      )}

      {/* Analytics placeholder tab */}
      {plots.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">Quick Analytics</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold">{counts.approved}</p>
                <p className="text-xs text-muted-foreground">Active Listings</p>
              </div>
              <div>
                <p className="text-2xl font-bold">{counts.pending}</p>
                <p className="text-xs text-muted-foreground">Awaiting Approval</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {plots.reduce((s, p) => s + (p.totalSlots || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Total Slots</p>
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {plots.reduce((s, p) => s + (p.availableSlots ?? p.totalSlots ?? 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Available Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deletingPlot} onOpenChange={open => !open && setDeletingPlot(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Plot
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deletingPlot?.name}"</strong>? This will permanently remove the listing and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? "Deleting…" : "Delete Plot"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}