import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { moncashPrefundedTransfer } from '@/lib/moncash'

const BodySchema = z.object({
  amount: z.number().positive(),
  receiver: z.string().min(6),
  desc: z.string().min(1).max(140),
  reference: z.string().min(3).max(64),
})

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const json = await request.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = await moncashPrefundedTransfer(parsed.data)

    return NextResponse.json({
      success: true,
      transfer: {
        transactionId: result.transactionId,
        amount: result.amount,
        receiver: result.receiver,
        message: result.message || null,
        desc: result.desc || null,
      },
    })
  } catch (error: any) {
    console.error('admin moncash-prefunded transfer error:', error)
    return NextResponse.json(
      { error: 'Failed to transfer via MonCash prefunded', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
