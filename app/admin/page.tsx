import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'

export const revalidate = 0

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',')

export default async function AdminDashboard() {
  const user = await getCurrentUser()

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch platform statistics
  const { data: users } = await supabase.from('users').select('id')
  const totalUsers = users?.length || 0

  const { data: events } = await supabase.from('events').select('id')
  const totalEvents = events?.length || 0

  const { data: tickets } = await supabase.from('tickets').select('id, price_paid, status')
  const totalTickets = tickets?.length || 0

  const revenue = tickets
    ?.filter((t: any) => t.status === 'confirmed')
    ?.reduce((sum: number, t: any) => sum + (t.price_paid || 0), 0) || 0

  // Verification requests
  const { data: verificationRequests } = await supabase
    .from('verification_requests')
    .select('id, status')
  
  const pendingVerifications = verificationRequests?.filter(r => r.status === 'pending').length || 0

  // Recent events
  const { data: recentEvents } = await supabase
    .from('events')
    .select(`
      id,
      title,
      start_datetime,
      price,
      created_at,
      users (
        full_name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-2">Platform overview and management</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Users</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalUsers.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Events</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalEvents.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Tickets Sold</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{totalTickets.toLocaleString()}</div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm font-medium text-gray-600">Total Revenue</div>
            <div className="text-3xl font-bold text-teal-600 mt-2">${revenue.toLocaleString()}</div>
          </div>

          <a
            href="/admin/verify"
            className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl shadow-sm border-2 border-yellow-400 p-6 hover:border-yellow-500 transition-all hover:shadow-md"
          >
            <div className="text-sm font-medium text-yellow-800">Pending Verifications</div>
            <div className="text-3xl font-bold text-yellow-900 mt-2">{pendingVerifications}</div>
            {pendingVerifications > 0 && (
              <div className="text-xs text-yellow-700 mt-2 font-medium">→ Click to Review</div>
            )}
          </a>
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Events</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentEvents?.map((event: any) => (
                  <tr key={event.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{event.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {event.users?.full_name || event.users?.email || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(event.start_datetime).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">${event.price.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        new Date(event.start_datetime) > new Date()
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {new Date(event.start_datetime) > new Date() ? 'Upcoming' : 'Past'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admin Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <a
            href="/admin/verify"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-teal-600 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Verify Organizers</h3>
              {pendingVerifications > 0 && (
                <span className="bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {pendingVerifications}
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm">Review identity verification requests</p>
          </a>

          <a
            href="/admin/events"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Events</h3>
            <p className="text-gray-600 text-sm">Review and moderate events</p>
          </a>

          <a
            href="/admin/users"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Manage Users</h3>
            <p className="text-gray-600 text-sm">View and moderate user accounts</p>
          </a>

          <a
            href="/admin/analytics"
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-teal-600 transition-colors"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analytics</h3>
            <p className="text-gray-600 text-sm">Platform insights and reports</p>
          </a>
        </div>
      </div>
    </div>
  )
}
