import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import VerifyOrganizerForm from './VerifyOrganizerForm'
import VerificationRequestReview from './VerificationRequestReview'

export const revalidate = 0

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@eventhaiti.com').split(',')

export default async function AdminVerifyPage() {
  const user = await getCurrentUser()

  if (!user || !ADMIN_EMAILS.includes(user.email || '')) {
    redirect('/')
  }

  const supabase = await createClient()
  
  // Fetch all verification requests
  const allRequests = await supabase
    .from('verification_requests')
    .select('*')
  const verificationRequests = allRequests.data || []

  // Fetch all users to match with verification requests
  const allUsers = await supabase.from('users').select('*')
  const users = allUsers.data || []

  // Manually join user data with verification requests
  const requestsWithUsers = verificationRequests.map((request: any) => {
    const requestUser = users.find((u: any) => u.id === request.user_id)
    return {
      ...request,
      user: requestUser
    }
  })

  // Filter organizers for quick verification toggle
  const organizers = users.filter((u: any) => u.role === 'organizer')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <div className="mb-6">
          <a href="/admin" className="text-teal-600 hover:text-teal-700 text-sm font-medium">
            ← Back to Admin Dashboard
          </a>
        </div>

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
            <div className="space-y-6">
              {requestsWithUsers
                .filter((r: any) => r.status === 'pending')
                .map((request: any) => {
                  return (
                    <VerificationRequestReview
                      key={request.id}
                      request={request}
                      user={request.user}
                    />
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
