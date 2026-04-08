# Owner Dashboard Setup Guide

## Features Implemented

### 1. **Enhanced Owner Dashboard** (`/dashboard/owner-dashboard`)
   - **Stats Overview**: Total plots, pending approvals, bookings, total revenue
   - **Monthly Earnings**: Track earnings by month with dropdown selector
   - **My Plots**: Grid view of all owner's plots with images and quick actions
   - **Recent Bookings**: Latest 5 bookings for owner's plots with status

### 2. **Plot Management** (`/dashboard/plots/[id]/manage`)
   - **Upload Images**: Via Cloudinary or local file upload
   - **Edit Plot Details**: Update name, location, description, price, total slots
   - **Update Coordinates**: Set latitude/longitude for map integration
   - **Delete Plot**: Remove plot entirely (with confirmation)
   - **Image Management**: Add/remove multiple images

### 3. **Add New Plot** (`/dashboard/plots/add`)
   - **Form Validation**: Schema validation with detailed error messages
   - **Image Uploads**: Multiple image support (Firebase Storage or Cloudinary)
   - **Document Uploads**: Support for property documents
   - **Auto-Geolocation**: Get current location with address lookup
   - **Plot Details**: Name, address, description, price, and slot count

## Setup Instructions

### Step 1: Firebase Admin Configuration
Your Firebase Admin credentials are already configured through environment variables.

### Step 2: Cloudinary Setup (Optional but Recommended)
For faster image uploads, configure Cloudinary:

1. **Create Cloudinary Account**
   - Go to https://cloudinary.com/
   - Sign up for a FREE account

2. **Get Your Credentials**
   - Dashboard → Settings → API Key
   - Copy your: CLOUD_NAME, API_KEY

3. **Create Upload Preset**
   - Cloudinary Dashboard → Settings → Upload → Add upload preset
   - Name it: `parking_plots` (or your choice)
   - Set "Signing Mode" to "Unsigned"
   - Save the preset name

4. **Add to `.env.local`**
   ```
   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name
   NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=parking_plots
   ```

5. **Restart Dev Server** (Important!)
   ```
   Restart the dev server for new environment variables to take effect
   ```

### Step 3: Google Maps Setup (Optional)
For auto-address lookup from location:

1. **Create Google Cloud Project**
   - Go to https://console.cloud.google.com/
   - Create a new project

2. **Enable APIs**
   - Enable: Geocoding API, Maps JavaScript API

3. **Create API Key**
   - APIs & Services → Credentials → Create API Key
   - Copy the key

4. **Add to `.env.local`**
   ```
   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
   ```

## Database Schema

### Plots Collection
```javascript
{
  id: string,              // Auto-generated
  name: string,            // Plot name
  address: string,         // Location address
  description: string,     // Plot description
  price: number,          // Hourly price in ₹
  totalSlots: number,     // Total parking spaces
  availableSlots: number, // Currently available
  ownerId: string,        // Owner Firebase UID
  ownerName: string,      // Owner display name
  images: string[],       // Array of image URLs
  documents: string[],    // Array of document URLs (Cloudinary/Firebase)
  lat: number,            // Latitude
  lng: number,            // Longitude
  approvalStatus: string, // "pending" | "approved" | "rejected"
  rating: number,         // Average rating (0-5)
  reviewCount: number,    // Number of reviews
  isActive: boolean,      // Active/inactive status
  createdAt: Date,        // Creation timestamp
  updatedAt: Date,        // Last update timestamp
}
```

## API Endpoints

### Get Plots by Owner
```
GET /api/plots?ownerId={userId}
Response: Array of plot objects
```

### Get Single Plot
```
GET /api/plots?plotId={plotId}
Response: Single plot object
```

### Create Plot
```
POST /api/plots
Body: {
  name, address, description, price, totalSlots,
  ownerId, ownerName, images, documents, lat, lng
}
Response: Created plot object with ID
```

### Update Plot
```
PUT /api/plots/{plotId}
Body: Updated plot fields
Response: Success message with updated data
```

### Delete Plot
```
DELETE /api/plots/{plotId}
Response: Success message
```

## Monthly Earnings Calculation

Earnings are calculated from confirmed bookings:
- Only "confirmed" bookings are counted (cancelled bookings are excluded)
- Amount = booking.amount (from booking record)
- Monthly grouping by: `new Date(booking.createdAt).toISOString().slice(0, 7)` (YYYY-MM)

## Image Upload Options

### Option 1: Cloudinary (Recommended)
- Faster uploads
- Better performance
- Less storage usage
- Requires Cloudinary account setup

### Option 2: Firebase Storage
- Integrated with project
- Works without additional setup
- Suitable for smaller scale

Both can be used together - images are stored in their respective services.

## Workflow for Plot Owners

1. **Login** → Role-based routing to `/dashboard/owner-dashboard`
2. **View Dashboard** → See stats, earnings, plots, and recent bookings
3. **Add Plot** → Click "Add New Plot" button
   - Fill in all details
   - Upload images
   - Submit for approval
4. **Manage Plot** → Click "Edit" on any plot
   - Update details
   - Add/remove images
   - Delete if needed
5. **Track Earnings** → Select month from dropdown
   - See total earnings for that month
   - View recent bookings below

## Environment Variables Needed

Copy to your `.env.local`:

```env
# Required (Already configured)
FIREBASE_PROJECT_ID=park-it-rent-it
FIREBASE_PRIVATE_KEY_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_CLIENT_ID=...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_X509_CERT_URL=...

# Optional
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_DATABASE_URL=
```

## Troubleshooting

### Images not uploading?
- Ensure Cloudinary credentials are set if using Cloudinary
- Check Firebase Storage rules if using Firebase
- Restart dev server after adding environment variables

### Monthly earnings showing zero?
- Ensure bookings have `status: "confirmed"`
- Check that bookings have `amount` and `createdAt` fields
- Verify bookings are in the selected month

### Plot edit page not loading?
- Confirm you are the plot owner (ownerId matches user.uid)
- Try refreshing the page
- Check browser console for errors

### Geolocation not working?
- Enable location permission in browser
- Ensure Google Maps API key is configured
- HTTPS or localhost required for geolocation

## Future Enhancements

- Plot analytics (views, bookings over time)
- Bulk plot upload
- Template plots for quick creation
- Advanced availability management
- Seasonal pricing
- Plot visibility settings
- Customer reviews and ratings

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review browser console for error messages
3. Verify all environment variables are correctly set
4. Ensure .env.local file exists in project root
