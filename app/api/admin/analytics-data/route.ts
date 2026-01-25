import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { adminError, adminOk } from '@/lib/api/admin-response'
import {
  getUserGrowthMetrics,
  getTopPerformingEvents,
  getCategoryPopularity,
  getConversionFunnelMetrics,
  getOrganizerRankings,
  getGeographicDistribution
} from '@/lib/admin-analytics'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { user, error } = await requireAdmin()

    if (error || !user) {
      return adminError(error || 'Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const days = parseInt(searchParams.get('days') || '30')

    switch (type) {
      case 'user-growth':
        const userGrowth = await getUserGrowthMetrics(days)
        return adminOk(userGrowth)

      case 'top-events':
        const limit = parseInt(searchParams.get('limit') || '10')
        const topEvents = await getTopPerformingEvents(limit)
        return adminOk(topEvents)

      case 'categories':
        const categories = await getCategoryPopularity(days)
        return adminOk(categories)

      case 'conversion':
        const conversion = await getConversionFunnelMetrics(days)
        return adminOk(conversion)

      case 'organizers':
        const orgLimit = parseInt(searchParams.get('limit') || '10')
        const organizers = await getOrganizerRankings(orgLimit)
        return adminOk(organizers)

      case 'geographic':
        const geographic = await getGeographicDistribution()
        return adminOk(geographic)

      case 'overview':
        // Return all key metrics in one call
        const [userMetrics, topEventsData, categoryData, conversionData, topOrganizers] = await Promise.all([
          getUserGrowthMetrics(days),
          getTopPerformingEvents(5),
          getCategoryPopularity(days),
          getConversionFunnelMetrics(days),
          getOrganizerRankings(5)
        ])

        return adminOk({
          userGrowth: userMetrics,
          topEvents: topEventsData,
          categories: categoryData,
          conversion: conversionData,
          topOrganizers,
          period: days
        })

      default:
        return adminError('Invalid type parameter. Use: user-growth, top-events, categories, conversion, organizers, geographic, or overview', 400)
    }
  } catch (error: any) {
    console.error('Admin analytics data error:', error)
    return adminError('Failed to fetch analytics data', 500, error.message || String(error))
  }
}
