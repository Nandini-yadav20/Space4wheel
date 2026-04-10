# Plot Management System - Implementation Guide

## Overview
A complete Plot Management System has been implemented for the Space4Wheels parking web app using:
- **Next.js** (App Router)
- **Firebase Firestore** (Database)
- **Firebase Authentication** (User Management)
- **Cloudinary** (Image Upload & Storage)

## Architecture

### Key Components

#### 1. **Firestore Database Structure**
```
plots/ (collection)
├── {plotId} (document)
│   ├── name (string)
│   ├── address (string)
│   ├── price (number)
│   ├── totalSlots (number)
│   ├── availableSlots (number)
│   ├── ownerId (string) - Firebase user ID
│   ├── approvalStatus (string) - "pending", "approved", "rejected"
│   ├── images (array of objects)
│   │   └── { url: "cloudinary_url", name?: string, uploadedAt?: timestamp }
│   ├── rating (number)
│   ├── reviewCount (number)
│   ├── createdAt (timestamp)
│   └── updatedAt (timestamp)
```

### Created Files

#### Core Utilities
1. **`lib/firebase/firestore.js`**
   - Client-side Firestore initialization
   - Singleton instance for all client components

2. **`lib/firebase/plot-actions.js`**
   - All Firestore CRUD operations for plots
   - Functions:
     - `addPlot()` - Create new plot
     - `getOwnerPlots(userId)` - Fetch user's plots
     - `getPlot(plotId)` - Get single plot
     - `updatePlot(plotId, data)` - Update plot
     - `deletePlot(plotId)` - Delete plot
     - `getApprovedPlots()` - Get all approved plots (for browsing)
     - `updatePlotApprovalStatus()` - Admin function
     - `updateAvailableSlots()` - Manage availability

3. **`lib/firebase/firebase-provider.jsx`** (Updated)
   - Added Firestore initialization
   - New hook: `useFirestore()`

#### UI Components
1. **`components/plot-management/ImageUploadPreview.jsx`**
   - Drag-and-drop image upload
   - Multiple image support
   - Cloudinary integration
   - Image preview gallery
   - Remove image functionality
   - Progress feedback

#### Pages

1. **`app/dashboard/plots/page.jsx`**
   - Main plots list page
   - Features:
     - Grid view with cards
     - Real-time loading from Firestore
     - Delete confirmation dialog
     - Empty state handling
     - Approval status display
     - Occupancy percentage display
     - Quick stats (Total, Approved, Pending)
     - Responsive design

2. **`app/dashboard/plots/add/page.jsx`**
   - Create new parking plot
   - Features:
     - Form validation using Zod
     - Multiple image upload with preview
     - Cloudinary image processing
     - Auto-set availableSlots = totalSlots
     - Auto-set approvalStatus = "pending"
     - Loading states and error handling
     - Toast notifications
     - Private (owner-only) access

3. **`app/dashboard/plots/[id]/edit/page.jsx`**
   - Edit existing plots
   - Features:
     - Pre-fill with existing data
     - Update all fields
     - Replace images
     - Owner verification
     - Approval status display
     - Loading states

## User Flows

### 1. Owner Adding a Plot
```
Owner (Logged in, role="owner")
  ↓
/dashboard/plots/add
  ↓
Fill form (name, address, price, totalSlots)
  ↓
Upload images (drag-drop or click)
  ↓
Submit → Upload images to Cloudinary → Store plot in Firestore
  ↓
Navigate to /dashboard/plots/add (success)
  ↓
Plot stored with:
  - approvalStatus: "pending"
  - availableSlots: totalSlots
  - images: [{ url: "cloudinary_url" }]
```

### 2. Owner Viewing Plots
```
Owner logs in
  ↓
/dashboard/plots
  ↓
Fetch from Firestore: plots where ownerId == user.uid
  ↓
Display in grid/card format
  ↓
Each plot shows:
  - Image
  - Name, Address
  - Price, Total Slots, Available Slots
  - Approval Status
  - Occupancy Bar
  - Action buttons (View, Edit, Delete)
```

### 3. Owner Editing a Plot
```
Click Edit on plot card
  ↓
/dashboard/plots/[id]/edit
  ↓
Fetch plot from Firestore
  ↓
Verify user is owner
  ↓
Pre-fill form with existing data
  ↓
User can:
  - Change name, address, price, slots
  - Add/remove images (new images upload to Cloudinary)
  ↓
Submit → Update Firestore document
  ↓
Navigate back to plots list
```

### 4. Owner Deleting a Plot
```
Click Delete on plot card
  ↓
Show confirmation dialog
  ↓
Confirm delete
  ↓
Remove from Firestore
  ↓
Update UI (remove from list)
  ↓
Toast notification
```

## Integration with Existing Features

### Firebase Authentication
- Uses existing `useAuth()` hook
- Verifies user role is "owner"
- All operations tied to `user.uid`

### Cloudinary Integration
- Uses existing `uploadToCloudinary()` function
- Images stored as objects: `{ url: "https://..." }`
- Multiple image support maintained

### UI Components
- Uses existing components from `/components/ui/`
- Consistent styling with dark mode support
- Toast notifications using existing `useToast()`

## Security Rules (Firestore)

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Plots collection rules
    match /plots/{plotId} {
      // Read: Only authenticated users can read approved plots
      // Write: Only owners can write/modify their own plots
      allow read: if request.auth != null;
      allow create: if request.auth.uid != null 
                    && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if resource.data.ownerId == request.auth.uid;
    }
  }
}
```

## Environment Variables Required

```
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_preset
```

## Features Implemented

✅ Create plots with multiple images
✅ Read/List own plots
✅ Update plot details and images
✅ Delete plots
✅ Image upload to Cloudinary
✅ Form validation
✅ Error handling
✅ Loading states
✅ Toast notifications
✅ Responsive design
✅ Owner verification
✅ Approval status tracking
✅ Slot availability management
✅ Dark mode support

## Performance Optimizations

1. **Images**: Stored in Cloudinary (CDN delivery)
2. **Firestore**: Direct queries filtered by `ownerId`
3. **UI**: Loading skeletons, error boundaries
4. **Code Splitting**: Each page is a separate bundle

## Future Enhancements

- Admin dashboard for plot approval/rejection
- Real-time booking slot updates
- Plot analytics and statistics
- Review system integration
- Payment settlement
- Email notifications for approval status
- Image compression at upload time
- Video support

## Database Indexing

Consider creating these indexes in Firebase:
```
Collection: plots
  Fields:
    - ownerId (Ascending)
    - approvalStatus (Ascending)
    - createdAt (Descending)
```

## Testing Checklist

- [ ] Create plot with 1 image
- [ ] Create plot with multiple images
- [ ] Edit plot (change all fields)
- [ ] Delete plot
- [ ] Verify non-owners can't edit/delete
- [ ] Check image URLs in Firestore
- [ ] Verify approvalStatus is "pending"
- [ ] Test form validation
- [ ] Test error handling
- [ ] Verify toast notifications
- [ ] Check responsive design on mobile
- [ ] Test dark mode styling

## API Reference

### Plot Actions (lib/firebase/plot-actions.js)

```javascript
// Add new plot
await addPlot({
  name: string,
  address: string,
  price: number,
  totalSlots: number,
  ownerId: string,
  images: Array<{url, name?, uploadedAt?}>
}) // Returns plotId

// Get owner's plots
const plots = await getOwnerPlots(userId) // Returns Array<PlotDoc>

// Get single plot
const plot = await getPlot(plotId) // Returns PlotDoc

// Update plot
await updatePlot(plotId, {
  name?: string,
  address?: string,
  price?: number,
  totalSlots?: number,
  images?: Array,
  approvalStatus?: string,
  availableSlots?: number
})

// Delete plot
await deletePlot(plotId)

// Get all approved plots
const plots = await getApprovedPlots() // Returns Array<PlotDoc>

// Update available slots
await updateAvailableSlots(plotId, -1) // Negative to decrease, positive to increase
```

## Deployment Checklist

1. Ensure Firestore database is created
2. Set Firestore security rules
3. Configure Cloudinary account
4. Add environment variables to deployment
5. Test all flows in production
6. Enable Firebase billing (if exceeded free tier)
7. Set up monitoring/analytics
8. Backup strategy for data

---

**Implementation Status**: ✅ Complete
**Last Updated**: 2026-04-08
