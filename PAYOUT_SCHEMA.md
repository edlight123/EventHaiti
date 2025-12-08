# Payout System Schema & Reuse Plan

## Schema Discovery Summary

### Existing Collections (REUSED)

#### ✅ `tickets` - Revenue Source
**Document ID:** Auto-generated  
**Path:** `/tickets/{ticketId}`

**Fields Used for Payouts:**
```typescript
{
  id: string
  event_id: string              // Link to event (which has organizer_id)
  attendee_id: string           
  price_paid: number            // ✅ Revenue amount per ticket
  payment_method: 'stripe' | 'moncash' | 'natcash'  // ✅ Payment gateway
  payment_id: string            // ✅ External payment reference
  status: 'valid' | 'cancelled' | 'refunded'  // ✅ Filter refunds
  purchased_at: string          // ✅ Timestamp for period calculations
  tier_id?: string | null
  tier_name?: string
}
```

**Why Needed:** Single source of truth for all paid orders across Stripe/MonCash/Natcash. No new collection needed - we query existing tickets and aggregate by organizer.

**Indexes Already Exist:**
- `event_id + status + purchased_at` (for filtering valid tickets)
- `event_id + purchased_at` (for date-based queries)

---

#### ✅ `events` - Organizer Mapping
**Document ID:** Auto-generated  
**Path:** `/events/{eventId}`

**Fields Used for Payouts:**
```typescript
{
  id: string
  organizer_id: string          // ✅ Links tickets → organizer
  title: string                 // For payout descriptions
  start_datetime: string        // For "available after event ends" logic
  currency: string              // HTG, USD, etc.
  status: 'published' | 'cancelled' | 'draft'
}
```

**Why Needed:** Maps tickets to organizers. No changes needed.

**Indexes Already Exist:**
- `organizer_id + created_at`
- `organizer_id + status`

---

#### ✅ `users` - Organizer Details
**Document ID:** User UID  
**Path:** `/users/{userId}`

**Fields Used for Payouts:**
```typescript
{
  id: string
  email: string                 // ✅ For notifications
  full_name: string             // ✅ For payout CSV
  role: 'organizer' | 'admin' | 'attendee'  // ✅ Access control
  verification_status: 'approved' | 'pending' | 'rejected'
}
```

**Why Needed:** User identity, email notifications, admin vs organizer checks.

---

### Existing Subcollections (REUSED & EXTENDED)

#### ✅ `organizers/{organizerId}/payoutConfig/main` - Payout Settings
**Already Exists!** (See `/lib/firestore/payout.ts`)

**Document ID:** `main` (singleton)  
**Path:** `/organizers/{organizerId}/payoutConfig/main`

**Fields:**
```typescript
{
  status: 'not_setup' | 'pending_verification' | 'active' | 'on_hold'
  method: 'bank_transfer' | 'mobile_money'
  bankDetails?: {
    accountName: string
    accountNumber: string       // Masked: ****1234
    accountNumberLast4: string
    bankName: string
    routingNumber?: string
  }
  mobileMoneyDetails?: {
    provider: 'moncash' | 'natcash'  // ✅ Supports both!
    phoneNumber: string         // Masked
    phoneNumberLast4: string
    accountName: string
  }
  verificationStatus: {
    identity: 'pending' | 'verified' | 'failed'
    bank: 'pending' | 'verified' | 'failed'
    phone: 'pending' | 'verified' | 'failed'
  }
  createdAt: string
  updatedAt: string
}
```

**Why Needed:** Already tracks MonCash/Natcash/bank details. Reused as-is for payout method info.

---

#### ✅ `organizers/{organizerId}/payouts/` - Payout History
**Already Exists!** (See `/lib/firestore/payout.ts`)

**Document ID:** Auto-generated  
**Path:** `/organizers/{organizerId}/payouts/{payoutId}`

**Existing Fields:**
```typescript
{
  id: string
  organizerId: string
  amount: number                // ✅ In cents
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  method: 'bank_transfer' | 'mobile_money'
  failureReason?: string
  scheduledDate: string
  processedDate?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}
```

**NEW FIELDS ADDED (minimal extension):**
```typescript
{
  // ✅ NEW: Idempotency & admin workflow
  requestedBy: string           // organizerId (for audit)
  approvedBy?: string           // admin userId
  approvedAt?: string
  declinedBy?: string           // admin userId  
  declinedAt?: string
  declineReason?: string
  
  // ✅ NEW: Ticket tracking (prevent double-counting)
  ticketIds: string[]           // List of ticket IDs included in this payout
  periodStart: string           // Earliest ticket purchased_at
  periodEnd: string             // Latest ticket purchased_at
  
  // ✅ NEW: Manual payment tracking
  paymentReferenceId?: string   // Admin enters after bank/MonCash transfer
  paymentMethod?: 'moncash' | 'natcash' | 'bank_transfer'  // Actual method used
  paymentNotes?: string         // Admin notes
  
  // ✅ NEW: Receipt confirmation (required for completed payouts)
  receiptUrl?: string           // Firebase Storage URL to receipt image
  receiptUploadedBy?: string    // Admin userId who uploaded receipt
  receiptUploadedAt?: string    // Timestamp of receipt upload
}
```

**Why Extended:** Need to track which tickets are included in each payout (prevents re-paying same tickets), admin approval workflow, and manual payment confirmation.

---

### NO New Collections Created

**Rationale:** 
- Tickets collection already has all payment data (Stripe/MonCash/Natcash)
- Events collection already maps tickets → organizers
- Organizers subcollections already exist for payout config & history
- Only added fields to existing `payouts` documents (minimal extension)

---

## Data Flow

### 1. Revenue Accrual (Automatic)
```
Stripe/MonCash webhook → Creates ticket with:
  - price_paid: 500 (HTG)
  - payment_method: 'moncash'
  - payment_id: 'MC_123456'
  - status: 'valid'
  - event_id: 'event_xyz'

Event lookup → organizer_id: 'org_abc'

Balance calculation (real-time):
  Query: tickets where event.organizer_id == 'org_abc' && status == 'valid'
  Sum: price_paid - platform_fee (e.g., 10%)
  Result: Available balance
```

### 2. Funds Lifecycle
```
Ticket created → PENDING (event hasn't ended)
  ↓
Event ends + 7 days → AVAILABLE (withdrawal allowed)
  ↓
Organizer requests payout → Creates payout doc (status: 'pending')
  ↓
Admin approves → Updates payout (status: 'approved')
  ↓
Admin marks paid with referenceId → Updates payout (status: 'completed')
```

### 3. Idempotency Safeguards

**Prevent Double-Counting Tickets:**
```typescript
// When calculating available balance:
1. Query all 'valid' tickets for organizer's events
2. Exclude tickets already in a completed/processing payout:
   tickets.filter(t => !t.id.in(existingPayoutTicketIds))
3. Sum remaining tickets = Available balance
```

**Prevent Duplicate Payout Requests:**
```typescript
// When organizer requests payout:
1. Check for existing payout with status 'pending' or 'processing'
2. If exists → Reject with "Payout already in progress"
3. Create new payout doc with ticketIds[] field
4. Mark those tickets as "included in payout_xyz"
```

**Prevent Double Approval:**
```typescript
// When admin approves/declines:
1. Use Firestore transaction
2. Read current payout.status
3. If status != 'pending' → Reject (already processed)
4. Update status atomically
```

---

## Query Patterns

### Organizer Dashboard Queries
```typescript
// Available balance
const availableTickets = await adminDb.collection('tickets')
  .where('event_id', 'in', organizerEventIds)
  .where('status', '==', 'valid')
  .where('includedInPayout', '==', null)  // Not yet paid out
  .get()

// Pending balance (event not ended yet)
const pendingTickets = await adminDb.collection('tickets')
  .where('event_id', 'in', upcomingEventIds)
  .where('status', '==', 'valid')
  .get()

// Payout history
const payouts = await adminDb
  .collection('organizers').doc(organizerId)
  .collection('payouts')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get()
```

### Admin Payout Queue Query
```typescript
// All pending payouts across all organizers
const pendingPayouts = await adminDb
  .collectionGroup('payouts')  // ✅ Cross-organizer query
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'asc')
  .get()
```

**Index Required:** `collectionGroup(payouts) + status + createdAt`

---

## Security Model

### Firestore Rules
```javascript
match /organizers/{organizerId}/payoutConfig/{configId} {
  allow read: if request.auth.uid == organizerId || isAdmin();
  allow write: if request.auth.uid == organizerId;
}

match /organizers/{organizerId}/payouts/{payoutId} {
  allow read: if request.auth.uid == organizerId || isAdmin();
  allow create: if request.auth.uid == organizerId 
                && request.resource.data.status == 'pending'
                && request.resource.data.requestedBy == organizerId;
  // Only admins can approve/decline/mark paid
  allow update: if isAdmin();
  allow delete: if false;  // Never delete payout records
}

function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### Server-Side Checks
```typescript
// Every payout API endpoint:
1. Verify Firebase Auth token
2. Check user role (organizer vs admin)
3. Validate payout belongs to requesting organizer (for organizer endpoints)
4. Use adminDb for all writes (never trust client)
```

---

## Performance Optimizations

### Indexes Needed
```json
{
  "collectionGroup": "payouts",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### Pagination
- Organizer payout history: Limit 20, use startAfter cursor
- Admin payout queue: Limit 50, use startAfter cursor
- Never load all tickets into memory (use aggregation queries)

### Caching
- Cache organizer balance for 5 minutes (recompute on payout request)
- Cache event → organizer mapping (static after event creation)

---

## Minimal Extension Summary

**Collections Added:** ❌ None  
**Collections Reused:** ✅ tickets, events, users, organizers/{}/payoutConfig, organizers/{}/payouts  
**Fields Added:** ✅ 8 fields to existing `payouts` documents (requestedBy, approvedBy, ticketIds, etc.)  
**New Indexes:** ✅ 1 (collectionGroup payouts by status)  

**Justification for Extensions:**
- `ticketIds[]`: Required to prevent double-counting (idempotency)
- `approvedBy/approvedAt`: Required for admin audit trail
- `paymentReferenceId`: Required for manual payment confirmation
- All other fields support the minimal viable payout workflow

---

## Next Steps
1. ✅ Schema documented
2. ⏳ Update `/lib/firestore/payout.ts` with balance calculation
3. ⏳ Build organizer payout dashboard UI
4. ⏳ Build admin payout queue UI
5. ⏳ Add Firestore rules & indexes
6. ⏳ Test idempotency guarantees
