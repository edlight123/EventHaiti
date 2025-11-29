import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export const revalidate = 0

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(e => e)

export default async function AdminEventsPage() {
  const user = await getCurrentUser()

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch all events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('created_at', { ascending: false })

  // Fetch all users for organizer info
  const { data: users } = await supabase.from('users').select('*')

  const eventsWithOrganizers = events?.map((event: any) => {
    const organizer = users?.find((u: any) => u.id === event.organizer_id)
    return { ...event, organizer }
  }) || []

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <PullToRefresh
        onRefresh={async () => {
          'use server'
          revalidatePath('/admin/events')
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-4 sm:mb-6">
          <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
            ← Back to Admin Dashboard
          </Link>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Events</h1>
          <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">View and moderate all events on the platform</p>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {eventsWithOrganizers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-[13px] sm:text-base text-gray-500">No events found</p>
            </div>
          ) : (
            <>
              {/* Mobile: stacked cards */}
              <div className="sm:hidden divide-y divide-gray-100">
                {eventsWithOrganizers.map((event: any) => (
                  <div key={event.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-gray-900 line-clamp-2">{event.title}</div>
                        <div className="text-[13px] text-gray-500 line-clamp-1">{event.venue_name || event.city}</div>
                        <div className="text-[13px] text-gray-500 line-clamp-1">{event.organizer?.full_name || 'Unknown'}</div>
                      </div>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        event.start_datetime && new Date(event.start_datetime) > new Date()
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.start_datetime && new Date(event.start_datetime) > new Date() ? 'Upcoming' : 'Past'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] text-gray-700">${(event.ticket_price || 0).toFixed(2)}</div>
                      <a
                        href={`/events/${event.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-teal-600 hover:text-teal-900 text-sm font-medium"
                      >
                        View
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Event</th>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Organizer</th>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Price</th>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eventsWithOrganizers.map((event: any) => (
                      <tr key={event.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900 line-clamp-1">{event.title}</div>
                          <div className="text-[13px] text-gray-500 line-clamp-1">{event.venue_name || event.city}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{event.organizer?.full_name || 'Unknown'}</div>
                          <div className="text-[13px] text-gray-500 line-clamp-1">{event.organizer?.email}</div>
                        </td>
                        <td className="px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">
                          {event.start_datetime ? new Date(event.start_datetime).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-[13px] text-gray-900 whitespace-nowrap">${(event.ticket_price || 0).toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            event.start_datetime && new Date(event.start_datetime) > new Date()
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {event.start_datetime && new Date(event.start_datetime) > new Date() ? 'Upcoming' : 'Past'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[13px] sm:text-sm font-medium">
                          <a
                            href={`/events/${event.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-teal-600 hover:text-teal-900"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
      </PullToRefresh>
      <MobileNavWrapper user={user} />
    </div>
  )
}
