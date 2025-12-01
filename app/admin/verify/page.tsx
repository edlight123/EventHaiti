import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
import VerifyOrganizerForm from './VerifyOrganizerForm'
import VerificationRequestReview from './VerificationRequestReview'
import { revalidatePath } from 'next/cache'

export const revalidate = 0

export default async function AdminVerifyPage() {
  const user = await getCurrentUser()

  const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'admin@eventhaiti.com').split(',')

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
  // Note: Handle both old format (user_id field) and new format (userId field/document ID)
  const requestsWithUsers = verificationRequests.map((request: any) => {
    const userId = request.userId || request.user_id || request.id
    const requestUser = users.find((u: any) => u.id === userId)
    return {
      ...request,
      userId, // Normalize to always have userId
      user: requestUser
    }
  })

  // Filter organizers for quick verification toggle
  const organizers = users.filter((u: any) => u.role === 'organizer')

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} isAdmin={isAdmin(user?.email)} />
      
      <PullToRefresh
        onRefresh={async () => {
          'use server'
          revalidatePath('/admin/verify')
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {/* Breadcrumb */}
        <div className="mb-4 sm:mb-6">
          <a href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
            ← Back to Admin Dashboard
          </a>
        </div>

        {/* Verification Requests Section */}
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            Verification Requests
          </h1>
          <p className="text-[13px] sm:text-base text-gray-600 mb-6 sm:mb-8">
            Review pending organizer verification submissions
          </p>

          {verificationRequests.filter((r: any) => 
            r.status === 'pending_review' || r.status === 'in_review'
          ).length === 0 ? (
            <p className="text-[13px] sm:text-base text-gray-500 text-center py-6 sm:py-8">No pending verification requests</p>
          ) : (
            <div className="space-y-4 sm:space-y-6">
              {requestsWithUsers
                .filter((r: any) => 
                  r.status === 'pending_review' || r.status === 'in_review'
                )
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
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
            Quick Verification Toggle
          </h2>
          <p className="text-[13px] sm:text-base text-gray-600 mb-6 sm:mb-8">
            Manually manage verified status for organizers
          </p>

          <VerifyOrganizerForm organizers={organizers} />
        </div>
      </div>
      </PullToRefresh>
      <MobileNavWrapper user={user} />
    </div>
  )
}
