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

export default async function AdminUsersPage() {
  const user = await getCurrentUser()

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()

  // Fetch all users
  const { data: users } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  const allUsers = users || []

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={true} />

      <PullToRefresh
        onRefresh={async () => {
          'use server'
          revalidatePath('/admin/users')
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="mb-4 sm:mb-6">
          <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
            ← Back to Admin Dashboard
          </Link>
        </div>

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Users</h1>
          <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">View and manage all users on the platform</p>
        </div>

        {/* Stats */}
        <div className="flex overflow-x-auto gap-3 sm:gap-6 mb-6 sm:mb-8 pb-2 snap-x snap-mandatory md:grid md:grid-cols-3 scrollbar-hide">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
            <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Total Users</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">{allUsers.length}</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
            <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Organizers</div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
              {allUsers.filter((u: any) => u.role === 'organizer').length}
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 min-w-[180px] snap-start flex-shrink-0">
            <div className="text-[11px] sm:text-sm font-medium text-gray-600 uppercase tracking-wide">Verified Organizers</div>
            <div className="text-2xl sm:text-3xl font-bold text-teal-600 mt-1 sm:mt-2">
              {allUsers.filter((u: any) => u.is_verified).length}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {allUsers.length === 0 ? (
            <div className="p-8 sm:p-12 text-center">
              <p className="text-[13px] sm:text-base text-gray-500">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-3 sm:px-6 py-2.5 sm:py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Verification
                    </th>
                    <th className="hidden sm:table-cell px-6 py-3 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">
                      Joined
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allUsers.map((u: any) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center">
                          <div className="min-w-0">
                            <div className="text-[13px] sm:text-sm font-medium text-gray-900 truncate">
                              {u.full_name || 'No name'}
                            </div>
                            <div className="text-[11px] sm:text-[13px] text-gray-500 truncate">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full ${
                          u.role === 'organizer'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {u.role || 'attendee'}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        {u.role === 'organizer' ? (
                          u.is_verified ? (
                            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              ✓ Verified
                            </span>
                          ) : (
                            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 inline-flex text-[10px] sm:text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {u.verification_status === 'pending' ? 'Pending' : 'Not Verified'}
                            </span>
                          )
                        ) : (
                          <span className="text-[11px] sm:text-[13px] text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-6 py-4 text-[13px] text-gray-500 whitespace-nowrap">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      </PullToRefresh>
      <MobileNavWrapper user={user} />
    </div>
  )
}
