import { NextResponse } from 'next/server'
import { checkPaymentStatus } from '@/lib/moncash'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, reference } = await request.json()

    if (!transactionId && !reference) {
      return NextResponse.json(
        { error: 'Either transactionId or reference is required' },
        { status: 400 }
      )
    }

    // Check payment status with MonCash
    const status = await checkPaymentStatus(
      transactionId ? { transactionId } : { reference }
    )

    return NextResponse.json({
      status: status.message,
      transactionId: status.transactionId,
      reference: status.reference,
      amount: status.amount,
      account: status.account,
    })
  } catch (error: any) {
    console.error('MonCash check status error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check payment status' },
      { status: 500 }
    )
  }
}
