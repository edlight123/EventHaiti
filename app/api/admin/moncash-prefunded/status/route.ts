import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { moncashPrefundedTransactionStatus } from '@/lib/moncash'

const BodySchema = z.object({
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

    const result = await moncashPrefundedTransactionStatus(parsed.data.reference)

    return NextResponse.json({
      success: true,
      status: {
        reference: parsed.data.reference,
        transStatus: result.transStatus,
      },
    })
  } catch (error: any) {
    console.error('admin moncash-prefunded status error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MonCash prefunded status', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
