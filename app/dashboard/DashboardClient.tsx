'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { Calendar, Heart, Ticket, TrendingUp } from 'lucide-react'
import { Suspense } from 'react'
import { NextEventHero } from '@/components/dashboard/NextEventHero'
import { TicketsPreview } from '@/components/dashboard/TicketsPreview'
import { FavoritesRow } from '@/components/dashboard/FavoritesRow'
import { UpcomingListCompact } from '@/components/dashboard/UpcomingListCompact'

type DashboardClientProps = {
  userName: string
  nextEvent: any
  allUpcomingEvents: any[]
  totalTickets: number
  ticketPreviews: any[]
  favoriteEvents: any[]
}

export default function DashboardClient({
  userName,
  nextEvent,
  allUpcomingEvents,
  totalTickets,
  ticketPreviews,
  favoriteEvents
}: DashboardClientProps) {
  const { t } = useTranslation('dashboard')

  const nextEventDate = nextEvent 
    ? new Date(nextEvent.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : ''

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Welcome Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          {t('welcome', { name: userName })}
        </h1>
        <p className="text-base sm:text-lg text-gray-600">{t('subtitle')}</p>
      </div>

      {/* Next Event Hero */}
      {nextEvent && (
        <Suspense fallback={<div className="h-80 bg-gray-200 rounded-3xl animate-pulse mb-8" />}>
          <NextEventHero event={nextEvent} />
        </Suspense>
      )}

      {/* Stats Cards - Now Clickable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-8 mt-8">
        <Link
          href="/tickets"
          className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-brand-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('stats.upcoming_events')}
            </h3>
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center group-hover:bg-brand-100 transition-colors">
              <Calendar className="w-5 h-5 text-brand-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-brand-700 mb-1">{allUpcomingEvents.length}</p>
          <p className="text-xs text-gray-600">
            {allUpcomingEvents.length > 0 && nextEvent
              ? t('stats.next_event', { date: nextEventDate })
              : t('stats.no_upcoming')}
          </p>
        </Link>

        <Link
          href="/tickets"
          className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-purple-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('stats.total_tickets')}
            </h3>
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-purple-100 transition-colors">
              <Ticket className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-purple-700 mb-1">{totalTickets}</p>
          <p className="text-xs text-gray-600">
            {totalTickets > 0 
              ? t('stats.active_tickets', { count: totalTickets })
              : t('stats.no_tickets')}
          </p>
        </Link>

        <Link
          href="/favorites"
          className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 hover:shadow-lg hover:border-pink-200 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              {t('stats.favorites')}
            </h3>
            <div className="w-10 h-10 bg-pink-50 rounded-lg flex items-center justify-center group-hover:bg-pink-100 transition-colors">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-pink-700 mb-1">{favoriteEvents.length}</p>
          <p className="text-xs text-gray-600">
            {favoriteEvents.length > 0 
              ? t('stats.saved_events', { count: favoriteEvents.length })
              : t('stats.no_favorites')}
          </p>
        </Link>
      </div>

      {/* My Tickets Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{t('sections.my_tickets')}</h2>
          <Link href="/tickets" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 text-sm">
            {t('sections.view_all')}
            <TrendingUp className="w-4 h-4" />
          </Link>
        </div>
        <Suspense fallback={<div className="space-y-4">{[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-200 rounded-2xl animate-pulse" />)}</div>}>
          <TicketsPreview tickets={ticketPreviews} />
        </Suspense>
      </div>

      {/* Favorites Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">{t('sections.saved_events')}</h2>
          {favoriteEvents.length > 0 && (
            <Link href="/favorites" className="text-pink-600 hover:text-pink-700 font-semibold flex items-center gap-1 text-sm">
              {t('sections.view_all')}
              <TrendingUp className="w-4 h-4" />
            </Link>
          )}
        </div>
        <Suspense fallback={<div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />}>
          <FavoritesRow favorites={favoriteEvents} />
        </Suspense>
      </div>

      {/* Upcoming Events Compact List */}
      {!nextEvent && allUpcomingEvents.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">{t('sections.upcoming_events')}</h2>
            <Link href="/tickets" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1 text-sm">
              {t('sections.view_all')}
              <TrendingUp className="w-4 h-4" />
            </Link>
          </div>
          <Suspense fallback={<div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse" />)}</div>}>
            <UpcomingListCompact events={allUpcomingEvents} />
          </Suspense>
        </div>
      )}
    </div>
  )
}
