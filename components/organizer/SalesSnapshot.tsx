'use client'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react'

type TimeRange = '7d' | '30d' | 'lifetime'

interface SalesSnapshotProps {
  data: {
    '7d': {
      upcomingEvents: number
      ticketsSold: number
      revenue: number
      avgTicketsPerEvent: number
    }
    '30d': {
      upcomingEvents: number
      ticketsSold: number
      revenue: number
      avgTicketsPerEvent: number
    }
    lifetime: {
      upcomingEvents: number
      ticketsSold: number
      revenue: number
      avgTicketsPerEvent: number
    }
  }
}

export function SalesSnapshot({ data }: SalesSnapshotProps) {
  const { t } = useTranslation('organizer')
  const [range, setRange] = useState<TimeRange>('7d')
  const metrics = data[range]

  const formatRevenue = (cents: number) => {
    if (cents === 0) return 'No earnings yet'
    return `$${(cents / 100).toLocaleString()}`
  }

  const getRangeLabel = (r: TimeRange) => {
    switch (r) {
      case '7d': return t('sales_snapshot.7d')
      case '30d': return t('sales_snapshot.30d')
      case 'lifetime': return t('sales_snapshot.lifetime')
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-gray-900 text-lg">{t('sales_snapshot.title')}</h3>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {(['7d', '30d', 'lifetime'] as TimeRange[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-md text-sm font-semibold transition-all ${
                range === r
                  ? 'bg-white text-brand-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {r === '7d' ? '7d' : r === '30d' ? '30d' : 'Lifetime'}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">{getRangeLabel(range)}</p>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-semibold text-blue-900 uppercase tracking-wide">{t('sales_snapshot.events')}</p>
          </div>
          <p className="text-3xl font-bold text-blue-700 mb-1">{metrics.upcomingEvents}</p>
          <p className="text-xs text-blue-600">{t('sales_snapshot.upcoming')}</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-semibold text-teal-900 uppercase tracking-wide">{t('sales_snapshot.tickets')}</p>
          </div>
          <p className="text-3xl font-bold text-teal-700 mb-1">{metrics.ticketsSold}</p>
          <p className="text-xs text-teal-600">{t('sales_snapshot.sold')}</p>
        </div>

        <div className={`bg-gradient-to-br rounded-xl p-4 border ${
          metrics.revenue === 0
            ? 'from-gray-50 to-gray-100 border-gray-200'
            : 'from-purple-50 to-purple-100 border-purple-200'
        }`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              metrics.revenue === 0 ? 'bg-gray-600' : 'bg-purple-600'
            }`}>
              <DollarSign className="w-4 h-4 text-white" />
            </div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${
              metrics.revenue === 0 ? 'text-gray-900' : 'text-purple-900'
            }`}>{t('sales_snapshot.revenue')}</p>
          </div>
          <p className={`text-3xl font-bold mb-1 ${
            metrics.revenue === 0 ? 'text-gray-700 text-xl' : 'text-purple-700'
          }`}>
            {formatRevenue(metrics.revenue)}
          </p>
          <p className={`text-xs ${metrics.revenue === 0 ? 'text-gray-600' : 'text-purple-600'}`}>
            {metrics.revenue === 0 ? 'Start selling tickets' : t('sales_snapshot.earned')}
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-white" />
            </div>
            <p className="text-xs font-semibold text-orange-900 uppercase tracking-wide">{t('sales_snapshot.avg_event')}</p>
          </div>
          <p className="text-3xl font-bold text-orange-700 mb-1">
            {metrics.avgTicketsPerEvent.toFixed(1)}
          </p>
          <p className="text-xs text-orange-600">{t('sales_snapshot.tickets_per_event')}</p>
        </div>
      </div>
    </div>
  )
}
