import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { cookies } from 'next/headers'

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

    const { payoutId } = await request.json()

    if (!payoutId) {
      return NextResponse.json({ error: 'Payout ID required' }, { status: 400 })
    }

    // Get the payout
    const payoutRef = adminDb
      .collection('organizers')
      .doc(organizerId)
      .collection('payouts')
      .doc(payoutId)

    const payoutDoc = await payoutRef.get()

    if (!payoutDoc.exists) {
      return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
    }

    const payout = payoutDoc.data()!

    // Verify it's a failed payout
    if (payout.status !== 'failed') {
      return NextResponse.json(
        { error: 'Only failed payouts can be retried' },
        { status: 400 }
      )
    }

    // Verify ownership
    if (payout.organizerId !== organizerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Calculate next Friday at 5:00 PM
    const now = new Date()
    const nextFriday = new Date(now)
    const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7
    nextFriday.setDate(now.getDate() + daysUntilFriday)
    nextFriday.setHours(17, 0, 0, 0)

    // Update payout to retry
    await payoutRef.update({
      status: 'pending',
      scheduledDate: nextFriday.toISOString(),
      failureReason: null,
      updatedAt: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      message: 'Payout scheduled for retry',
      scheduledDate: nextFriday.toISOString(),
    })
  } catch (error: any) {
    console.error('Error retrying payout:', error)
    return NextResponse.json(
      { error: 'Failed to retry payout', message: error.message },
      { status: 500 }
    )
  }
}
