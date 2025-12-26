'use client'

import { useTranslation } from 'react-i18next'
import { AdminDashboardHeader } from '@/components/admin/AdminDashboardHeader'
import { AdminKpiGrid } from '@/components/admin/AdminKpiGrid'
import { WorkQueueCard } from '@/components/admin/WorkQueueCard'
import { RecentActivityTimeline } from '@/components/admin/RecentActivityTimeline'
import { ShieldCheck, AlertCircle, Calendar, BarChart3, CreditCard } from 'lucide-react'
import Link from 'next/link'

interface AdminDashboardClientProps {
  usersCount: number
  eventsCount: number
  tickets7d: number
  gmv7d: number
  refunds7d: number
  refundsAmount7d: number
  pendingCount: number
  pendingBankCount: number
  pendingVerifications: any[]
  recentEvents: any[]
  recentActivities: any[]
}

export function AdminDashboardClient({
  usersCount,
  eventsCount,
  tickets7d,
  gmv7d,
  refunds7d,
  refundsAmount7d,
  pendingCount,
  pendingBankCount,
  pendingVerifications,
  recentEvents,
  recentActivities
}: AdminDashboardClientProps) {
  const { t } = useTranslation('admin')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
      {/* Header */}
      <AdminDashboardHeader />

      {/* KPI Grid */}
      <AdminKpiGrid
        usersCount={usersCount}
        eventsCount={eventsCount}
        tickets7d={tickets7d}
        gmv7d={gmv7d}
        refunds7d={refunds7d}
        refundsAmount7d={refundsAmount7d}
        pendingCount={pendingCount}
      />

      {/* Quick Actions */}
      <div className="mb-6 sm:mb-8 flex flex-wrap gap-4">
        <Link
          href="/admin/analytics"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <BarChart3 className="w-5 h-5" />
          <span className="font-semibold">{t('disbursements.view_revenue_analytics')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        
        <Link
          href="/admin/withdrawals"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span className="font-semibold">Manage Withdrawals</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        
        <Link
          href="/admin/disbursements"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <Calendar className="w-5 h-5" />
          <span className="font-semibold">{t('disbursements.event_disbursements')}</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        
        <Link
          href="/admin/users"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span className="font-semibold">Manage Organizers</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>

        <Link
          href="/admin/bank-verifications"
          className="relative inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-indigo-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
        >
          <CreditCard className="w-5 h-5" />
          <span className="font-semibold">Bank Verifications</span>
          {pendingBankCount > 0 && (
            <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {pendingBankCount > 9 ? '9+' : pendingBankCount}
            </span>
          )}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>

      {/* Work Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Pending Verifications Queue */}
        <WorkQueueCard
          title={t('dashboard.pending_verifications')}
          count={pendingCount}
          items={pendingVerifications.map((v: any) => ({
            id: v.id,
            title: v.businessName || t('dashboard.unknown_business'),
            subtitle: v.idType || t('dashboard.id_verification'),
            timestamp: v.createdAt,
            badge: {
              label: t('dashboard.status_pending'),
              variant: 'warning' as const
            }
          }))}
          icon={ShieldCheck}
          iconColor="text-yellow-700"
          iconBg="bg-yellow-50"
          viewAllHref="/admin/verify"
          emptyMessage={t('dashboard.no_pending')}
        />

        {/* Recent Events Queue */}
        <WorkQueueCard
          title={t('dashboard.recent_events')}
          count={eventsCount}
          items={recentEvents.map((e: any) => {
            // Build location string
            const locationParts = []
            if (e.venueName) locationParts.push(e.venueName)
            if (e.commune) locationParts.push(e.commune)
            if (e.city) locationParts.push(e.city)
            const location = locationParts.length > 0 ? locationParts.join(', ') : t('dashboard.location_tbd')
            
            // Format price
            const currency = e.currency || 'HTG'
            const price = e.ticketPrice != null && e.ticketPrice > 0
              ? `${e.ticketPrice.toFixed(2)} ${currency}`
              : t('dashboard.free')
            
            return {
              id: e.id,
              title: e.title || t('dashboard.untitled_event'),
              subtitle: `${location} • ${price}`,
              timestamp: e.createdAt,
              badge: e.isPublished ? {
                label: t('dashboard.status_published'),
                variant: 'success' as const
              } : {
                label: t('dashboard.status_draft'),
                variant: 'neutral' as const
              }
            }
          })}
          icon={Calendar}
          iconColor="text-purple-600"
          iconBg="bg-purple-50"
          viewAllHref="/admin/events"
          emptyMessage={t('dashboard.no_events_yet')}
        />
      </div>

      {/* Additional Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Recent Activity Timeline */}
        <RecentActivityTimeline activities={recentActivities} />

        {/* Notes Card */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <AlertCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-blue-900 mb-2 text-sm sm:text-base">
                {t('dashboard.daily_stats_title')}
              </h3>
              <div className="text-xs sm:text-sm text-blue-800 space-y-2">
                <p className="hidden sm:block">
                  {t('dashboard.daily_stats_desc')}
                </p>
                <p className="font-medium">{t('dashboard.daily_stats_updated')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2 text-xs">
                  <li>{t('dashboard.daily_stats_gmv')}</li>
                  <li>{t('dashboard.daily_stats_tickets')}</li>
                  <li>{t('dashboard.daily_stats_refunds')}</li>
                </ul>
                <p className="text-xs text-blue-700 hidden sm:block mt-3">
                  {t('dashboard.daily_stats_docs')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
