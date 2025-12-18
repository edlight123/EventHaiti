import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { withdrawFromEarnings } from '@/lib/earnings'
import type { WithdrawalRequest } from '@/types/earnings'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { eventId, amount, bankDetails } = body

    // Validate inputs
    if (!eventId || !amount || !bankDetails) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, amount, bankDetails' },
        { status: 400 }
      )
    }

    if (!bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.accountHolder) {
      return NextResponse.json(
        { error: 'Incomplete bank details' },
        { status: 400 }
      )
    }

    // Minimum withdrawal amount
    if (amount < 50) {
      return NextResponse.json(
        { error: 'Minimum withdrawal amount is $50.00' },
        { status: 400 }
      )
    }

    // Verify event ownership
    const eventDoc = await adminDb.collection('events').doc(eventId).get()
    if (!eventDoc.exists) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const eventData = eventDoc.data()
    if (eventData?.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this event' }, { status: 403 })
    }

    // Verify earnings and settlement status
    const earningsDoc = await adminDb
      .collection('event_earnings')
      .doc(eventId)
      .get()

    if (!earningsDoc.exists) {
      return NextResponse.json({ error: 'No earnings found for this event' }, { status: 404 })
    }

    const earnings = earningsDoc.data()
    if (earnings?.settlementStatus !== 'ready') {
      return NextResponse.json(
        { error: 'Earnings are not yet available for withdrawal' },
        { status: 400 }
      )
    }

    const availableBalance = (earnings.netEarnings || 0) - (earnings.withdrawn || 0)
    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: $${availableBalance.toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create withdrawal request
    const withdrawalRequest: WithdrawalRequest = {
      organizerId: user.id,
      eventId,
      amount,
      method: 'bank',
      status: 'pending',
      bankDetails: {
        accountNumber: bankDetails.accountNumber,
        bankName: bankDetails.bankName,
        accountHolder: bankDetails.accountHolder,
        swiftCode: bankDetails.swiftCode,
        routingNumber: bankDetails.routingNumber
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const withdrawalRef = await adminDb
      .collection('withdrawal_requests')
      .add(withdrawalRequest)

    // Update earnings record (convert dollars to cents)
    await withdrawFromEarnings(eventId, amount * 100, withdrawalRef.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRef.id,
      message: 'Bank transfer withdrawal request submitted successfully'
    })
  } catch (err: any) {
    console.error('Bank withdrawal error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
