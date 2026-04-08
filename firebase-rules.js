rules_version = "2"
\
service cloud.firestore
{
  match / databases / { database } / documents
  {
    // Helper functions
    function isSignedIn() {
      return request.auth != null
    }

    function isOwner(userId) {
      return request.auth.uid == userId
    }

    function hasRole(role) {
      return get(/databases/$(database) / documents / users / $(request.auth.uid)).data.role == role
    }

    function isAdmin() {
      return get(/databases/$(database) / documents / users / $(request.auth.uid)).data.role == "admin"
    }

    function isPlotOwner(plotId) {
      return get(/databases/$(database) / documents / plots / $(plotId)).data.ownerId == request.auth.uid
    }

    // Users collection
    match / users / { userId }
    allow
    if isSignedIn();
    allow
    if isSignedIn() && isOwner(userId);
    allow
    if isSignedIn() && isOwner(userId);
    allow
    delete
    :
    if isSignedIn() && isAdmin();

    // Plots collection
    match / plots / { plotId }
    allow
    if true; // Public read access
    allow
    if isSignedIn() && hasRole('owner');
    allow
    if isSignedIn() && (isPlotOwner(plotId) || isAdmin());
    allow
    delete
    :
    if isSignedIn() && (isPlotOwner(plotId) || isAdmin());

    // Bookings collection
    match / bookings / { bookingId }
    allow
    if isSignedIn() && (
        request.auth.uid == resource.data.userId || 
        isPlotOwner(resource.data.plotId) || 
        isAdmin()
      );
    allow
    if isSignedIn();
    allow
    if isSignedIn() && (
        request.auth.uid == resource.data.userId || 
        isPlotOwner(resource.data.plotId) || 
        isAdmin()
      );
    allow
    delete
    :
    if isSignedIn() && isAdmin();

    // Reviews collection
    match / reviews / { reviewId }
    allow
    if true; // Public read access
    allow
    if isSignedIn();
    allow
    if isSignedIn() && request.auth.uid == resource.data.userId;
    allow
    delete
    :
    if isSignedIn() && (request.auth.uid == resource.data.userId || isAdmin());

    // Notifications collection
    match / notifications / { notificationId }
    allow
    if isSignedIn() && request.auth.uid == resource.data.userId;
    allow
    if isSignedIn();
    allow
    if isSignedIn() && request.auth.uid == resource.data.userId;
    allow
    delete
    :
    if isSignedIn() && (request.auth.uid == resource.data.userId || isAdmin());

    // Transactions collection
    match / transactions / { transactionId }
    allow
    if isSignedIn() && (
        request.auth.uid == resource.data.userId || 
        isPlotOwner(resource.data.plotId) || 
        isAdmin()
      );
    allow
    if isSignedIn();
    allow
    if isSignedIn() && isAdmin();
    allow
    delete
    :
    if isSignedIn() && isAdmin();
  }
}
