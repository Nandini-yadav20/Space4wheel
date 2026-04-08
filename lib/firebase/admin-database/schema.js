/**
 * Firebase Database Schema
 *
 * This file outlines the structure of the Firestore collections and documents
 * used in the car parking system application.
 */

/**
 * Collection: users
 * Document ID: user.uid (Firebase Auth UID)
 * Purpose: Stores user profile information and preferences
 *
 * Fields:
 * - uid: string (Firebase Auth UID)
 * - email: string
 * - name: string
 * - role: string ('user' or 'owner')
 * - phone: string (optional)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 * - profileImageUrl: string (optional)
 * - defaultPaymentMethod: string (optional)
 * - notificationPreferences: {
 *     email: boolean,
 *     push: boolean,
 *     sms: boolean
 *   }
 */

/**
 * Collection: plots
 * Document ID: auto-generated
 * Purpose: Stores parking plot information
 *
 * Fields:
 * - name: string
 * - address: string
 * - description: string
 * - price: number (hourly rate)
 * - totalSlots: number
 * - availableSlots: number
 * - ownerId: string (reference to users collection)
 * - ownerName: string
 * - lat: number (latitude)
 * - lng: number (longitude)
 * - images: array of strings (URLs)
 * - features: array of strings
 * - rating: number (average rating)
 * - reviewCount: number
 * - isActive: boolean
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

/**
 * Collection: bookings
 * Document ID: auto-generated
 * Purpose: Stores booking information
 *
 * Fields:
 * - userId: string (reference to users collection)
 * - plotId: string (reference to plots collection)
 * - plotName: string
 * - plotAddress: string
 * - date: string (YYYY-MM-DD)
 * - startTime: string (HH:MM)
 * - endTime: string (HH:MM)
 * - duration: number (in hours)
 * - price: number (total price)
 * - status: string ('pending', 'confirmed', 'completed', 'cancelled')
 * - paymentStatus: string ('pending', 'paid', 'refunded')
 * - paymentMethod: string (optional)
 * - paymentId: string (optional)
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

/**
 * Collection: reviews
 * Document ID: auto-generated
 * Purpose: Stores user reviews for parking plots
 *
 * Fields:
 * - userId: string (reference to users collection)
 * - userName: string
 * - plotId: string (reference to plots collection)
 * - bookingId: string (reference to bookings collection)
 * - rating: number (1-5)
 * - comment: string
 * - createdAt: timestamp
 * - updatedAt: timestamp
 */

/**
 * Collection: notifications
 * Document ID: auto-generated
 * Purpose: Stores user notifications
 *
 * Fields:
 * - userId: string (reference to users collection)
 * - type: string ('booking_confirmation', 'booking_reminder', 'booking_cancelled', etc.)
 * - title: string
 * - message: string
 * - read: boolean
 * - data: object (additional data related to the notification)
 * - createdAt: timestamp
 */

/**
 * Collection: transactions
 * Document ID: auto-generated
 * Purpose: Stores payment transaction records
 *
 * Fields:
 * - userId: string (reference to users collection)
 * - bookingId: string (reference to bookings collection)
 * - plotId: string (reference to plots collection)
 * - amount: number
 * - currency: string (default: 'USD')
 * - status: string ('pending', 'completed', 'failed', 'refunded')
 * - paymentMethod: string
 * - paymentId: string (payment gateway transaction ID)
 * - createdAt: timestamp
 */
