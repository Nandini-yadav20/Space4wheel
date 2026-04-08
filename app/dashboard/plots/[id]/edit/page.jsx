"use client"

// app/dashboard/plots/[id]/edit/page.jsx  (also serves /manage)

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/firebase/auth-context"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Loader2, X, Trash2, ImageIcon, FileText, ArrowLeft,
  CheckCircle2, Clock, MapPin, Star, Car, Eye, BarChart3,
  Upload, ZoomIn,
} from "lucide-react"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { uploadMultipleFiles, deleteMultipleFiles, formatFileSize, isImageFile, isDocumentFile } from "@/lib/firebase/storage-utils"

const formSchema = z.object({
  name:        z.string().min(3,  { message: "At least 3 characters" }),
  address:     z.string().min(5,  { message: "At least 5 characters" }),
  description: z.string().min(10, { message: "At least 10 characters" }),
  price:       z.coerce.number().positive({ message: "Must be positive" }),
  totalSlots:  z.coerce.number().int().positive({ message: "Must be a positive integer" }),
})

// ── Image thumbnail with remove button ───────────────────────────────────────
function ImageThumb({ src, name, onRemove, onPreview }) {
  const [err, setErr] = useState(false)
  return (
    <div className="relative group rounded-lg overflow-hidden bg-muted aspect-video">
      {err ? (
        <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground flex-col gap-1">
          <ImageIcon className="h-5 w-5" />
          <span>Load failed</span>
        </div>
      ) : (
        <img
          src={src}
          alt={name || "image"}
          className="w-full h-full object-cover"
          onError={() => setErr(true)}
        />
      )}
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {!err && (
          <button
            type="button"
            onClick={() => onPreview?.(src)}
            className="p-1.5 bg-white/20 rounded-full hover:bg-white/40 transition-colors text-white"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 bg-red-500/80 rounded-full hover:bg-red-500 transition-colors text-white"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

// ── Document row ──────────────────────────────────────────────────────────────
function DocRow({ name, size, url, onRemove }) {
  return (
    <div className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/40 transition-colors">
      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-grow min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {size && <p className="text-xs text-muted-foreground">{typeof size === "number" ? formatFileSize(size) : size}</p>}
      </div>
      {url && (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline shrink-0">
          View
        </a>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ── Upload drop zone ──────────────────────────────────────────────────────────
function DropZone({ accept, multiple, onChange, children }) {
  const [dragging, setDragging] = useState(false)
  return (
    <label
      className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors
        ${dragging ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:border-primary/40 hover:bg-muted/40"}`}
      onDragEnter={() => setDragging(true)}
      onDragLeave={() => setDragging(false)}
      onDrop={() => setDragging(false)}
    >
      <Upload className="h-6 w-6 text-muted-foreground" />
      <div className="text-center">{children}</div>
      <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={onChange} />
    </label>
  )
}

// ── Main edit page ────────────────────────────────────────────────────────────
export default function EditPlotPage() {
  const params   = useParams()
  const router   = useRouter()
  const { toast } = useToast()
  const { user }  = useAuth()

  const [plot,          setPlot]          = useState(null)
  const [loading,       setLoading]       = useState(true)
  const [isSubmitting,  setIsSubmitting]  = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting,    setIsDeleting]    = useState(false)
  const [previewUrl,    setPreviewUrl]    = useState(null)

  // Images
  const [existingImages, setExistingImages] = useState([])
  const [newImages,      setNewImages]      = useState([])
  const [newImagePreviews, setNewImagePreviews] = useState([])
  const [imagesToDelete, setImagesToDelete] = useState([])

  // Docs
  const [existingDocs,  setExistingDocs]  = useState([])
  const [newDocs,       setNewDocs]       = useState([])
  const [newDocInfo,    setNewDocInfo]    = useState([])
  const [docsToDelete,  setDocsToDelete]  = useState([])

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", address: "", description: "", price: 0, totalSlots: 0 },
  })

  useEffect(() => {
    const fetch_ = async () => {
      if (!params.id) return
      try {
        const res = await fetch(`/api/plots/${params.id}`)
        if (!res.ok) throw new Error("Failed to fetch")
        const data = await res.json()
        if (!data.success) throw new Error(data.error)
        const p = data.data
        setPlot(p)
        form.reset({
          name: p.name || "",
          address: p.address || "",
          description: p.description || "",
          price: p.price || 0,
          totalSlots: p.totalSlots || 0,
        })
        setExistingImages(p.images || [])
        setExistingDocs(p.documents || [])
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "Could not load plot." })
      } finally {
        setLoading(false)
      }
    }
    fetch_()
  }, [params.id, form, toast])

  const handleNewImages = (e) => {
    const files = Array.from(e.target.files || []).filter(f => isImageFile(f.name))
    setNewImages(prev => [...prev, ...files])
    files.forEach(f => {
      const url = URL.createObjectURL(f)
      setNewImagePreviews(prev => [...prev, { url, name: f.name }])
    })
  }

  const handleNewDocs = (e) => {
    const files = Array.from(e.target.files || []).filter(f => isDocumentFile(f.name))
    setNewDocs(prev => [...prev, ...files])
    files.forEach(f => setNewDocInfo(prev => [...prev, { name: f.name, size: f.size }]))
  }

  const removeExistingImage = (idx) => {
    setImagesToDelete(prev => [...prev, existingImages[idx]])
    setExistingImages(prev => prev.filter((_, i) => i !== idx))
  }

  const removeNewImage = (idx) => {
    URL.revokeObjectURL(newImagePreviews[idx]?.url)
    setNewImages(prev => prev.filter((_, i) => i !== idx))
    setNewImagePreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const removeExistingDoc = (idx) => {
    setDocsToDelete(prev => [...prev, existingDocs[idx]])
    setExistingDocs(prev => prev.filter((_, i) => i !== idx))
  }

  const removeNewDoc = (idx) => {
    setNewDocs(prev => prev.filter((_, i) => i !== idx))
    setNewDocInfo(prev => prev.filter((_, i) => i !== idx))
  }

  const onSubmit = async (values) => {
    if (!user) return
    setIsSubmitting(true)
    setUploadProgress(10)
    try {
      let uploadedImages = []
      if (newImages.length > 0) {
        uploadedImages = await uploadMultipleFiles(newImages, "plots/images", user.uid, p => setUploadProgress(10 + p * 0.3))
      }

      let uploadedDocs = []
      if (newDocs.length > 0) {
        uploadedDocs = await uploadMultipleFiles(newDocs, "plots/documents", user.uid, p => setUploadProgress(40 + p * 0.3))
      }

      // Delete removed files
      const imgPaths = imagesToDelete.filter(i => i?.path).map(i => i.path)
      const docPaths = docsToDelete.filter(d => d?.path).map(d => d.path)
      if (imgPaths.length) await deleteMultipleFiles(imgPaths)
      if (docPaths.length) await deleteMultipleFiles(docPaths)

      setUploadProgress(80)

      const res = await fetch(`/api/plots/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          lat: plot?.lat,
          lng: plot?.lng,
          images: [...existingImages, ...uploadedImages],
          documents: [...existingDocs, ...uploadedDocs],
          ownerId: user.uid,
          updatedAt: new Date().toISOString(),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "Update failed")
      }

      setUploadProgress(100)
      toast({ title: "Plot Updated", description: "Changes saved successfully." })
      router.push("/dashboard/plots")
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      // Delete storage files
      const imgPaths = existingImages.filter(i => i?.path).map(i => i.path)
      const docPaths = existingDocs.filter(d => d?.path).map(d => d.path)
      if (imgPaths.length) await deleteMultipleFiles(imgPaths)
      if (docPaths.length) await deleteMultipleFiles(docPaths)

      const res = await fetch(`/api/plots/${params.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Delete failed")

      toast({ title: "Plot Deleted", description: "Your plot has been removed." })
      router.push("/dashboard/plots")
    } catch (err) {
      toast({ variant: "destructive", title: "Error", description: err.message })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!plot) {
    return (
      <div className="container mx-auto py-8">
        <p className="text-center text-muted-foreground">Plot not found.</p>
        <div className="flex justify-center mt-4">
          <Button onClick={() => router.push("/dashboard/plots")}>Back to Plots</Button>
        </div>
      </div>
    )
  }

  // Derived getters
  const getImageUrl = (img) => (typeof img === "object" ? img.url : img)
  const getDocUrl   = (doc) => (typeof doc === "object" ? doc.url : doc)
  const getDocName  = (doc) => (typeof doc === "object" ? doc.name : doc.split("/").pop())
  const getDocSize  = (doc) => (typeof doc === "object" ? doc.size : undefined)

  return (
    <div className="container mx-auto py-6 max-w-5xl space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/plots")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-grow">
          <h1 className="text-2xl font-bold tracking-tight truncate">{plot.name}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3" />{plot.address}
          </p>
        </div>
        <Link href={`/dashboard/plots/${plot.id}`}>
          <Button variant="outline" size="sm">
            <Eye className="mr-1.5 h-4 w-4" />
            Public View
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details & Pricing</TabsTrigger>
          <TabsTrigger value="media">Images & Docs</TabsTrigger>
          <TabsTrigger value="stats">Stats</TabsTrigger>
        </TabsList>

        {/* ── Details tab ── */}
        <TabsContent value="details" className="mt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Basic Information</CardTitle>
                    <CardDescription>Name, address and description</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Plot Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="address" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="description" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea className="min-h-[100px]" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Pricing & Capacity</CardTitle>
                    <CardDescription>Set your hourly rate and slot count</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField control={form.control} name="price" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price per Hour (₹)</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" step="0.5" {...field} />
                        </FormControl>
                        <FormDescription>Users will see this as the base rate.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="totalSlots" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Parking Slots</FormLabel>
                        <FormControl>
                          <Input type="number" min="1" step="1" {...field} />
                        </FormControl>
                        <FormDescription>Total physical spots at this location.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Current status card */}
                    <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Current Status</p>
                      <div className="flex items-center gap-2">
                        {plot.approvalStatus === "approved" && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                        {plot.approvalStatus === "pending"  && <Clock className="h-4 w-4 text-amber-500" />}
                        {plot.approvalStatus === "rejected" && <X className="h-4 w-4 text-red-500" />}
                        <span className="text-sm font-medium capitalize">{plot.approvalStatus || "pending"}</span>
                      </div>
                      {plot.rating > 0 && (
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span>{plot.rating.toFixed(1)} ({plot.reviewCount ?? 0} reviews)</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {isSubmitting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Saving changes…</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <Button type="button" variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)} disabled={isSubmitting}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Plot
                </Button>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/dashboard/plots")} disabled={isSubmitting}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</>
                    ) : "Save Changes"}
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </TabsContent>

        {/* ── Media tab ── */}
        <TabsContent value="media" className="mt-6 space-y-6">
          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Images ({existingImages.length + newImages.length})
              </CardTitle>
              <CardDescription>
                Upload high-quality photos. First image is the cover.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(existingImages.length + newImagePreviews.length) > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {existingImages.map((img, i) => (
                    <ImageThumb
                      key={`ex-${i}`}
                      src={getImageUrl(img)}
                      name={typeof img === "object" ? img.name : `Image ${i + 1}`}
                      onRemove={() => removeExistingImage(i)}
                      onPreview={setPreviewUrl}
                    />
                  ))}
                  {newImagePreviews.map((p, i) => (
                    <div key={`new-${i}`} className="relative">
                      <ImageThumb
                        src={p.url}
                        name={p.name}
                        onRemove={() => removeNewImage(i)}
                        onPreview={setPreviewUrl}
                      />
                      <span className="absolute top-1 left-1 bg-blue-500 text-white text-[9px] px-1 py-0.5 rounded font-semibold">NEW</span>
                    </div>
                  ))}
                </div>
              )}
              <DropZone accept="image/*" multiple onChange={handleNewImages}>
                <p className="text-sm font-medium">Drop images here or click to browse</p>
                <p className="text-xs text-muted-foreground">JPG, PNG or WebP · Max 5 MB each</p>
              </DropZone>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documents ({existingDocs.length + newDocs.length})
              </CardTitle>
              <CardDescription>
                Ownership proof, NOC, permits — helps with faster approval.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {existingDocs.map((doc, i) => (
                <DocRow
                  key={`edoc-${i}`}
                  name={getDocName(doc)}
                  size={getDocSize(doc)}
                  url={getDocUrl(doc)}
                  onRemove={() => removeExistingDoc(i)}
                />
              ))}
              {newDocInfo.map((doc, i) => (
                <DocRow
                  key={`ndoc-${i}`}
                  name={doc.name}
                  size={doc.size}
                  onRemove={() => removeNewDoc(i)}
                />
              ))}
              <DropZone accept=".pdf,.doc,.docx" multiple onChange={handleNewDocs}>
                <p className="text-sm font-medium">Drop documents here or click to browse</p>
                <p className="text-xs text-muted-foreground">PDF, DOC, DOCX · Max 10 MB each</p>
              </DropZone>
            </CardContent>
          </Card>

          {/* Save media changes */}
          <div className="flex justify-end">
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save Media Changes"}
            </Button>
          </div>
        </TabsContent>

        {/* ── Stats tab ── */}
        <TabsContent value="stats" className="mt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Slots", value: plot.totalSlots || 0, icon: Car },
              { label: "Available", value: plot.availableSlots ?? plot.totalSlots ?? 0, icon: CheckCircle2 },
              { label: "Rating", value: plot.rating ? plot.rating.toFixed(1) : "—", icon: Star },
              { label: "Reviews", value: plot.reviewCount ?? 0, icon: BarChart3 },
            ].map(({ label, value, icon: Icon }) => (
              <Card key={label}>
                <CardContent className="pt-5 text-center">
                  <Icon className="h-6 w-6 mx-auto text-primary mb-2" />
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="mt-4">
            <CardContent className="py-10 text-center text-muted-foreground">
              <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Detailed booking analytics coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{plot.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the plot, all images and documents. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting…</> : "Yes, Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Image preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          <div className="relative aspect-video w-full">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full h-full object-contain rounded-md"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}