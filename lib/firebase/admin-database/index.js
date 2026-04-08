// Export all admin database functions
import * as usersDb from "./users"
import * as plotsDb from "./plots"
import * as bookingsDb from "./bookings"
import * as reviewsDb from "./reviews"
import * as notificationsDb from "./notifications"
import * as transactionsDb from "./transactions"
import * as authDb from "./auth"
import * as vehiclesDb from "./vehicles"

// Group all admin database services
const adminDbService = {
  users: usersDb,
  plots: plotsDb,
  bookings: bookingsDb,
  reviews: reviewsDb,
  notifications: notificationsDb,
  transactions: transactionsDb,
  auth: authDb,
  vehicles: vehiclesDb,
}

export default adminDbService
export { usersDb, plotsDb, bookingsDb, reviewsDb, notificationsDb, transactionsDb, authDb, vehiclesDb }
