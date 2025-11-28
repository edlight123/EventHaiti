import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import SalesChart from '@/components/charts/SalesChart'
  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/organizer/analytics')
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
          {/* Header */}
          <div className="mb-6 md:mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
                <TrendingUp className="w-7 h-7 md:w-10 md:h-10 text-brand-600" />
                Analytics Dashboard
              </h1>
              <p className="text-[13px] md:text-lg text-gray-600 mt-1 md:mt-2">Track your event performance and insights</p>
            </div>
            <Link
              href="/organizer/events"
              className="inline-flex items-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white border border-gray-200 rounded-lg md:rounded-xl hover:border-brand-500 hover:shadow-medium transition-all font-semibold text-sm md:text-base text-gray-700 hover:text-brand-700"
            >
              <ArrowLeft className="w-4 h-4 md:w-5 md:h-5" />
              Back
            </Link>
          </div>

          {/* Metrics - Horizontal scroll on mobile */}
          <div className="flex md:grid md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 overflow-x-auto -mx-4 px-4 pb-2 snap-x snap-mandatory md:overflow-visible mb-6 md:mb-8">
            <div className="min-w-[240px] md:min-w-0 snap-start bg-white rounded-xl shadow-soft border border-gray-100 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-[11px] md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Events</h3>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-50 rounded-lg md:rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2">{totalEvents}</p>
              <Badge variant="success" size="sm">{publishedEvents} Published</Badge>
            </div>
            <div className="min-w-[240px] md:min-w-0 snap-start bg-white rounded-xl shadow-soft border border-gray-100 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-[11px] md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Tickets Sold</h3>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-brand-50 rounded-lg md:rounded-xl flex items-center justify-center">
                  <Ticket className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-brand-700 mb-1 md:mb-2">{totalTicketsSold}</p>
              <p className="text-[11px] md:text-sm text-gray-600">Across all events</p>
            </div>
            <div className="min-w-[240px] md:min-w-0 snap-start bg-white rounded-xl shadow-soft border border-gray-100 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-[11px] md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Revenue</h3>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-accent-50 rounded-lg md:rounded-xl flex items-center justify-center">
                  <DollarSign className="w-5 h-5 md:w-6 md:h-6 text-accent-600" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-accent-700 mb-1 md:mb-2">${totalRevenue.toFixed(2)}</p>
              <p className="text-[11px] md:text-sm text-gray-600">Lifetime earnings</p>
            </div>
            <div className="min-w-[240px] md:min-w-0 snap-start bg-white rounded-xl shadow-soft border border-gray-100 p-4 md:p-6 flex-shrink-0">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <h3 className="text-[11px] md:text-sm font-semibold text-gray-600 uppercase tracking-wide">Avg per Event</h3>
                <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-50 rounded-lg md:rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl md:text-4xl font-bold text-purple-700 mb-1 md:mb-2">{totalEvents > 0 ? (totalTicketsSold / totalEvents).toFixed(1) : '0'}</p>
              <p className="text-[11px] md:text-sm text-gray-600">Tickets per event</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 md:w-6 md:h-6 text-brand-600" />
                Sales Trend (7d)
              </h2>
              <SalesChart data={salesChartData} />
              <div className="flex items-center justify-center gap-4 md:gap-6 mt-3 md:mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-brand-600 rounded-full" />
                  <span className="text-[11px] md:text-sm text-gray-600">Tickets</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-accent-600 rounded-full" />
                  <span className="text-[11px] md:text-sm text-gray-600">Revenue</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl md:rounded-2xl shadow-soft border border-gray-100 p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
                <Calendar className="w-5 h-5 md:w-6 md:h-6 text-accent-600" />
                By Category
              </h2>
              {categoryChartData.length > 0 ? (
                <CategoryChart data={categoryChartData} />
              ) : (
                <div className="flex items-center justify-center h-[240px] md:h-[300px] text-gray-500 text-sm md:text-base">
                  No category data
                </div>
              )}
            </div>
          </div>

          {/* Top Events */}
          <div className="bg-white rounded-xl md:rounded-2xl shadow-soft border border-gray-100 p-6 md:p-8">
            <h2 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6 flex items-center gap-2">
              <TrendingUp className="w-6 h-6 md:w-7 md:h-7 text-brand-600" />
              Top Performing Events
            </h2>
            {eventsWithSales.length === 0 ? (
              <div className="text-center py-12 md:py-16">
                <div className="text-5xl md:text-7xl mb-4">📊</div>
                <h3 className="text-base md:text-xl font-bold text-gray-900 mb-2">No Events Yet</h3>
                <p className="text-[13px] md:text-gray-600 md:mb-6 mb-4">Create your first event to see analytics!</p>
                <Link
                  href="/organizer/events/new"
                  className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white font-bold hover:shadow-glow transition-all text-sm md:text-base"
                >
                  <Calendar className="w-4 h-4 md:w-5 md:h-5" />
                  Create Event
                </Link>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {eventsWithSales.slice(0, 10).map((event: any, index: number) => (
                  <div key={event.id} className="flex items-center gap-3 md:gap-4 p-4 md:p-5 bg-gray-50 rounded-lg md:rounded-xl hover:bg-gray-100 transition-colors border border-gray-100">
                    <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-brand-500 to-accent-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-xs md:text-sm">
                      #{index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <Link href={`/organizer/events/${event.id}`} className="font-semibold md:font-bold text-gray-900 hover:text-brand-700 transition-colors block truncate text-sm md:text-base">
                        {event.title}
                      </Link>
                      <p className="text-[11px] md:text-sm text-gray-600 mt-0.5 md:mt-1">
                        {new Date(event.start_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6">
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs text-gray-500 font-semibold uppercase mb-0.5 md:mb-1">Tickets</p>
                        <p className="text-lg md:text-2xl font-bold text-brand-700">{event.ticketCount}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] md:text-xs text-gray-500 font-semibold uppercase mb-0.5 md:mb-1">Revenue</p>
                        <p className="text-lg md:text-2xl font-bold text-accent-700">${event.revenue.toFixed(2)}</p>
                      </div>
                      {!event.is_published && (
                        <Badge variant="neutral" size="sm" className="text-[10px] md:text-xs">Draft</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
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
    </div>
  )
}
