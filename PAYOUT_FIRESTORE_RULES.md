# Firestore Security Rules for Payout System

## Overview
These rules must be added to your `firestore.rules` file to secure the payout system.

## Rules to Add

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper function to check if user is admin
    function isAdmin() {
      return request.auth != null && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Payout Config: Organizers can read/write their own, admins can read all
    match /organizers/{organizerId}/payoutConfig/{configId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == organizerId || isAdmin());
      
      allow create, update: if isAuthenticated() && 
                                request.auth.uid == organizerId;
      
      allow delete: if false;  // Never allow deletion of payout config
    }
    
    // Verification Documents: Organizers can write their own, admins can read
    match /organizers/{organizerId}/verificationDocuments/{docId} {
      allow read: if isAuthenticated() && 
                     (request.auth.uid == organizerId || isAdmin());
      
      allow create, update: if isAuthenticated() && 
                                request.auth.uid == organizerId;
      
      allow delete: if false;  // Never allow deletion of verification docs
    }
    
    // Payouts: Organizers can read their own and create requests
    // Only admins can update status (approve/decline/mark-paid)
    match /organizers/{organizerId}/payouts/{payoutId} {
      // Read: Organizer can read their own, admins can read all
      allow read: if isAuthenticated() && 
                     (request.auth.uid == organizerId || isAdmin());
      
      // Create: Only organizer can create payout request
      // MUST have status='pending' and requestedBy=organizerId
      allow create: if isAuthenticated() && 
                       request.auth.uid == organizerId &&
                       request.resource.data.status == 'pending' &&
                       request.resource.data.requestedBy == organizerId &&
                       request.resource.data.organizerId == organizerId;
      
      // Update: Only admins can update (for approve/decline/mark-paid)
      // Prevent admins from creating payouts or deleting them
      allow update: if isAdmin() &&
                       resource.data.organizerId == organizerId;  // Verify organizerId doesn't change
      
      // Delete: Never allow deletion of payout records (audit trail)
      allow delete: if false;
    }
    
    // Existing rules for other collections...
    // (Keep your existing rules for events, tickets, users, etc.)
  }
}
```

## Key Security Guarantees

### 1. **Organizer Isolation**
- Organizers can only read/write their own payout data
- Cannot access other organizers' payouts or configs

### 2. **Status Control**
- Organizers can only create payouts with `status='pending'`
- Only admins can change status to `approved`, `completed`, or `cancelled`
- Prevents organizers from self-approving payouts

### 3. **Audit Trail**
- No deletion allowed for payouts, payout configs, or verification docs
- All changes are tracked via `createdAt`, `updatedAt`, `approvedBy`, etc.

### 4. **Admin-Only Actions**
- Approving payouts
- Declining payouts
- Marking payouts as paid
- Reading all organizers' payout data (for admin dashboard)

### 5. **Idempotency Protection**
- Client-side: Organizers cannot modify existing payout requests
- Server-side: API uses Firestore transactions (prevents race conditions)
- ticketIds array prevents double-counting (same ticket can't be in 2 payouts)

## Testing Rules

After deploying, test with:

```bash
# From Firebase Console → Firestore → Rules tab
# Click "Rules Playground"

# Test 1: Organizer reads own payout config
Auth: organizer_uid_123
Path: /organizers/organizer_uid_123/payoutProfiles/haiti
Operation: get
Expected: ✅ ALLOW

# Test 2: Organizer reads another organizer's payout config
Auth: organizer_uid_123
Path: /organizers/organizer_uid_456/payoutProfiles/haiti
Operation: get
Expected: ❌ DENY

# Test 3: Admin reads any organizer's payout config
Auth: admin_uid_789
Path: /organizers/organizer_uid_123/payoutProfiles/haiti
Operation: get
Expected: ✅ ALLOW

# Test 3b: Legacy payout config (backward compatibility)
Auth: admin_uid_789
Path: /organizers/organizer_uid_123/payoutConfig/main
Operation: get
Expected: ✅ ALLOW

# Test 4: Organizer creates payout with status='pending'
Auth: organizer_uid_123
Path: /organizers/organizer_uid_123/payouts/payout_xyz
Operation: create
Data: { status: 'pending', requestedBy: 'organizer_uid_123', organizerId: 'organizer_uid_123' }
Expected: ✅ ALLOW

# Test 5: Organizer tries to create payout with status='approved'
Auth: organizer_uid_123
Path: /organizers/organizer_uid_123/payouts/payout_xyz
Operation: create
Data: { status: 'approved', requestedBy: 'organizer_uid_123', organizerId: 'organizer_uid_123' }
Expected: ❌ DENY

# Test 6: Organizer tries to update payout status
Auth: organizer_uid_123
Path: /organizers/organizer_uid_123/payouts/payout_xyz
Operation: update
Data: { status: 'approved' }
Expected: ❌ DENY

# Test 7: Admin updates payout status
Auth: admin_uid_789
Path: /organizers/organizer_uid_123/payouts/payout_xyz
Operation: update
Data: { status: 'approved', approvedBy: 'admin_uid_789' }
Expected: ✅ ALLOW

# Test 8: Anyone tries to delete payout
Auth: any_uid
Path: /organizers/organizer_uid_123/payouts/payout_xyz
Operation: delete
Expected: ❌ DENY
```

## Deployment

1. Copy the rules above into your `firestore.rules` file
2. Deploy via Firebase CLI:
   ```bash
   firebase deploy --only firestore:rules
   ```
3. Or deploy via Firebase Console:
   - Go to Firestore → Rules tab
   - Paste rules and click "Publish"

## Notes

- These rules complement your existing rules (don't replace them)
- The `isAdmin()` helper assumes you have a `users` collection with a `role` field
- Adjust paths if your organizer data is stored differently
- Always test rules in Firebase Console before deploying to production
