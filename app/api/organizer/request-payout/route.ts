import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'
import { getOrganizerBalance } from '@/lib/firestore/payout'

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

    // Get current balance
    const balance = await getOrganizerBalance(organizerId)

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

    // Calculate next Friday at 5:00 PM
    const now = new Date()
    const nextFriday = new Date(now)
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    nextFriday.setDate(now.getDate() + daysUntilFriday)
    nextFriday.setHours(17, 0, 0, 0)

    // Create payout request
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc()

    const payout = {
      organizerId,
      amount: balance.available,
      status: 'pending',
      method: config.method,
      scheduledDate: nextFriday.toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    await payoutRef.set(payout)

    return NextResponse.json({
      success: true,
      payout: {
        id: payoutRef.id,
        ...payout,
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
