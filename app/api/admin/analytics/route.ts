import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || !isAdmin(user.email)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json(
      {
        error: 'Deprecated',
        message:
          'This endpoint has been deprecated. Use /api/admin/revenue-analytics (Firestore-backed) and Firestore rollups (platform_stats_daily) for platform metrics.',
      },
      { status: 410 }
    )
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
