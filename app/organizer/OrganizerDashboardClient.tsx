'use client'

import { useTranslation } from 'react-i18next'
import { NextEventHero } from '@/components/organizer/NextEventHero'
import { ActionCenter } from '@/components/organizer/ActionCenter'
import { SalesSnapshot } from '@/components/organizer/SalesSnapshot'
import { OrganizerEventCard } from '@/components/organizer/OrganizerEventCard'
import { PayoutsWidget } from '@/components/organizer/PayoutsWidget'
import Link from 'next/link'

interface Alert {
  id: string
  type: 'draft' | 'low-sales' | 'payout' | 'verification'
  title: string
  description: string
  ctaText: string
  ctaHref: string
}

interface OrganizerDashboardClientProps {
  nextEvent: any
  alerts: Alert[]
  hasPayoutSetup: boolean
  payoutWidgetStatus: 'not-setup' | 'setup' | 'pending' | 'active'
  pendingBalance: number
  salesData: any
  events: any[]
  tickets: any[]
}

export default function OrganizerDashboardClient({
  nextEvent,
  alerts,
  hasPayoutSetup,
  payoutWidgetStatus,
  pendingBalance,
  salesData,
  events,
  tickets
}: OrganizerDashboardClientProps) {
  const { t } = useTranslation('organizer')

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
      {/* Next Event Hero */}
      {nextEvent && (
        <div className="mb-6">
          <NextEventHero event={nextEvent} />
        </div>
      )}

      {/* Action Center + Payouts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
        {/* Action Center */}
        <div className={hasPayoutSetup ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <ActionCenter alerts={alerts} />
        </div>

        {/* Payouts Widget */}
        {hasPayoutSetup && (
          <div>
            <PayoutsWidget
              status={payoutWidgetStatus}
              pendingBalance={pendingBalance}
            />
          </div>
        )}
      </div>

      {/* Sales Snapshot */}
      <div className="mb-6">
        <SalesSnapshot data={salesData} />
      </div>

      {/* Events Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900">{t('your_events')}</h2>
            <Link
              href="/organizer/events"
              className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
            >
              {t('view_all_events')} →
            </Link>
          </div>
          <a
            href="/organizer/events/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            {t('create_event')}
          </a>
        </div>

        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {events.map((event: any) => {
              const eventTickets = tickets.filter((t: any) => t.event_id === event.id)
              const ticketsSold = eventTickets.length
              const revenue = eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0)
              
              return (
                <OrganizerEventCard
                  key={event.id}
                  event={{
                    ...event,
                    ticketsSold,
                    revenue,
                    capacity: event.total_tickets || event.max_attendees || 0
                  }}
                />
              )
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-8 md:p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-50 to-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">🎉</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('no_events.title')}</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              {t('no_events.description')}
            </p>
            <a
              href="/organizer/events/new"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
            >
              {t('no_events.cta')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
