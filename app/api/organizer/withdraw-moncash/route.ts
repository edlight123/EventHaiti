import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { getEventEarnings, withdrawFromEarnings } from '@/lib/earnings'
import { moncashPrefundedTransfer } from '@/lib/moncash'
import type { WithdrawalRequest } from '@/types/earnings'
import { getPayoutProfile } from '@/lib/firestore/payout-profiles'

const PREFUNDING_FEE_PERCENT = 0.03

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const haitiProfile = await getPayoutProfile(user.id, 'haiti')
    if (!haitiProfile) {
      return NextResponse.json(
        {
          error: 'Haiti payout profile required',
          message: 'MonCash withdrawals are only available for organizers with a Haiti payout profile.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.status !== 'active') {
      return NextResponse.json(
        {
          error: 'Payout profile not active',
          message: 'Please complete payout verification before requesting MonCash withdrawals.',
        },
        { status: 400 }
      )
    }

    if (haitiProfile.method !== 'mobile_money') {
      return NextResponse.json(
        {
          error: 'Mobile money not configured',
          message: 'Please configure Haiti payout method as Mobile money to withdraw via MonCash.',
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

    // Verify earnings and settlement status (normalized against event end time)
    const earnings = await getEventEarnings(String(eventId))
    if (!earnings) {
      return NextResponse.json({ error: 'No earnings found for this event' }, { status: 404 })
    }

    if (earnings.settlementStatus !== 'ready') {
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
    const [platformConfigDoc] = await Promise.all([
      adminDb.collection('config').doc('payouts').get(),
    ])

    const prefunding = platformConfigDoc.exists ? (platformConfigDoc.data() as any)?.prefunding : null
    const prefundingEnabled = Boolean(prefunding?.enabled)
    const prefundingAvailable = Boolean(prefunding?.available)

    const allowInstantMoncash = Boolean(haitiProfile?.allowInstantMoncash)

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
