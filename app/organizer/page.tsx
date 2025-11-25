import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import Badge from '@/components/ui/Badge'
import { Calendar, TrendingUp, DollarSign, Users, Plus, QrCode, BarChart3, Tag, Sparkles, ArrowRight } from 'lucide-react'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

export const revalidate = 0

export default async function OrganizerDashboard() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  let events: any[] = []
  let tickets: any[] = []
  let totalRevenue = 0
  let totalTicketsSold = 0
  let upcomingEvents = 0

  if (isDemoMode()) {
    events = DEMO_EVENTS
    upcomingEvents = events.filter(e => new Date(e.start_datetime) > new Date()).length
    totalTicketsSold = 234
    totalRevenue = 12450
  } else {
    const supabase = await createClient()
    
    // Fetch events
    const { data: allEvents } = await supabase.from('events').select('*')
    events = allEvents?.filter((e: any) => e.organizer_id === user.id) || []
    upcomingEvents = events.filter(e => new Date(e.start_datetime) > new Date()).length
    
    // Fetch tickets for revenue calculation
    const { data: allTickets } = await supabase.from('tickets').select('*')
    const eventIds = events.map(e => e.id)
    tickets = allTickets?.filter((t: any) => eventIds.includes(t.event_id)) || []
    totalTicketsSold = tickets.length
    totalRevenue = tickets.reduce((sum, t) => sum + (t.price_paid || 0), 0)
  }

  const recentEvents = events.slice(0, 3)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome back, {user.full_name?.split(' ')[0] || 'Organizer'}! 👋</h1>
          <p className="text-lg text-gray-600">Here&apos;s what&apos;s happening with your events</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Events</h3>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{events.length}</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">{upcomingEvents} Upcoming</Badge>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tickets Sold</h3>
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-brand-700 mb-2">{totalTicketsSold}</p>
            <p className="text-sm text-gray-600">Across all events</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</h3>
              <div className="w-12 h-12 bg-accent-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-accent-700 mb-2">${totalRevenue.toFixed(2)}</p>
            <p className="text-sm text-gray-600">Lifetime earnings</p>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg per Event</h3>
              <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-purple-700 mb-2">
              {events.length > 0 ? (totalTicketsSold / events.length).toFixed(1) : '0'}
            </p>
            <p className="text-sm text-gray-600">Tickets per event</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-brand-600" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/organizer/events/new"
              className="group bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl p-6 text-white hover:shadow-glow transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <Plus className="w-8 h-8" />
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1">Create Event</h3>
              <p className="text-brand-100 text-sm">Start planning your next event</p>
            </Link>

            <Link
              href="/organizer/events"
              className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-brand-500 hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <Calendar className="w-8 h-8 text-blue-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-gray-900">My Events</h3>
              <p className="text-gray-600 text-sm">Manage all your events</p>
            </Link>

            <Link
              href="/organizer/scan"
              className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-purple-500 hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <QrCode className="w-8 h-8 text-purple-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-gray-900">Scan Tickets</h3>
              <p className="text-gray-600 text-sm">Check-in attendees</p>
            </Link>

            <Link
              href="/organizer/analytics"
              className="group bg-white border-2 border-gray-200 rounded-2xl p-6 hover:border-accent-500 hover:shadow-medium transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <BarChart3 className="w-8 h-8 text-accent-600" />
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:translate-x-1 transition-transform" />
              </div>
              <h3 className="font-bold text-lg mb-1 text-gray-900">Analytics</h3>
              <p className="text-gray-600 text-sm">View detailed insights</p>
            </Link>
          </div>
        </div>

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Recent Events</h2>
            <Link href="/organizer/events" className="text-brand-600 hover:text-brand-700 font-semibold flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          {recentEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recentEvents.map(event => (
                <Link
                  key={event.id}
                  href={`/organizer/events/${event.id}`}
                  className="bg-white rounded-2xl shadow-soft border border-gray-100 overflow-hidden hover:shadow-medium transition-all group"
                >
                  {event.banner_image_url ? (
                    <div className="h-48 bg-gray-200 overflow-hidden">
                      <img src={event.banner_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    </div>
                  ) : (
                    <div className="h-48 bg-gradient-to-br from-brand-100 to-accent-100 flex items-center justify-center">
                      <span className="text-5xl">🎉</span>
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                      <Calendar className="w-4 h-4" />
                      {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={event.is_published ? 'success' : 'neutral'} size="sm">
                        {event.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <span className="text-xs text-gray-500">{event.tickets_sold || 0} / {event.total_tickets} sold</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">No events yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to get started</p>
              <Link
                href="/organizer/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-600 to-accent-600 text-white rounded-xl font-bold hover:shadow-glow transition-all"
              >
                <Plus className="w-5 h-5" />
                Create Event
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
