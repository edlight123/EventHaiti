# Quick Start: Implementing Payment & Payout System

This guide helps you get the payment and payout system running quickly by prioritizing the most critical features.

## 🎯 MVP Implementation (Core Features Only)

Focus on these 3 critical flows first:

### 1. Customer Checkout (1-2 days)
### 2. Earnings Tracking (1 day)
### 3. Withdrawal UI (1 day)

---

## Step 1: Enable Earnings Tracking (30 minutes)

### A. Enhance the Stripe Webhook

**File:** `app/api/webhooks/stripe/route.ts`

Find the section where tickets are created (around line 80) and add:

```typescript
import { addTicketToEarnings } from '@/lib/earnings'

// After ticket creation loop, add:
try {
  await addTicketToEarnings(
    session.metadata.eventId,
    session.amount_total, // Already in cents
    quantity
  )
  console.log('✅ Updated earnings for event:', session.metadata.eventId)
} catch (error) {
  console.error('❌ Failed to update earnings:', error)
  // Don't fail the webhook - log for manual reconciliation
}
```

### B. Create Firestore Index

In Firebase Console → Firestore → Indexes:

```
Collection: event_earnings
Fields:
  - organizerId: Ascending
  - settlementStatus: Ascending
  - createdAt: Descending
```

### C. Test It

1. Make a test purchase through Stripe
2. Check Firestore for new `event_earnings` document
3. Verify amounts calculated correctly

---

## Step 2: Create Earnings Dashboard (2-3 hours)

### A. Create API Route

**File:** `app/api/organizer/earnings/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerEarningsSummary } from '@/lib/earnings'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    const summary = await getOrganizerEarningsSummary(organizerId)

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Error fetching earnings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch earnings' },
      { status: 500 }
    )
  }
}
```

### B. Create Simple Dashboard Page

**File:** `app/organizer/earnings/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { adminAuth } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerEarningsSummary } from '@/lib/earnings'
import EarningsView from './EarningsView'

export default async function EarningsPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get('session')?.value

  if (!sessionCookie) {
    redirect('/auth/login')
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const summary = await getOrganizerEarningsSummary(decodedClaims.uid)

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <h1 className="text-3xl font-bold mb-8">Earnings</h1>
          <EarningsView summary={summary} />
        </div>
      </div>
    )
  } catch (error) {
    redirect('/auth/login')
  }
}
```

### C. Create Simple Client Component

**File:** `app/organizer/earnings/EarningsView.tsx`

```typescript
'use client'

import type { EarningsSummary } from '@/types/earnings'

export default function EarningsView({ summary }: { summary: EarningsSummary }) {
  const formatCurrency = (cents: number) => {
    const amount = (cents / 100).toFixed(2)
    return summary.currency === 'HTG' ? `HTG ${amount}` : `$${amount}`
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Total Earnings</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(summary.totalGrossSales)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Net Amount</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(summary.totalNetAmount)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="text-sm text-gray-600">Available</div>
          <div className="text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(summary.totalAvailableToWithdraw)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600">Withdrawn</div>
          <div className="text-2xl font-bold mt-2">
            {formatCurrency(summary.totalWithdrawn)}
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Event
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Gross Sales
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Net Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Available
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {summary.events.map((event) => (
              <tr key={event.eventId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-medium">{event.eventTitle}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(event.eventDate).toLocaleDateString()}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(event.grossSales)}
                </td>
                <td className="px-6 py-4 text-right">
                  {formatCurrency(event.netAmount)}
                </td>
                <td className="px-6 py-4 text-right text-green-600 font-semibold">
                  {formatCurrency(event.availableToWithdraw)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    event.settlementStatus === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : event.settlementStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {event.settlementStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

### D. Add Link to Organizer Dashboard

**File:** `app/organizer/page.tsx`

Add this card somewhere in the dashboard grid:

```tsx
<Link
  href="/organizer/earnings"
  className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition"
>
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold">Earnings & Payouts</h3>
    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  </div>
  <p className="text-sm text-gray-600">
    View your event earnings and request withdrawals
  </p>
</Link>
```

---

## Step 3: Enhanced Payout Request (1 hour)

The system already has payout requests at `/api/organizer/request-payout`, but let's enhance it to work with the new earnings system.

### Update Existing Payout Request

**File:** `app/api/organizer/request-payout/route.ts`

Replace the balance calculation section with:

```typescript
import { getTotalAvailableBalance, getWithdrawableEvents, withdrawFromEarnings } from '@/lib/earnings'

// Replace the existing getOrganizerBalance call with:
const { available, pending, currency } = await getTotalAvailableBalance(organizerId)

// ... existing validation code ...

// Before creating payout, get withdrawable events:
const withdrawableEvents = await getWithdrawableEvents(organizerId)

if (withdrawableEvents.length === 0) {
  return NextResponse.json(
    { error: 'No events with available funds' },
    { status: 400 }
  )
}

// Calculate total amount (all available)
const totalAmount = withdrawableEvents.reduce(
  (sum, e) => sum + e.availableToWithdraw,
  0
)

// Create payout (existing code continues...)

// IMPORTANT: After creating payout, mark events as withdrawn:
const payoutRef = adminDb
  .collection('organizers')
  .doc(organizerId)
  .collection('payouts')
  .doc()

for (const event of withdrawableEvents) {
  await withdrawFromEarnings(
    event.eventId,
    event.availableToWithdraw,
    payoutRef.id
  )
  
  // Create event link
  await payoutRef.collection('event_links').add({
    eventId: event.eventId,
    eventTitle: '', // Fetch from events collection
    amount: event.availableToWithdraw,
    currency: event.currency,
    ticketIds: [], // Can be populated if needed
    createdAt: new Date().toISOString(),
  })
}
```

---

## Step 4: Test the Complete Flow (30 minutes)

### Test Checklist

1. **Make a Test Purchase**
   ```
   - Go to any event
   - Click "Buy Tickets"
   - Complete payment with test card 4242 4242 4242 4242
   ```

2. **Verify Earnings Created**
   ```
   - Check Firebase Console
   - Look for new document in event_earnings collection
   - Verify grossSales, platformFee, processingFees, netAmount
   ```

3. **View Earnings Dashboard**
   ```
   - Go to /organizer/earnings
   - Should see the event listed
   - Verify all amounts match
   - Status should be 'pending' (changes to 'ready' after 7 days)
   ```

4. **Test Withdrawal (Manual)**
   ```
   - Manually update settlementStatus to 'ready' in Firebase
   - Go to existing /organizer/payouts page
   - Click "Request Payout"
   - Should show available balance
   ```

---

## Optional Enhancements (Later)

Once the core is working, add these:

### 1. Settlement Status Cron Job

**File:** `app/api/cron/update-settlements/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase/admin'
import { updateSettlementStatus } from '@/lib/earnings'

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all pending earnings
    const snapshot = await adminDb
      .collection('event_earnings')
      .where('settlementStatus', '==', 'pending')
      .get()

    let updated = 0

    for (const doc of snapshot.docs) {
      const result = await updateSettlementStatus(doc.id)
      if (result === 'ready') {
        updated++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} events to ready status`,
    })
  } catch (error: any) {
    console.error('Cron error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

Add to `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/cron/update-settlements",
    "schedule": "0 6 * * *"
  }]
}
```

### 2. Per-Event Earnings Page

Create `/organizer/events/[id]/earnings` to show detailed earnings for a single event with withdrawal button (see full implementation guide for code).

### 3. Fee Transparency

Add fee breakdown to ticket purchase flow so customers understand the split:

```tsx
<div className="border-t pt-4 mt-4">
  <h4 className="text-sm font-medium mb-2">Fee Breakdown</h4>
  <div className="text-xs space-y-1">
    <div className="flex justify-between">
      <span>Ticket Price</span>
      <span>${ticketPrice}</span>
    </div>
    <div className="flex justify-between text-gray-500">
      <span>Platform Fee (10%)</span>
      <span>-${platformFee}</span>
    </div>
    <div className="flex justify-between text-gray-500">
      <span>Processing Fee</span>
      <span>-${processingFee}</span>
    </div>
    <div className="flex justify-between font-medium border-t pt-1">
      <span>Organizer Receives</span>
      <span className="text-green-600">${netAmount}</span>
    </div>
  </div>
</div>
```

---

## 🚨 Common Issues & Solutions

### Issue: Earnings not updating after purchase

**Solution:**
- Check webhook is receiving events (logs in Vercel/console)
- Verify `addTicketToEarnings()` is being called
- Check Firestore permissions allow writes to `event_earnings`

### Issue: Settlement status stuck on 'pending'

**Solution:**
- Manually run `updateSettlementStatus(eventId)` from Node console
- Or manually update in Firebase Console
- Or wait for cron job (if implemented)

### Issue: Withdrawal fails with "insufficient funds"

**Solution:**
- Check `settlementStatus` is 'ready' (not 'pending')
- Verify `availableToWithdraw` > 5000 cents ($50)
- Check for existing pending payout

### Issue: Fee calculations don't match

**Solution:**
- Review `FEE_CONFIG` in `types/earnings.ts`
- All amounts should be in cents (multiply by 100)
- Stripe fees: 2.9% + 30 cents
- Platform fee: 10% of gross (minimum 50 cents)

---

## 📚 Where to Find More Info

- **Complete Implementation Guide:** `docs/PAYMENT_PAYOUT_IMPLEMENTATION_GUIDE.md`
- **System Summary:** `docs/PAYMENT_SYSTEM_SUMMARY.md`
- **Type Definitions:** `types/orders.ts` and `types/earnings.ts`
- **Fee Utilities:** `lib/fees.ts`
- **Earnings Logic:** `lib/earnings.ts`
- **Existing Payout System:** `lib/firestore/payout.ts`

---

## ✅ Success Criteria

You'll know it's working when:

1. ✅ Purchases automatically create `event_earnings` records
2. ✅ Earnings dashboard shows correct amounts
3. ✅ Fee calculations match expectations (10% + 2.9%+$0.30)
4. ✅ Settlement status changes to 'ready' after 7 days
5. ✅ Withdrawals deduct from `availableToWithdraw`
6. ✅ Organizers can see clear breakdown of earnings

---

**Time Estimate:** 4-6 hours for core MVP implementation

**Next Steps:** Once core is working, implement checkout UI, per-event pages, and cron jobs from the full implementation guide.
