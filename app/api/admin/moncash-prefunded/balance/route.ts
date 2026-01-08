import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { moncashPrefundedBalance } from '@/lib/moncash'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', error === 'Not authenticated' ? 401 : 403)
    }

    const result = await moncashPrefundedBalance()

    return adminOk({
      balance: {
        balance: result.balance,
        message: result.message || null,
      },
    })
  } catch (error: any) {
    console.error('admin moncash-prefunded balance error:', error)
    return adminError('Failed to fetch MonCash prefunded balance', 500, error?.message || String(error))
  }
}
