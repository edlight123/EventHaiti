import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { withdrawFromEarnings } from '@/lib/earnings'
import { moncashPrefundedTransfer } from '@/lib/moncash'
import type { WithdrawalRequest } from '@/types/earnings'

const PREFUNDING_FEE_PERCENT = 0.03

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const organizerPayoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('payoutConfig')
      .doc('main')
      .get()
    const organizerPayoutConfig = organizerPayoutConfigDoc.exists ? (organizerPayoutConfigDoc.data() as any) : null
    const accountLocation = String(organizerPayoutConfig?.accountLocation || organizerPayoutConfig?.bankDetails?.accountLocation || '').toLowerCase()
    const payoutProvider = String(organizerPayoutConfig?.payoutProvider || '').toLowerCase()
    const isStripeConnect = payoutProvider === 'stripe_connect' || accountLocation === 'united_states' || accountLocation === 'canada'
    if (isStripeConnect) {
      return NextResponse.json(
        {
          error: 'Stripe Connect required',
          message: 'US/Canada accounts must withdraw via Stripe Connect. MonCash withdrawals are only available for Haiti accounts.',
        },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { eventId, amount, moncashNumber } = body

    // Validate inputs
    if (!eventId || !amount || !moncashNumber) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, amount, moncashNumber' },
        { status: 400 }
      )
    }

    // Minimum withdrawal amount (in cents)
    if (amount < 5000) {
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
    const earningsSnapshot = await adminDb
      .collection('event_earnings')
      .where('eventId', '==', eventId)
      .limit(1)
      .get()

    if (earningsSnapshot.empty) {
      return NextResponse.json({ error: 'No earnings found for this event' }, { status: 404 })
    }

    const earnings = earningsSnapshot.docs[0].data()
    if (earnings?.settlementStatus !== 'ready') {
      return NextResponse.json(
        { error: 'Earnings are not yet available for withdrawal' },
        { status: 400 }
      )
    }

    // Amount comes in cents, availableToWithdraw is also in cents
    const availableBalance = earnings.availableToWithdraw || 0
    if (amount > availableBalance) {
      return NextResponse.json(
        { error: `Insufficient balance. Available: ${(availableBalance / 100).toFixed(2)} ${earnings.currency || 'HTG'}` },
        { status: 400 }
      )
    }

    const currency = (String(earnings.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG') as 'HTG' | 'USD'

    // Check if instant MonCash (prefunding) is available and allowed.
    const [platformConfigDoc, payoutConfigDoc] = await Promise.all([
      adminDb.collection('config').doc('payouts').get(),
      adminDb.collection('organizers').doc(user.id).collection('payoutConfig').doc('main').get(),
    ])

    const prefunding = platformConfigDoc.exists ? (platformConfigDoc.data() as any)?.prefunding : null
    const prefundingEnabled = Boolean(prefunding?.enabled)
    const prefundingAvailable = Boolean(prefunding?.available)

    const payoutConfig = payoutConfigDoc.exists ? (payoutConfigDoc.data() as any) : null
    const allowInstantMoncash = Boolean(payoutConfig?.allowInstantMoncash)

    const shouldUsePrefunding = prefundingEnabled && prefundingAvailable && allowInstantMoncash

    // Prefunding only makes sense for HTG transfers.
    if (shouldUsePrefunding && currency !== 'HTG') {
      return NextResponse.json(
        { error: 'Instant MonCash is only available for HTG withdrawals' },
        { status: 400 }
      )
    }

    const feeCents = shouldUsePrefunding ? Math.max(0, Math.round(Number(amount) * PREFUNDING_FEE_PERCENT)) : 0
    const payoutAmountCents = Math.max(0, Number(amount) - feeCents)

    // Create withdrawal request first.
    const withdrawalRef = adminDb.collection('withdrawal_requests').doc()

    const baseWithdrawalRequest: WithdrawalRequest = {
      organizerId: user.id,
      eventId,
      amount,
      currency,
      method: 'moncash',
      status: shouldUsePrefunding ? 'processing' : 'pending',
      moncashNumber,
      feeCents: feeCents || undefined,
      payoutAmountCents: payoutAmountCents || undefined,
      prefundingUsed: shouldUsePrefunding || undefined,
      prefundingFeePercent: shouldUsePrefunding ? PREFUNDING_FEE_PERCENT : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await withdrawalRef.set(baseWithdrawalRequest)

    if (shouldUsePrefunding) {
      try {
        const payoutAmount = Number((payoutAmountCents / 100).toFixed(2))
        const result = await moncashPrefundedTransfer({
          amount: payoutAmount,
          receiver: String(moncashNumber),
          desc: `EventHaiti instant withdrawal (${eventId})`,
          reference: withdrawalRef.id,
        })

        await withdrawalRef.set(
          {
            status: 'completed',
            completedAt: new Date(),
            processedAt: new Date(),
            moncashTransactionId: result.transactionId,
            updatedAt: new Date(),
          },
          { merge: true }
        )

        // Deduct gross amount from earnings after successful transfer.
        await withdrawFromEarnings(eventId, amount, withdrawalRef.id)

        return NextResponse.json({
          success: true,
          withdrawalId: withdrawalRef.id,
          instant: true,
          feeCents,
          payoutAmountCents,
          message: 'Instant MonCash withdrawal completed successfully'
        })
      } catch (e: any) {
        await withdrawalRef.set(
          {
            status: 'failed',
            failureReason: e?.message || String(e),
            updatedAt: new Date(),
          },
          { merge: true }
        )

        return NextResponse.json(
          { error: 'Instant MonCash transfer failed', message: e?.message || String(e) },
          { status: 502 }
        )
      }
    }

    // Standard (manual) MonCash request.
    await withdrawFromEarnings(eventId, amount, withdrawalRef.id)

    return NextResponse.json({
      success: true,
      withdrawalId: withdrawalRef.id,
      instant: false,
      message: 'MonCash withdrawal request submitted successfully'
    })
  } catch (err: any) {
    console.error('MonCash withdrawal error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to process withdrawal' },
      { status: 500 }
    )
  }
}
