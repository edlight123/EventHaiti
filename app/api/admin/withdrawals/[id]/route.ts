import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { adminDb } from '@/lib/firebase/admin'

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isAdmin(user.email)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const { withdrawalId, action, note } = body

    if (!withdrawalId || !action) {
      return NextResponse.json(
        { error: 'Missing withdrawalId or action' },
        { status: 400 }
      )
    }

    if (!['approve', 'reject', 'complete', 'fail'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, reject, complete, or fail' },
        { status: 400 }
      )
    }

    const withdrawalRef = adminDb.collection('withdrawal_requests').doc(withdrawalId)
    const withdrawalDoc = await withdrawalRef.get()

    if (!withdrawalDoc.exists) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const withdrawal = withdrawalDoc.data()!
    const now = new Date()

    const normalizeAmountToCents = (raw: any): number => {
      const n = Number(raw)
      if (!Number.isFinite(n)) return 0
      if (!Number.isInteger(n)) return Math.round(n * 100)
      if (n > 0 && n < 5000) return n * 100
      return n
    }

    let updates: any = {
      updatedAt: now
    }

    switch (action) {
      case 'approve':
        if (withdrawal.status !== 'pending') {
          return NextResponse.json(
            { error: 'Can only approve pending withdrawals' },
            { status: 400 }
          )
        }
        updates.status = 'processing'
        updates.processedBy = user.id
        updates.processedAt = now
        if (note) updates.adminNote = note
        break

      case 'reject':
        if (withdrawal.status !== 'pending') {
          return NextResponse.json(
            { error: 'Can only reject pending withdrawals' },
            { status: 400 }
          )
        }
        updates.status = 'failed'
        updates.failureReason = note || 'Rejected by admin'
        updates.processedBy = user.id
        updates.processedAt = now

        // Refund the amount back to earnings
        const earningsRef = adminDb
          .collection('event_earnings')
          .where('eventId', '==', withdrawal.eventId)
          .limit(1)

        const earningsSnapshot = await earningsRef.get()
        if (!earningsSnapshot.empty) {
          const earningsDoc = earningsSnapshot.docs[0]
          const earnings = earningsDoc.data()
          
          const amountInCents = normalizeAmountToCents(withdrawal.amount)
          
          await earningsDoc.ref.update({
            availableToWithdraw: earnings.availableToWithdraw + amountInCents,
            withdrawnAmount: Math.max(0, earnings.withdrawnAmount - amountInCents),
            settlementStatus: 'ready',
            updatedAt: now.toISOString()
          })
        }
        break

      case 'complete':
        if (withdrawal.status !== 'processing') {
          return NextResponse.json(
            { error: 'Can only complete processing withdrawals' },
            { status: 400 }
          )
        }
        updates.status = 'completed'
        updates.completedAt = now
        if (note) updates.completionNote = note
        break

      case 'fail':
        if (withdrawal.status === 'completed') {
          return NextResponse.json(
            { error: 'Cannot fail a completed withdrawal' },
            { status: 400 }
          )
        }
        updates.status = 'failed'
        updates.failureReason = note || 'Processing failed'
        
        // Refund the amount back to earnings
        const earningsRef2 = adminDb
          .collection('event_earnings')
          .where('eventId', '==', withdrawal.eventId)
          .limit(1)

        const earningsSnapshot2 = await earningsRef2.get()
        if (!earningsSnapshot2.empty) {
          const earningsDoc = earningsSnapshot2.docs[0]
          const earnings = earningsDoc.data()
          
          const amountInCents = normalizeAmountToCents(withdrawal.amount)
          
          await earningsDoc.ref.update({
            availableToWithdraw: earnings.availableToWithdraw + amountInCents,
            withdrawnAmount: Math.max(0, earnings.withdrawnAmount - amountInCents),
            settlementStatus: 'ready',
            updatedAt: now.toISOString()
          })
        }
        break
    }

    await withdrawalRef.update(updates)

    return NextResponse.json({
      success: true,
      message: `Withdrawal ${action}d successfully`
    })
  } catch (err: any) {
    console.error('Error updating withdrawal:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update withdrawal' },
      { status: 500 }
    )
  }
}
