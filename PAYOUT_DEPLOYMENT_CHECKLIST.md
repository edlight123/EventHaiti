# Payout System Deployment Checklist

## ✅ Build Verification Complete
- **Status**: Build successful (116 pages compiled)
- **Build ID**: Generated at `.next/BUILD_ID`
- **TypeScript Errors**: None
- **Warnings**: Only pre-existing React Hook dependency warnings (not related to payout system)

## 📋 Pre-Deployment Steps

### 1. Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```

**Expected indexes** (from `firestore.indexes.json`):
- Collection Group: `payouts`
  - Fields: `status` (ASCENDING), `createdAt` (ASCENDING)
  - Used by: Admin payout queue page

**Verification**:
1. Go to Firebase Console → Firestore → Indexes
2. Confirm "payouts" collectionGroup index shows as "Enabled"
3. If "Building", wait for completion (may take several minutes)

### 2. Deploy Firestore Security Rules

**Rules to add** (from `PAYOUT_FIRESTORE_RULES.md`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Existing rules...
    
    // Payout system rules
    match /organizers/{organizerId}/payouts/{payoutId} {
      // Organizers can view their own payouts
      allow read: if request.auth != null && request.auth.uid == organizerId;
      
      // Organizers can create payout requests (status must be 'pending')
      allow create: if request.auth != null 
                    && request.auth.uid == organizerId
                    && request.resource.data.status == 'pending'
                    && request.resource.data.requestedBy == organizerId;
      
      // Only admins can update payouts (approve/decline/mark-paid)
      allow update: if request.auth != null 
                    && exists(/databases/$(database)/documents/users/$(request.auth.uid))
                    && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
      
      // No deletes allowed
      allow delete: if false;
    }
    
    // PayoutConfig rules (already exist, but verify)
    match /organizers/{organizerId}/payoutConfig/{configId} {
      allow read, write: if request.auth != null && request.auth.uid == organizerId;
    }
  }
}
```

**Deploy command**:
```bash
firebase deploy --only firestore:rules
```

**Verification**:
1. Go to Firebase Console → Firestore → Rules
2. Verify rules were deployed (check timestamp)
3. Test with Rules Playground:
   - Organizer read own payout: ALLOW
   - Organizer read other payout: DENY
   - Admin approve payout: ALLOW
   - Non-admin approve payout: DENY

### 3. Verify Environment Variables

Ensure these are set in `.env.local` and production environment:

```bash
# Firebase Admin (for server-side operations)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=

# Firebase Client (for Auth)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=

# Payment Gateways (for tracking payment_method in tickets)
STRIPE_SECRET_KEY=
MONCASH_CLIENT_ID=
MONCASH_CLIENT_SECRET=
NATCASH_API_KEY=
```

## 🧪 Post-Deployment Testing

### Test 1: Organizer Balance Calculation
**URL**: `/organizer/payouts`
**Steps**:
1. Login as an organizer with sold tickets
2. Verify balance cards show:
   - Available balance (tickets from events ended 7+ days ago)
   - Pending balance (tickets from recent events)
   - Total earnings (all paid tickets)
3. Check "Next Payout Date" shows upcoming Friday 5PM

**Expected**:
- Balance matches: (tickets.price_paid × 0.9) sum
- No tickets appear in multiple payouts

### Test 2: Payout Request (Idempotency)
**URL**: `/organizer/payouts`
**Steps**:
1. Click "Request Payout" button
2. Verify payout appears in "Payout History" with status "pending"
3. Immediately click "Request Payout" again
4. Should see error: "You already have a payout in progress"

**Expected**:
- Only one payout created
- Second request blocked by idempotency check
- `ticketIds[]` array populated in Firestore document

### Test 3: Admin Approval (Transaction Safety)
**URL**: `/admin/payouts`
**Steps**:
1. Login as admin
2. Open payout queue, see pending payout
3. In two browser tabs, click "Approve" simultaneously
4. Only one approval should succeed

**Expected**:
- Payout status changes to "approved"
- Second approval fails with "Already processed"
- `approvedBy` and `approvedAt` fields set

### Test 4: Mark as Paid
**URL**: `/admin/payouts`
**Steps**:
1. Click "Mark Paid" on approved payout
2. Enter payment reference ID (e.g., "MC123456789")
3. Optionally add payment method and notes
4. Submit

**Expected**:
- Status changes to "completed"
- `paymentReferenceId` saved
- Payout removed from pending queue
- Organizer sees status "completed" in history

### Test 5: Balance Exclusion After Payout
**URL**: `/organizer/payouts`
**Steps**:
1. Complete payout request → approval → mark paid
2. Return to organizer payout dashboard
3. Verify available balance decreased
4. Check that paid tickets don't appear in new payout requests

**Expected**:
- Balance excludes tickets from completed payouts
- `ticketIds[]` array prevents double-counting
- Same ticket never appears in two payouts

### Test 6: CSV Export
**URL**: `/admin/payouts`
**Steps**:
1. Click "Export CSV" button
2. Open downloaded file

**Expected columns**:
- Organizer Name
- Email
- Amount
- Currency
- Payment Method
- Requested Date
- Scheduled Date (next Friday)
- Tickets Count
- Period (date range)

## 🔍 Monitoring

### Key Metrics to Track

1. **Payout Request Volume**:
   ```javascript
   adminDb.collectionGroup('payouts')
     .where('createdAt', '>', lastWeek)
     .count()
   ```

2. **Average Processing Time** (pending → completed):
   - Target: < 7 days
   - Monitor: `completedAt - createdAt` distribution

3. **Failed Payouts**:
   - Count payouts with status "cancelled"
   - Review `declineReason` for common issues

4. **Balance Accuracy**:
   - Compare `getOrganizerBalance()` with manual calculations
   - Audit: sum of ticket amounts vs. payout amounts

### Error Monitoring

Watch for these errors in logs:

**"Payout already in progress"**:
- Cause: Organizer clicking "Request Payout" multiple times
- Action: Normal idempotency check, no action needed

**"Status is not pending"**:
- Cause: Admin trying to approve already-processed payout
- Action: Normal transaction safety, no action needed

**"Insufficient balance"**:
- Cause: Available balance < $50 minimum
- Action: Expected behavior, organizer needs to wait for more sales

**"Transaction failed"**:
- Cause: Firestore transaction retry exhausted
- Action: Investigate concurrent updates, check Firestore quotas

## 🚨 Rollback Plan

If issues arise, disable payout creation:

1. **Quick disable** (Firestore Rules):
   ```javascript
   // Temporarily block payout creation
   match /organizers/{organizerId}/payouts/{payoutId} {
     allow create: if false;  // Block new requests
     allow read, update: if ... // Keep existing rules
   }
   ```

2. **Code rollback**:
   ```bash
   # Revert payout API routes
   git revert <commit-hash>
   npm run build
   # Redeploy
   ```

3. **Data cleanup** (if needed):
   ```javascript
   // Delete stuck payouts
   adminDb.collectionGroup('payouts')
     .where('status', '==', 'pending')
     .where('createdAt', '<', oneWeekAgo)
     .get()
     .then(snapshot => {
       const batch = adminDb.batch()
       snapshot.docs.forEach(doc => batch.delete(doc.ref))
       return batch.commit()
     })
   ```

## 📊 Success Criteria

- ✅ No duplicate payouts for same tickets
- ✅ No double-approvals by admins
- ✅ Balance calculations accurate (10% platform fee applied)
- ✅ Security rules prevent unauthorized access
- ✅ CSV export works for batch processing
- ✅ Page load times < 3 seconds
- ✅ Zero TypeScript errors in production build

## 📝 Documentation Links

- **Schema Design**: `/PAYOUT_SCHEMA.md`
- **Security Rules**: `/PAYOUT_FIRESTORE_RULES.md`
- **Implementation Guide**: `/PAYOUT_IMPLEMENTATION_SUMMARY.md`
- **Code Files**:
  - Library: `/lib/firestore/payout.ts`
  - Organizer API: `/app/api/organizer/request-payout/route.ts`
  - Admin APIs: `/app/api/admin/payouts/{approve,decline,mark-paid}/route.ts`
  - Organizer UI: `/app/organizer/payouts/*`
  - Admin UI: `/app/admin/payouts/*`

---

**Last Updated**: December 2024  
**Build Status**: ✅ Passing (116 pages compiled successfully)  
**Ready for Deployment**: Yes
