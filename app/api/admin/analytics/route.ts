import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  try {
    const { user, error } = await requireAdmin()
    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    return adminError(
      'Deprecated',
      410,
      'Use /api/admin/revenue-analytics (Firestore-backed) and Firestore rollups (platform_stats_daily) for platform metrics.'
    )
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return adminError('Failed to fetch analytics', 500)
  }
}
