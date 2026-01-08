import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { moncashPrefundedTransfer } from '@/lib/moncash'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { logAdminAction } from '@/lib/admin/audit-log'

const BodySchema = z.object({
  amount: z.number().positive(),
  receiver: z.string().min(6),
  desc: z.string().min(1).max(140),
  reference: z.string().min(3).max(64),
})

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const json = await request.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return adminError('Invalid request body', 400, JSON.stringify(parsed.error.flatten()))
    }

    const result = await moncashPrefundedTransfer(parsed.data)

    await logAdminAction({
      action: 'moncash.prefunded.transfer',
      adminId: user.id,
      adminEmail: user.email || 'unknown',
      resourceType: 'moncash',
      details: {
        amount: parsed.data.amount,
        receiver: parsed.data.receiver,
        reference: parsed.data.reference,
        transactionId: result.transactionId,
      },
    })

    return adminOk({
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
    return adminError(
      'Failed to transfer via MonCash prefunded',
      500,
      error?.message || String(error)
    )
  }
}
