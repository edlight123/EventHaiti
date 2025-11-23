import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getUserGrowthMetrics,
  getRevenueGrowthMetrics,
  getTopPerformingEvents,
  getCategoryPopularity,
  getConversionFunnelMetrics,
  getOrganizerRankings,
  getChurnAnalysis,
} from '@/lib/admin-analytics'

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser()
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30')
    const metric = searchParams.get('metric')

    let data: any = {}

    // Get requested metrics
    if (!metric || metric === 'all') {
      const [
        userGrowth,
        revenueGrowth,
        topEvents,
        categoryPop,
        conversionFunnel,
        organizerRank,
        churnData,
      ] = await Promise.all([
        getUserGrowthMetrics(days),
        getRevenueGrowthMetrics(days),
        getTopPerformingEvents(10),
        getCategoryPopularity(days),
        getConversionFunnelMetrics(days),
        getOrganizerRankings(10),
        getChurnAnalysis(90),
      ])

      data = {
        userGrowth,
        revenueGrowth,
        topEvents,
        categoryPopularity: categoryPop,
        conversionFunnel,
        organizerRankings: organizerRank,
        churnAnalysis: churnData,
      }
    } else {
      // Get specific metric
      switch (metric) {
        case 'userGrowth':
          data = await getUserGrowthMetrics(days)
          break
        case 'revenueGrowth':
          data = await getRevenueGrowthMetrics(days)
          break
        case 'topEvents':
          data = await getTopPerformingEvents(10)
          break
        case 'categoryPopularity':
          data = await getCategoryPopularity(days)
          break
        case 'conversionFunnel':
          data = await getConversionFunnelMetrics(days)
          break
        case 'organizerRankings':
          data = await getOrganizerRankings(10)
          break
        case 'churnAnalysis':
          data = await getChurnAnalysis(90)
          break
        default:
          return NextResponse.json({ error: 'Invalid metric' }, { status: 400 })
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching admin analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
