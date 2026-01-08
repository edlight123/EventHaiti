import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth'
import { moncashPrefundedTransactionStatus } from '@/lib/moncash'
import { adminError, adminOk } from '@/lib/api/admin-response'

const BodySchema = z.object({
  reference: z.string().min(3).max(64),
})

export async function POST(request: NextRequest) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const json = await request.json().catch(() => null)
    const parsed = BodySchema.safeParse(json)
    if (!parsed.success) {
      return adminError('Invalid request body', 400, JSON.stringify(parsed.error.flatten()))
    }

    const result = await moncashPrefundedTransactionStatus(parsed.data.reference)

    return adminOk({
      status: {
        reference: parsed.data.reference,
        transStatus: result.transStatus,
      },
    })
  } catch (error: any) {
    console.error('admin moncash-prefunded status error:', error)
    return adminError('Failed to fetch MonCash prefunded status', 500, error?.message || String(error))
  }
}
