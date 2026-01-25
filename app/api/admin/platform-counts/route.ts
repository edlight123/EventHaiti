import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getPlatformCounts } from '@/lib/firestore/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { user, error } = await requireAdmin()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const counts = await getPlatformCounts()
    
    return NextResponse.json({
      pendingVerifications: counts.pendingVerifications || 0,
      pendingBankVerifications: (counts as any).pendingBankVerifications || 0,
      ...counts
    })
  } catch (error: any) {
    console.error('Platform counts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch platform counts' },
      { status: 500 }
    )
  }
}
