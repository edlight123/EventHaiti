import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SalesChart from '@/components/charts/SalesChart'
import CategoryChart from '@/components/charts/CategoryChart'
import { TrendingUp, DollarSign, Ticket, Calendar, ArrowLeft } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import { revalidatePath } from 'next/cache'

export const revalidate = 120 // Cache for 2 minutes

export default async function AnalyticsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/login?redirect=/organizer/analytics')
  }

  if (user.role !== 'organizer') {
    redirect('/organizer?redirect=/organizer/analytics')
  }

  const supabase = await createClient()

  // Fetch organizer's events (no joins with Firebase)
  const allEventsQuery = await supabase.from('events').select('*')
  const allEvents = allEventsQuery.data || []
  const eventsData = allEvents.filter((e: any) => e.organizer_id === user.id)

  // Fetch all tickets
  const allTicketsQuery = await supabase.from('tickets').select('*')
  const allTickets = allTicketsQuery.data || []
  
  // Group tickets by event
  const ticketsByEvent = new Map()
  allTickets.forEach((ticket: any) => {
    if (!ticketsByEvent.has(ticket.event_id)) {
      ticketsByEvent.set(ticket.event_id, [])
    }
    ticketsByEvent.get(ticket.event_id).push(ticket)
  })

  // Calculate analytics
  const totalEvents = eventsData.length
  let totalTicketsSold = 0
  let totalRevenue = 0
  
  eventsData.forEach((event: any) => {
    const eventTickets = ticketsByEvent.get(event.id) || []
    totalTicketsSold += eventTickets.length
    totalRevenue += eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0)
  })
  
  const publishedEvents = eventsData.filter((e: any) => e.is_published).length

  // Events with ticket sales
  const eventsWithSales = eventsData.map((event: any) => {
    const eventTickets = ticketsByEvent.get(event.id) || []
    return {
      ...event,
      ticketCount: eventTickets.length,
      revenue: eventTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0),
    }
  }).sort((a: any, b: any) => b.ticketCount - a.ticketCount)

  // Prepare chart data - Sales over time (last 7 days)
  const salesChartData = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    
    const dayTickets = allTickets.filter((t: any) => {
      const ticketDate = new Date(t.created_at).toISOString().split('T')[0]
      return ticketDate === dateStr && eventsData.some((e: any) => e.id === t.event_id)
    })
    
    salesChartData.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales: dayTickets.length,
      revenue: dayTickets.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0),
    })
  }

  // Category distribution
  const categoryData: Record<string, number> = {}
  eventsData.forEach((event: any) => {
    categoryData[event.category] = (categoryData[event.category] || 0) + 1
  })
  const categoryChartData = Object.entries(categoryData).map(([name, value]) => ({ name, value }))

  async function refreshPage() {
    'use server'
    revalidatePath('/organizer/analytics')
  }

  return (
    
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
              <TrendingUp className="w-10 h-10 text-brand-600" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-2 text-lg">Track your event performance and insights</p>
          </div>
          <Link
            href="/organizer/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 rounded-xl hover:border-brand-500 hover:shadow-medium transition-all font-semibold text-gray-700 hover:text-brand-700"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Events
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Events</h3>
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-2">{totalEvents}</p>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">{publishedEvents} Published</Badge>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6 hover:shadow-medium transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Tickets Sold</h3>
              <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center">
                <Ticket className="w-6 h-6 text-brand-600" />
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
              {totalEvents > 0 ? (totalTicketsSold / totalEvents).toFixed(1) : '0'}
            </p>
            <p className="text-sm text-gray-600">Tickets per event</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand-600" />
              Sales Trend (Last 7 Days)
            </h2>
            <SalesChart data={salesChartData} />
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-brand-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Tickets Sold</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-accent-600 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-accent-600" />
              Events by Category
            </h2>
            {categoryChartData.length > 0 ? (
              <CategoryChart data={categoryChartData} />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-500">
                No category data available
              </div>
            )}
          </div>
        </div>

        {/* Top Performing Events */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-brand-600" />
            Top Performing Events
          </h2>
          {eventsWithSales.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-7xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
              <p className="text-gray-600 mb-6">Create your first event to see analytics!</p>
              <Link
                href="/organizer/events/new"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold hover:shadow-glow transition-all"
              >
                <Calendar className="w-5 h-5" />
                Create Event
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {eventsWithSales.slice(0, 10).map((event: any, index: number) => (
                <div key={event.id} className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                  <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    #{index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link href={`/organizer/events/${event.id}`} className="font-bold text-gray-900 hover:text-brand-700 transition-colors block truncate">
                      {event.title}
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Tickets</p>
                      <p className="text-2xl font-bold text-brand-700">{event.ticketCount}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Revenue</p>
                      <p className="text-2xl font-bold text-accent-700">${event.revenue.toFixed(2)}</p>
                    </div>
                    {!event.is_published && (
                      <Badge variant="neutral" size="md">Draft</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <MobileNavWrapper user={user} />
    </div>
    
  )
}
