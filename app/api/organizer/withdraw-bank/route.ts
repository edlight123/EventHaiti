import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { withdrawFromEarnings } from '@/lib/earnings'
import {
  addSecondaryBankDestination,
  getDecryptedBankDestination,
  type BankDestinationDetails,
} from '@/lib/firestore/payout-destinations'
import {
  consumePayoutDetailsChangeVerification,
  requireRecentPayoutDetailsChangeVerification,
} from '@/lib/firestore/payout'
import type { WithdrawalRequest } from '@/types/earnings'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payoutConfigDoc = await adminDb
      .collection('organizers')
      .doc(user.id)
      .collection('payoutConfig')
      .doc('main')
      .get()
    const payoutConfig = payoutConfigDoc.exists ? (payoutConfigDoc.data() as any) : null
    const accountLocation = String(payoutConfig?.accountLocation || payoutConfig?.bankDetails?.accountLocation || '').toLowerCase()
    const payoutProvider = String(payoutConfig?.payoutProvider || '').toLowerCase()
    const isStripeConnect = payoutProvider === 'stripe_connect' || accountLocation === 'united_states' || accountLocation === 'canada'
    if (isStripeConnect) {
      return NextResponse.json(
        {
          error: 'Stripe Connect required',
          message: 'US/Canada accounts must withdraw via Stripe Connect. Bank withdrawals are not available in EventHaiti for Stripe Connect accounts.',
        },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { eventId, amount, bankDetails, bankDestinationId, saveDestination } = body

    // Validate inputs
    if (!eventId || !amount || (!bankDestinationId && !bankDetails)) {
      return NextResponse.json(
        { error: 'Missing required fields: eventId, amount, bankDetails or bankDestinationId' },
        { status: 400 }
      )
    }

    let resolvedBankDetails: BankDestinationDetails | null = null
    let resolvedDestinationId: string | null = null

    if (bankDestinationId) {
      resolvedDestinationId = String(bankDestinationId)
      resolvedBankDetails = await getDecryptedBankDestination({
        organizerId: user.id,
        destinationId: resolvedDestinationId,
      })

      if (!resolvedBankDetails) {
        return NextResponse.json({ error: 'Bank destination not found' }, { status: 404 })
      }
    } else {
      resolvedBankDetails = bankDetails as BankDestinationDetails

      if (!resolvedBankDetails?.accountNumber || !resolvedBankDetails?.bankName || !resolvedBankDetails?.accountHolder) {
        return NextResponse.json({ error: 'Incomplete bank details' }, { status: 400 })
      }

      // Using a new bank account requires OTP step-up.
      try {
        await requireRecentPayoutDetailsChangeVerification(user.id)
      } catch (e: any) {
        const message = String(e?.message || '')
        if (message.includes('PAYOUT_CHANGE_VERIFICATION_REQUIRED')) {
          return NextResponse.json(
            {
              error: 'Verification required',
              code: 'PAYOUT_CHANGE_VERIFICATION_REQUIRED',
              requiresVerification: true,
              message:
                'For your security, confirm this new bank account with the code we email you before using it for withdrawals.',
            },
            { status: 403 }
          )
        }
        throw e
      }

      // Optionally save as a second account.
      if (saveDestination) {
        const created = await addSecondaryBankDestination({ organizerId: user.id, bankDetails: resolvedBankDetails })
        resolvedDestinationId = created.id
      }

      await consumePayoutDetailsChangeVerification(user.id)
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

    // Create withdrawal request
    const currency = (String(earnings.currency || 'HTG').toUpperCase() === 'USD' ? 'USD' : 'HTG') as 'HTG' | 'USD'

    const accountNumber = String(resolvedBankDetails.accountNumber)
    const maskedAccountNumber = accountNumber.length > 4 ? `****${accountNumber.slice(-4)}` : accountNumber

    const withdrawalRequest: WithdrawalRequest = {
      organizerId: user.id,
      eventId,
      amount,
      currency,
      method: 'bank',
      status: 'pending',
      bankDetails: {
        // Avoid storing full bank account number when it is saved as a destination.
        accountNumber: resolvedDestinationId ? maskedAccountNumber : accountNumber,
        bankName: String(resolvedBankDetails.bankName),
        accountHolder: String(resolvedBankDetails.accountHolder),
        swiftCode: resolvedBankDetails.swiftCode,
        routingNumber: resolvedBankDetails.routingNumber,
      },
      bankDestinationId: resolvedDestinationId || undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const withdrawalRef = await adminDb
      .collection('withdrawal_requests')
      .add(withdrawalRequest)

    // Update earnings record (amount is already in cents)
    await withdrawFromEarnings(eventId, amount, withdrawalRef.id)

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
