import { createClient } from '@/lib/firebase-db/server'
import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { isDemoMode, DEMO_EVENTS } from '@/lib/demo'

export const revalidate = 0

export default async function OrganizerEventsPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  let events: any[] = []

  if (isDemoMode()) {
    // Use demo events
    events = DEMO_EVENTS
  } else {
    // Fetch real events from database
    const supabase = await createClient()
    const { data, error: fetchError } = await supabase
      .from('events')
      .select('*')
      .eq('organizer_id', user.id)
      .order('start_datetime', { ascending: false })
    
    console.log('Fetching events for user:', user.id)
    console.log('Events query result:', { data, error: fetchError })
    
    events = data || []
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900">My Events</h1>
          <Link
            href="/organizer/events/new"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
          >
            + Create Event
          </Link>
        </div>

        {/* Debug info */}
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
          <p><strong>User ID:</strong> {user.id}</p>
          <p><strong>Events found:</strong> {events.length}</p>
        </div>

        {events && events.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tickets
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-sm text-gray-500">{event.category}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {format(new Date(event.start_datetime), 'MMM d, yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {event.city}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <span className="font-semibold">{event.tickets_sold}</span> / {event.total_tickets}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        event.is_published
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {event.is_published ? 'Published' : 'Draft'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-medium space-x-3">
                      <Link
                        href={`/organizer/events/${event.id}`}
                        className="text-teal-700 hover:text-teal-800"
                      >
                        View
                      </Link>
                      <Link
                        href={`/organizer/events/${event.id}/edit`}
                        className="text-blue-700 hover:text-blue-800"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No events yet</h3>
            <p className="text-gray-600 mb-6">
              Create your first event to start selling tickets.
            </p>
            <Link
              href="/organizer/events/new"
              className="inline-block px-6 py-3 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-medium"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
