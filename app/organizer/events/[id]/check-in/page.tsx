import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import CheckInScanner from './CheckInScanner'

export const revalidate = 0

export default async function CheckInPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const user = await getCurrentUser()
  const { id } = await params

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={null} />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Please sign in to manage check-ins
            </h2>
            <Link
              href="/auth/login"
              className="text-orange-600 hover:text-orange-700 font-medium"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const supabase = await createClient()

  // Fetch all events and find the one we need
  const { data: allEvents } = await supabase
    .from('events')
    .select('*')

  const event = allEvents?.find((e: any) => e.id === id)

  if (!event) {
    notFound()
  }

  if (event.organizer_id !== user.id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Unauthorized
            </h2>
            <p className="text-gray-600">
              You don&apos;t have permission to manage check-ins for this event.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Fetch all tickets and users
  const { data: allTickets } = await supabase
    .from('tickets')
    .select('*')

  const { data: allUsers } = await supabase
    .from('users')
    .select('*')

  // Filter tickets for this event and combine with user data
  const eventTickets = (allTickets || []).filter((t: any) => t.event_id === id)
  const usersMap = new Map((allUsers || []).map((u: any) => [u.id, u]))

  const tickets = eventTickets.map((ticket: any) => ({
    ...ticket,
    attendee: usersMap.get(ticket.attendee_id) || { full_name: 'Unknown', email: 'N/A' }
  }))
  const totalTickets = tickets.length
  const checkedIn = tickets.filter((t: any) => t.checked_in_at).length
  const pending = totalTickets - checkedIn
  const invalidTickets = tickets.filter((t: any) => t.status !== 'valid').length

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link
            href={`/organizer/events/${id}`}
            className="text-orange-600 hover:text-orange-700 text-sm font-medium mb-2 inline-block"
          >
            ← Back to Event Details
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          <p className="text-gray-600 mt-1">Check-In Management</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Total Tickets</h3>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-gray-900">{totalTickets}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Checked In</h3>
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-green-700">{checkedIn}</p>
            <p className="text-sm text-gray-500 mt-1">
              {totalTickets > 0 ? ((checkedIn / totalTickets) * 100).toFixed(0) : 0}%
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Pending</h3>
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-orange-700">{pending}</p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-600">Invalid</h3>
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-3xl font-bold text-red-700">{invalidTickets}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Scanner */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Scan QR Code</h2>
            <CheckInScanner eventId={id} />
          </div>

          {/* Recent Check-Ins */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Check-Ins</h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {tickets
                .filter((t: any) => t.checked_in_at)
                .sort((a: any, b: any) => new Date(b.checked_in_at).getTime() - new Date(a.checked_in_at).getTime())
                .slice(0, 20)
                .map((ticket: any) => (
                  <div key={ticket.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{ticket.attendee.full_name}</p>
                      <p className="text-sm text-gray-600">{ticket.attendee.email}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">
                        {new Date(ticket.checked_in_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              {checkedIn === 0 && (
                <p className="text-center py-8 text-gray-500">No check-ins yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
