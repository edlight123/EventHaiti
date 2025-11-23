import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import VerifyOrganizerForm from './VerifyOrganizerForm'

export const revalidate = 0

export default async function AdminVerifyPage() {
  const user = await getCurrentUser()

  // Only allow specific admin users (you can add your email here)
  const ADMIN_EMAILS = ['admin@eventhaiti.com', 'your-email@example.com']
  
  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Fetch all verification requests
  const allRequests = await supabase.from('verification_requests').select('*')
  const verificationRequests = allRequests.data || []

  // Fetch all organizers for quick verification toggle
  const allUsers = await supabase.from('users').select('*')
  const organizers = allUsers.data?.filter((u: any) => u.role === 'organizer') || []

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Verification Requests Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Verification Requests
          </h1>
          <p className="text-gray-600 mb-8">
            Review pending organizer verification submissions
          </p>

          {verificationRequests.filter((r: any) => r.status === 'pending').length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending verification requests</p>
          ) : (
            <div className="space-y-4">
              {verificationRequests
                .filter((r: any) => r.status === 'pending')
                .map((request: any) => {
                  const requestUser = organizers.find((o: any) => o.id === request.user_id)
                  return (
                    <div key={request.id} className="border border-gray-200 rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900 text-lg">
                            {requestUser?.full_name || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600">{requestUser?.email}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Submitted {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full">
                          Pending Review
                        </span>
                      </div>

                      <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Note:</strong> In production, ID card and face photos would be displayed here for review.
                        </p>
                        <p className="text-xs text-gray-500">
                          Images stored but not displayed in this demo interface.
                        </p>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <button
                          onClick={() => {
                            // This would trigger an API call to approve
                            alert('Approve functionality to be implemented')
                          }}
                          className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            // This would trigger an API call to reject
                            alert('Reject functionality to be implemented')
                          }}
                          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {/* Quick Verification Toggle */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Quick Verification Toggle
          </h2>
          <p className="text-gray-600 mb-8">
            Manually manage verified status for organizers
          </p>

          <VerifyOrganizerForm organizers={organizers} />
        </div>
      </div>
    </div>
  )
}
