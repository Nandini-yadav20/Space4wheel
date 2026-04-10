# Plot Management System - Quick Start Guide

## 🚀 Quick Start

### 1. Setup Environment Variables

Add to your `.env.local`:

```env
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_name

# Firebase is already configured in lib/firebase/firebase-config.js
# Update if needed
```

### 2. Enable Firestore in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Click **Create Database**
5. Start in **Production Mode** (or Test Mode for development)
6. Choose region closest to your users

### 3. Configure Firestore Security Rules

Go to **Firestore → Rules** and paste:

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /plots/{plotId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid != null 
                    && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if resource.data.ownerId == request.auth.uid;
    }
  }
}
```

### 4. Setup Cloudinary

1. Sign up at [Cloudinary](https://cloudinary.com)
2. Get your **Cloud Name** from dashboard
3. Go to **Settings → Upload**
4. Create an **Unsigned Upload Preset**
5. Add the preset name to `.env.local`

### 5. Test the System

#### As an Owner:
```
1. Log in with owner role (role: "owner")
2. Navigate to /dashboard/plots
3. Click "Add Plot"
4. Fill form and upload images
5. Click "Create Plot"
6. See plot in your list
7. Try editing and deleting
```

## 📁 File Structure

```
components/
  plot-management/
    ImageUploadPreview.jsx          # Image upload component

lib/
  firebase/
    firestore.js                    # Firestore initialization
    plot-actions.js                 # All plot CRUD operations
    firebase-provider.jsx           # Updated with Firestore support

app/
  dashboard/
    plots/
      page.jsx                      # List all owner's plots
      add/
        page.jsx                    # Create new plot
      [id]/
        edit/
          page.jsx                  # Edit existing plot
```

## 🔧 Key Functions

### Add Plot
```javascript
import { addPlot } from '@/lib/firebase/plot-actions'

const plotId = await addPlot({
  name: "Downtown Parking",
  address: "123 Main St",
  price: 50,
  totalSlots: 20,
  ownerId: user.uid,
  images: [{ url: "cloudinary_url" }]
})
```

### Get Owner's Plots
```javascript
import { getOwnerPlots } from '@/lib/firebase/plot-actions'

const plots = await getOwnerPlots(user.uid)
// Returns array of plot documents with IDs
```

### Update Plot
```javascript
import { updatePlot } from '@/lib/firebase/plot-actions'

await updatePlot(plotId, {
  name: "New Name",
  price: 75,
  images: [...updatedImages]
})
```

### Delete Plot
```javascript
import { deletePlot } from '@/lib/firebase/plot-actions'

await deletePlot(plotId)
```

## 🎨 UI Components

### ImageUploadPreview
```javascript
<ImageUploadPreview
  images={images}
  onChange={setImages}
  multiple={true}           // Allow multiple images
  maxSize={10}              // Max 10MB per image
/>
```

## 📊 Data Format

### Plot Document (Firestore)
```javascript
{
  id: "auto-generated-doc-id",
  name: "Central Parking",
  address: "123 Main St, City, 12345",
  price: 50.00,
  totalSlots: 20,
  availableSlots: 18,           // Updated when bookings made
  ownerId: "firebase-user-id",
  approvalStatus: "pending",    // pending, approved, rejected
  images: [
    { url: "https://cloudinary.com/...", uploadedAt: timestamp },
    { url: "https://cloudinary.com/..." }
  ],
  rating: 4.5,
  reviewCount: 10,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🔐 Security

- Only authenticated users can view plots
- Only plot owners can modify/delete their plots
- All operations use Firebase Authentication
- Images stored in Cloudinary (secured CDN)

## 🐛 Troubleshooting

### Images not uploading
- Check Cloudinary credentials in `.env.local`
- Verify unsigned upload preset name
- Check browser console for errors
- Ensure image file is < maxSize

### Plots not showing
- Verify user is logged in with "owner" role
- Check Firestore database is created
- Verify security rules allow reads
- Check browser network tab for errors

### Form validation errors
- Ensure form fields match Zod schema
- Name must be 3-100 characters
- Address must be 10-255 characters
- Price must be > 0
- Total slots must be 1-1000

## 📱 Testing Scenarios

### Scenario 1: Create and List Plots
```
1. Login as owner
2. Go to /dashboard/plots
3. Click "Add Plot"
4. Fill all fields
5. Upload at least 1 image
6. Click "Create Plot"
7. See message "Plot created"
8. See plot in list with "Pending" status
```

### Scenario 2: Edit Existing Plot
```
1. On plots list page
2. Click "Edit" button on any plot
3. Change some fields
4. Add/remove images
5. Click "Save Changes"
6. Return to list, verify changes
```

### Scenario 3: Delete Plot
```
1. On plots list page
2. Click delete icon
3. Confirm deletion
4. Plot removed from list
5. See success message
```

## 📚 Related Documentation

- [Plot Management System Documentation](./PLOT_MANAGEMENT_SYSTEM.md)
- [Firebase Auth Context](./lib/firebase/auth-context.jsx)
- [Cloudinary Upload](./lib/cloudinary.js)

## 🆘 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Images not saving | Check Cloudinary preset is unsigned and matches env var |
| Plots not loading | Verify Firestore rules allow reads, check network tab |
| Edit page shows error | Ensure user owns the plot, check Firestore rules |
| Form won't submit | Check all required fields are filled, see console errors |
| Images upload slow | Large images take time, wait for completion |

## 🎯 Next Steps

1. ✅ Setup environment variables
2. ✅ Enable Firestore
3. ✅ Configure security rules
4. ✅ Setup Cloudinary
5. ✅ Test adding a plot
6. ✅ Test editing a plot
7. ✅ Test deleting a plot
8. 📌 Implement admin approval workflow
9. 📌 Add booking integration
10. 📌 Setup analytics

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review console errors carefully
3. Verify all env variables are set
4. Check Firestore security rules
5. Test with browser DevTools

---

**Ready to start?** Go to `/dashboard/plots` and create your first parking plot! 🚗

