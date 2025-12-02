import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerBalance, getAvailableTicketsForPayout } from '@/lib/firestore/payout'

const MINIMUM_PAYOUT = 5000 // $50.00 in cents

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const organizerId = decodedClaims.uid

    // IDEMPOTENCY CHECK 1: Verify no pending/processing payout exists
    const existingPayoutsSnapshot = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .where('status', 'in', ['pending', 'processing'])
      .get()

    if (!existingPayoutsSnapshot.empty) {
      const existingPayout = existingPayoutsSnapshot.docs[0].data()
      return NextResponse.json(
        { 
          error: 'Payout already in progress',
          message: `You have a ${existingPayout.status} payout request for ${(existingPayout.amount / 100).toFixed(2)} ${existingPayout.currency || 'HTG'}. Please wait for it to be processed.`,
          existingPayoutId: existingPayoutsSnapshot.docs[0].id
        },
        { status: 400 }
      )
    }

    // Get current balance and available tickets
    const balance = await getOrganizerBalance(organizerId)
    const { tickets, totalAmount, periodStart, periodEnd } = await getAvailableTicketsForPayout(organizerId)

    // Validate minimum payout amount
    if (balance.available < MINIMUM_PAYOUT) {
      return NextResponse.json(
        { 
          error: 'Insufficient balance',
          message: `Minimum payout amount is $50.00. Current available balance: $${(balance.available / 100).toFixed(2)}`
        },
        { status: 400 }
      )
    }

    // Validate we have tickets (double-check against balance calculation)
    if (tickets.length === 0 || totalAmount === 0) {
      return NextResponse.json(
        { error: 'No available earnings to withdraw' },
        { status: 400 }
      )
    }

    // Get payout config
    const configDoc = await adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payoutConfig')
      .doc('main')
      .get()

    if (!configDoc.exists) {
      return NextResponse.json(
        { error: 'Payout method not configured' },
        { status: 400 }
      )
    }

    const config = configDoc.data()!

    if (config.status !== 'active') {
      return NextResponse.json(
        { 
          error: 'Payout account not active',
          message: 'Please complete verification before requesting a payout'
        },
        { status: 400 }
      )
    }

    // Calculate next Friday at 5:00 PM (batched payout schedule)
    const now = new Date()
    const nextFriday = new Date(now)
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    nextFriday.setDate(now.getDate() + daysUntilFriday)
    nextFriday.setHours(17, 0, 0, 0)

    // IDEMPOTENCY SAFEGUARD: Store ticket IDs to prevent double-counting
    const ticketIds = tickets.map(t => t.id)

    // Create payout request with complete tracking
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc()

    const payout = {
      organizerId,
      amount: totalAmount,
      status: 'pending',
      method: config.method,
      scheduledDate: nextFriday.toISOString(),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      
      // NEW: Idempotency & tracking fields
      requestedBy: organizerId,
      ticketIds,              // ✅ Prevents double-counting
      periodStart,
      periodEnd,
      currency: balance.currency,
    }

    await payoutRef.set(payout)

    return NextResponse.json({
      success: true,
      payout: {
        id: payoutRef.id,
        ...payout,
        ticketCount: tickets.length,
      },
    })
  } catch (error: any) {
    console.error('Error requesting payout:', error)
    return NextResponse.json(
      { error: 'Failed to request payout', message: error.message },
      { status: 500 }
    )
  }
}
