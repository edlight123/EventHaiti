import { requireAuth } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { getOrganizerStats, getNextEvent } from '@/lib/firestore/organizer'
import { NextEventHero } from '@/components/organizer/NextEventHero'
import { ActionCenter } from '@/components/organizer/ActionCenter'
import { SalesSnapshot } from '@/components/organizer/SalesSnapshot'
import { OrganizerEventCard } from '@/components/organizer/OrganizerEventCard'
import { PayoutsWidget } from '@/components/organizer/PayoutsWidget'
import { adminDb } from '@/lib/firebase/admin'
import Link from 'next/link'

export const revalidate = 0

export default async function OrganizerDashboard() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Fetch organizer data
  const [nextEvent, stats7d, stats30d, statsLifetime] = await Promise.all([
    getNextEvent(user.id),
    getOrganizerStats(user.id, '7d'),
    getOrganizerStats(user.id, '30d'),
    getOrganizerStats(user.id, 'lifetime')
  ])

  // Default to 7d stats
  const currentStats = stats7d

  // Check verification status (placeholder - implement based on your verification system)
  const isVerified = true // TODO: Check user verification status
  const hasPayoutSetup = false // TODO: Check if payout method is configured

  // Build alerts for Action Center
  const alerts: Array<{
    id: string
    type: 'draft' | 'low-sales' | 'payout' | 'verification'
    title: string
    description: string
    ctaText: string
    ctaHref: string
  }> = []

  if (currentStats.draftEvents > 0) {
    alerts.push({
      id: 'drafts',
      type: 'draft',
      title: `${currentStats.draftEvents} Draft Event${currentStats.draftEvents > 1 ? 's' : ''}`,
      description: 'Publish your events to start selling tickets',
      ctaText: 'Publish Events',
      ctaHref: '/organizer/events'
    })
  }

  if (currentStats.upcomingSoonWithNoSales > 0) {
    alerts.push({
      id: 'no-sales',
      type: 'low-sales',
      title: `${currentStats.upcomingSoonWithNoSales} Event${currentStats.upcomingSoonWithNoSales > 1 ? 's' : ''} Starting Soon`,
      description: 'These events start within 7 days with no sales yet',
      ctaText: 'Promote Events',
      ctaHref: '/organizer/events'
    })
  }

  if (!hasPayoutSetup && statsLifetime.revenue > 0) {
    alerts.push({
      id: 'payout',
      type: 'payout',
      title: 'Payouts Not Setup',
      description: 'Configure your payout method to receive earnings',
      ctaText: 'Setup Payouts',
      ctaHref: '/organizer/settings/payouts'
    })
  }

  if (!isVerified) {
    alerts.push({
      id: 'verification',
      type: 'verification',
      title: 'Verification Pending',
      description: 'Complete verification to unlock all features',
      ctaText: 'Complete Verification',
      ctaHref: '/organizer/verify'
    })
  }

  // Build sales snapshot data
  const salesData = {
    '7d': {
      upcomingEvents: stats7d.upcomingEvents,
      ticketsSold: stats7d.ticketsSold,
      revenue: stats7d.revenue,
      avgTicketsPerEvent: stats7d.avgTicketsPerEvent
    },
    '30d': {
      upcomingEvents: stats30d.upcomingEvents,
      ticketsSold: stats30d.ticketsSold,
      revenue: stats30d.revenue,
      avgTicketsPerEvent: stats30d.avgTicketsPerEvent
    },
    lifetime: {
      upcomingEvents: statsLifetime.upcomingEvents,
      ticketsSold: statsLifetime.ticketsSold,
      revenue: statsLifetime.revenue,
      avgTicketsPerEvent: statsLifetime.avgTicketsPerEvent
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Next Event Hero - Mobile First */}
          {nextEvent && (
            <div className="mb-6">
              <NextEventHero event={nextEvent} />
            </div>
          )}

          {/* Action Center + Payouts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            {/* Action Center - Takes 2 columns on large screens */}
            <div className="lg:col-span-2">
              <ActionCenter alerts={alerts} />
            </div>

            {/* Payouts Widget - Takes 1 column */}
            <div>
              <PayoutsWidget
                status={hasPayoutSetup ? 'active' : 'not-setup'}
                pendingBalance={0}
              />
            </div>
          </div>

          {/* Sales Snapshot */}
          <div className="mb-6">
            <SalesSnapshot data={salesData} />
          </div>

          {/* Events Grid */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl md:text-2xl font-bold text-gray-900">Your Events</h2>
                <Link
                  href="/organizer/events"
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium hover:underline"
                >
                  View all events →
                </Link>
              </div>
              <a
                href="/organizer/events/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition-colors text-sm"
              >
                Create Event
              </a>
            </div>

            {currentStats.events.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {currentStats.events.map((event: any) => {
                  // Get ticket count for this event
                  const eventTickets = currentStats.tickets.filter((t: any) => t.event_id === event.id)
                  const ticketsSold = eventTickets.length
                  const revenue = eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0)
                  
                  return (
                    <OrganizerEventCard
                      key={event.id}
                      event={{
                        ...event,
                        ticketsSold,
                        revenue,
                        total_tickets: event.total_tickets || 0
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">No events yet</h3>
                <p className="text-gray-600 mb-6 max-w-md mx-auto">
                  Create your first event and start selling tickets to your audience
                </p>
                <a
                  href="/organizer/events/new"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                >
                  Create Your First Event
                </a>
              </div>
            )}
          </div>
        </div>

        <MobileNavWrapper user={user} isAdmin={isAdmin(user?.email)} />
      </div>
  )
}
