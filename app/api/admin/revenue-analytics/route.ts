import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { 
  getPlatformRevenueAnalytics, 
  getCompletePlatformMetrics,
  getRevenueByPeriod 
} from '@/lib/admin/revenue-analytics'

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()

    if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'platform'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') as 'daily' | 'weekly' | 'monthly' || 'daily'

    if (type === 'platform') {
      const metrics = await getCompletePlatformMetrics()
      return NextResponse.json(metrics)
    }

    if (type === 'revenue') {
      const start = startDate ? new Date(startDate) : undefined
      const end = endDate ? new Date(endDate) : undefined
      const revenue = await getPlatformRevenueAnalytics(start, end)
      return NextResponse.json(revenue)
    }

    if (type === 'timeseries') {
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const end = endDate ? new Date(endDate) : new Date()
      const data = await getRevenueByPeriod(period, start, end)
      return NextResponse.json(data)
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
  } catch (error: any) {
    console.error('Admin revenue analytics error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
