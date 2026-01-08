import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import { 
  getPlatformRevenueAnalytics, 
  getCompletePlatformMetrics,
  getRevenueByPeriod 
} from '@/lib/admin/revenue-analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAdmin()

    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'platform'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'

    if (type === 'platform') {
      const metrics = await getCompletePlatformMetrics()
      return adminOk(metrics as any)
    }

    if (type === 'revenue') {
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      const revenue = await getPlatformRevenueAnalytics(start, end)
      return adminOk(revenue as any)
    }

    if (type === 'timeseries') {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate ? new Date(endDate) : new Date()
      const data = await getRevenueByPeriod(period, start, end)
      return adminOk(data as any)
    }

    return adminError('Invalid type parameter', 400)
  } catch (error: any) {
    console.error('Admin revenue analytics error:', error)
    return adminError('Failed to fetch analytics', 500, error.message || String(error))
  }
}
