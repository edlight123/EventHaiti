import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { moncashPrefundedBalance } from '@/lib/moncash'

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    if (error || !user || !isAdmin(user?.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await moncashPrefundedBalance()

    return NextResponse.json({
      success: true,
      balance: {
        balance: result.balance,
        message: result.message || null,
      },
    })
  } catch (error: any) {
    console.error('admin moncash-prefunded balance error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch MonCash prefunded balance', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}
