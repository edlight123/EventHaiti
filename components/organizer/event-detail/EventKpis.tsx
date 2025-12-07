'use client'

import { Ticket, DollarSign, Users, TrendingUp } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface EventKpisProps {
  stats: {
    ticketsSold: number
    capacity: number
    revenue: number
    netRevenue?: number
    checkedIn: number
    conversion?: number
    views?: number
  }
}

export function EventKpis({ stats }: EventKpisProps) {
  const { t } = useTranslation('common')
  const progress = stats.capacity > 0 ? (stats.ticketsSold / stats.capacity) * 100 : 0
  const checkInRate = stats.ticketsSold > 0 ? (stats.checkedIn / stats.ticketsSold) * 100 : 0

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      {/* Tickets Sold */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Ticket className="w-5 h-5 text-blue-600" />
          </div>
          <span className="text-xs font-medium text-gray-500">{t('organizer.sold_capacity')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">{stats.ticketsSold}</span>
            <span className="text-sm text-gray-500">/ {stats.capacity}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-600">{t('organizer.capacity_percent', { percent: progress.toFixed(1) })}</p>
        </div>
      </div>

      {/* Revenue */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-green-50 rounded-lg">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <span className="text-xs font-medium text-gray-500">{t('organizer.revenue')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">
              {stats.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </span>
            <span className="text-sm text-gray-500">HTG</span>
          </div>
          {stats.netRevenue !== undefined && (
            <p className="text-xs text-gray-600">
              Net: {stats.netRevenue.toLocaleString('en-US', { maximumFractionDigits: 0 })} HTG
            </p>
          )}
        </div>
      </div>

      {/* Check-ins */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="p-2 bg-purple-50 rounded-lg">
            <Users className="w-5 h-5 text-purple-600" />
          </div>
          <span className="text-xs font-medium text-gray-500">{t('organizer.check_ins')}</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl md:text-3xl font-bold text-gray-900">{stats.checkedIn}</span>
            <span className="text-sm text-gray-500">/ {stats.ticketsSold}</span>
          </div>
          {stats.ticketsSold > 0 && (
            <>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(checkInRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-gray-600">{t('organizer.checked_in_percent', { percent: checkInRate.toFixed(1) })}</p>
            </>
          )}
        </div>
      </div>

      {/* Conversion (only if views exist) */}
      {stats.views !== undefined && stats.views > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-xs font-medium text-gray-500">CONVERSION</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-bold text-gray-900">
                {((stats.ticketsSold / stats.views) * 100).toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-gray-600">{stats.views} views</p>
          </div>
        </div>
      )}
    </div>
  )
}
