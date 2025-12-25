# Payment & Payout System - Implementation Summary

## 📦 What Has Been Delivered

### 1. Complete Documentation
✅ **`docs/PAYMENT_PAYOUT_IMPLEMENTATION_GUIDE.md`**
- Full end-to-end payment flow architecture
- Data model design for Firebase Firestore
- Complete implementation examples for all major features
- API route templates with full code
- UI component templates for all pages
- Haiti-specific and US/CA-specific flows

### 2. TypeScript Type Definitions
✅ **`types/orders.ts`**
- Order management types
- Order items, status tracking
- Payment intent integration types

✅ **`types/earnings.ts`**
- Event earnings tracking
- Settlement status types
- Payout event links
- Fee configuration constants
- Earnings summary types

### 3. Core Business Logic Libraries
✅ **`lib/fees.ts`**
- Platform fee calculation (10% configurable)
- Stripe processing fee calculation
- Fee breakdown utilities
- Currency formatting
- Settlement date calculations
- Minimum payout validation

✅ **`lib/earnings.ts`**
- Event earnings CRUD operations
- Automatic earnings updates from ticket sales
- Withdrawal processing
- Refund handling
- Settlement status management
- Organizer balance calculations

## 🏗️ Architecture Overview

### Data Flow

```
Customer Purchase → Stripe Payment → Webhook Processing
                                           ↓
                                    Create Tickets
                                           ↓
                                    Update EventEarnings
                                           ↓
                                    Calculate Fees (10% platform + 2.9%+$0.30 Stripe)
                                           ↓
                                    Track Available Balance
                                           ↓
Organizer Dashboard ← View Earnings ← Settlement Logic (7 days post-event)
       ↓
Request Withdrawal → Admin Approval → Process Payout
       ↓
MonCash/Bank (Haiti) OR Stripe Connect (US/CA)
```

### Key Collections

#### New Collections to Create:

1. **`orders`** - Customer checkout sessions
   - Tracks cart before payment
   - Links to Stripe Payment Intent
   - Stores buyer information

2. **`event_earnings`** - Organizer revenue per event
   - Aggregates all ticket sales
   - Tracks fees (platform + processing)
   - Manages withdrawal status
   - Settlement logic (pending → ready → locked)

3. **`organizers/{id}/payouts/{id}/event_links`** - Payout breakdown
   - Links payouts to specific events
   - Prevents double-withdrawals
   - Provides audit trail

#### Existing Collections (Reused):

- ✅ `tickets` - Already tracks purchases with payment_id
- ✅ `events` - Links tickets to organizers
- ✅ `organizers/{id}/payoutProfiles/{haiti|stripe_connect}` - Payout profiles (primary)
- ✅ `organizers/{id}/payoutConfig/main` - Legacy payout settings (backward compatibility)
- ✅ `organizers/{id}/payouts` - Existing payout history

## 💡 How to Use the Existing Backend

### Your Current System Already Has:

1. **Stripe Payment Integration** ✅
   - `app/api/create-payment-intent/route.ts` - Creates payment intents
   - `app/api/webhooks/stripe/route.ts` - Handles payment success
   - Stripe fee calculation already present

2. **Ticket Generation** ✅
   - Webhook automatically creates tickets after payment
   - QR codes generated
   - Email notifications sent

3. **Payout Infrastructure** ✅
   - `lib/firestore/payout.ts` - Payout config management
   - `app/api/organizer/request-payout/route.ts` - Payout requests
   - Admin approval workflow
   - Receipt upload system

### What Needs to Be Added:

#### Phase 1: Orders & Checkout UI (Priority 1)

**Files to Create:**

1. `app/api/orders/create/route.ts` - Create order from cart
2. `app/api/orders/create-payment-intent/route.ts` - Link order to Stripe
3. `app/checkout/[orderId]/page.tsx` - Checkout page (server)
4. `app/checkout/[orderId]/CheckoutForm.tsx` - Stripe Elements (client)
5. `app/checkout/success/page.tsx` - Success page

**Integration Point:**
- Modify `app/api/webhooks/stripe/route.ts` to:
  - Update order status to 'paid'
  - Call `addTicketToEarnings()` from `lib/earnings.ts`

#### Phase 2: Earnings Dashboard (Priority 2)

**Files to Create:**

1. `app/api/organizer/earnings/route.ts` - Fetch earnings summary
2. `app/organizer/earnings/page.tsx` - Earnings list page (server)
3. `app/organizer/earnings/EarningsDashboard.tsx` - Earnings table (client)
4. `app/organizer/events/[id]/earnings/page.tsx` - Per-event earnings (server)
5. `app/organizer/events/[id]/earnings/EventEarningsDetail.tsx` - Event detail (client)
6. `app/organizer/events/[id]/earnings/WithdrawModal.tsx` - Withdrawal UI (client)

#### Phase 3: Enhanced Payout Settings (Priority 3)

**Files to Enhance:**

1. `app/organizer/settings/payouts/page.tsx` - Add account location selector
2. Create `app/organizer/settings/payouts/PayoutSettingsClient.tsx` - Client logic
3. Create `app/organizer/settings/payouts/HaitiPayoutForm.tsx` - MonCash/Bank form
4. Create `app/organizer/settings/payouts/StripeConnectCard.tsx` - Stripe Connect UI
5. Create `app/organizer/settings/payouts/KYCChecklist.tsx` - Verification status

#### Phase 4: Withdrawal APIs (Priority 4)

**Files to Create:**

1. `app/api/organizer/withdraw-moncash/route.ts` - MonCash withdrawal
2. `app/api/organizer/withdraw-bank/route.ts` - Bank withdrawal
3. `app/api/organizer/stripe-connect/route.ts` - Stripe Connect onboarding

**Integration:**
- Use existing `lib/earnings.ts` functions:
  - `withdrawFromEarnings()` - Deduct from available balance
  - `getTotalAvailableBalance()` - Check balance before withdrawal

#### Phase 5: Cron Jobs (Priority 5)

**File to Create:**
- `app/api/cron/update-settlements/route.ts` - Daily job to update settlement status

**Logic:**
```typescript
// Run daily
// For each event with settlement_status = 'pending'
// Check if 7 days have passed since event.end_datetime
// If yes, call updateSettlementStatus(eventId)
```

## 🔧 Integration Steps

### Step 1: Enhance Existing Webhook

**File:** `app/api/webhooks/stripe/route.ts`

Add after creating tickets:

```typescript
import { addTicketToEarnings } from '@/lib/earnings'

// After creating tickets in webhook:
const totalAmount = session.amount_total // Already in cents
await addTicketToEarnings(
  session.metadata.eventId,
  totalAmount,
  quantity
)
```

### Step 2: Create Firestore Indexes

Run these in Firebase Console:

```javascript
// event_earnings collection
- organizerId ASC, settlementStatus ASC, createdAt DESC
- eventId ASC (unique)
- organizerId ASC, availableToWithdraw DESC

// orders collection
- userId ASC, createdAt DESC
- eventId ASC, status ASC, createdAt DESC
- stripePaymentIntentId ASC
- status ASC, createdAt DESC
```

### Step 3: Environment Variables

Add to `.env.local`:

```bash
# Already have these:
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Add these:
STRIPE_CONNECT_CLIENT_ID=ca_...  # For US/CA payouts
MONCASH_API_KEY=...              # For Haiti MonCash
MONCASH_SECRET=...
```

### Step 4: Add to Existing Dashboard

Update `app/organizer/page.tsx` to add link:

```tsx
<Link href="/organizer/earnings" className="...">
  View Earnings & Payouts
</Link>
```

## 📊 Fee Structure

### Platform Fees
- **10%** of gross ticket sales (configurable in `types/earnings.ts`)
- **Minimum:** $0.50 per transaction

### Processing Fees (Stripe)
- **2.9% + $0.30** per transaction
- Deducted from organizer's net amount

### Example Calculation
```
Ticket Price: $50.00 (5000 cents)
Quantity: 2
---------------------------------
Gross Sales:        $100.00
Platform Fee (10%): -$10.00
Processing Fee:     -$3.20  (2.9% + $0.30)
---------------------------------
Net to Organizer:   $86.80
```

### Settlement Logic
- Tickets sold → Funds marked as **"pending"**
- Event ends → Wait **7 days** (refund window)
- After 7 days → Funds become **"ready"** for withdrawal
- Withdrawal requested → Status changes to **"locked"**

## 🌍 Multi-Region Support

### Haiti (HT)
- **Payout Methods:**
  - MonCash (instant, higher fees)
  - Bank Transfer (1-3 days, lower fees)
- **Currency:** HTG or USD
- **KYC:** Government ID + phone verification

### United States & Canada (US/CA)
- **Payout Method:** Stripe Connect only
- **Currency:** USD
- **KYC:** Handled by Stripe (SSN, business info, bank account)
- **Settlement:** Automatic via Stripe (configurable schedule)

## 🎯 Next Implementation Steps

### Week 1: Orders & Checkout
1. Create Order API routes
2. Build checkout page with Stripe Elements
3. Test payment flow end-to-end
4. Enhance webhook to call earnings library

### Week 2: Earnings Dashboard
1. Create earnings API routes
2. Build earnings list page
3. Build event-specific earnings page
4. Add withdrawal modals

### Week 3: Payout Enhancements
1. Add account location selector
2. Build Haiti-specific forms (MonCash/Bank)
3. Integrate Stripe Connect for US/CA
4. Update KYC checklist

### Week 4: Withdrawals & Automation
1. Create withdrawal API routes
2. Add MonCash API integration
3. Add bank transfer processing
4. Set up cron job for settlements

## 📚 Code References

All implementation examples are in:
**`docs/PAYMENT_PAYOUT_IMPLEMENTATION_GUIDE.md`**

This document contains:
- Complete API route code
- Full React components
- Database query examples
- Error handling
- Loading states
- Mobile-responsive UI

## 🔍 Testing Strategy

### Test Scenarios

1. **Customer Purchase Flow**
   - [ ] Add tickets to cart
   - [ ] Create order
   - [ ] Complete Stripe payment
   - [ ] Verify tickets created
   - [ ] Check earnings updated
   - [ ] Confirm email sent

2. **Organizer Earnings**
   - [ ] View earnings dashboard
   - [ ] Check fee calculations
   - [ ] Verify settlement status
   - [ ] Test withdrawal (when ready)

3. **Payout Configuration**
   - [ ] Set account location (Haiti)
   - [ ] Add MonCash phone
   - [ ] Add bank details
   - [ ] Complete verification

4. **Withdrawal Process**
   - [ ] Request withdrawal
   - [ ] Admin approval
   - [ ] Payment processing
   - [ ] Receipt upload
   - [ ] Balance updated

### Use Stripe Test Mode

```
Test Card: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits
ZIP: Any 5 digits
```

## 🚀 Deployment Checklist

Before going live:

- [ ] All Firestore indexes created
- [ ] Environment variables set
- [ ] Stripe webhook configured
- [ ] Cron job scheduled (Vercel Cron or similar)
- [ ] Fee percentages reviewed
- [ ] Minimum payout amounts reviewed
- [ ] Settlement period confirmed (7 days)
- [ ] Email templates updated
- [ ] Legal terms updated (fee disclosures)
- [ ] Admin panel access configured
- [ ] MonCash API credentials (production)
- [ ] Stripe Connect approved (for US/CA)

## 💬 Support

For questions or issues with implementation:
1. Check `docs/PAYMENT_PAYOUT_IMPLEMENTATION_GUIDE.md` for complete code
2. Review `lib/fees.ts` for fee calculation logic
3. Review `lib/earnings.ts` for earnings management
4. Check existing `lib/firestore/payout.ts` for payout infrastructure

---

**System Status:** 
- ✅ Architecture Designed
- ✅ Types Defined
- ✅ Core Libraries Implemented
- ⏳ API Routes (use templates in guide)
- ⏳ UI Components (use templates in guide)
- ⏳ External APIs (MonCash, Stripe Connect)
