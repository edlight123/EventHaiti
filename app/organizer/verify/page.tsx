import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import VerificationFlow from './VerificationFlow'

export const revalidate = 0

export default async function VerifyOrganizerPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const supabase = await createClient()
  const allUsers = await supabase.from('users').select('*')
  const userData = allUsers.data?.find((u: any) => u.id === user.id)

  console.log('Verify page - User data:', userData)
  console.log('Is verified:', userData?.is_verified)

  // Check for existing verification request - simplified query without ordering
  const { data: existingRequests } = await supabase
    .from('verification_requests')
    .select('*')
    .eq('user_id', user.id)

  // Sort in memory instead of in query to avoid index requirement
  const sortedRequests = existingRequests?.sort((a: any, b: any) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const existingRequest = sortedRequests?.[0]
  
  console.log('Existing verification request:', existingRequest)

  // If already verified (check both is_verified field and verification_status), redirect to events
  if (userData?.is_verified === true || userData?.verification_status === 'approved') {
    redirect('/organizer/events')
  }

  // If verification is pending (check both request status and user verification_status), show pending status
  if ((existingRequest && existingRequest.status === 'pending') || userData?.verification_status === 'pending') {
    return (
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} />
        
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8">
            <div className="text-center mb-6 md:mb-8">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
                <svg className="w-7 h-7 md:w-8 md:h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Verification Pending
              </h1>
              <p className="text-[13px] md:text-base text-gray-600">
                Your verification documents have been submitted and are under review.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
              <h3 className="font-semibold text-[13px] md:text-base text-yellow-900 mb-2">What happens next?</h3>
              <ul className="space-y-2 text-[13px] md:text-sm text-yellow-800">
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Our team will review your documents within 24-48 hours</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>You&apos;ll receive an email notification once your account is approved</span>
                </li>
                <li className="flex items-start">
                  <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Once approved, you can start creating and publishing events</span>
                </li>
              </ul>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 md:p-6">
              <h3 className="font-semibold text-[13px] md:text-base text-gray-900 mb-3">Verification Details</h3>
              <dl className="space-y-2 text-[13px] md:text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Submitted:</dt>
                  <dd className="text-gray-900 font-medium">
                    {new Date(existingRequest.created_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Status:</dt>
                  <dd>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      Pending Review
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="mt-6 md:mt-8 text-center">
              <a
                href="/"
                className="text-teal-600 hover:text-teal-700 text-[13px] md:text-base font-medium"
              >
                ← Back to Home
              </a>
            </div>
          </div>
        </div>

        <MobileNavWrapper user={user} />
      </div>
    )
  }

  // If rejected, allow resubmission
  const wasRejected = existingRequest && existingRequest.status === 'rejected'

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />
      
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-8">
          {wasRejected && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 md:p-4 mb-6 md:mb-8">
              <h3 className="font-semibold text-[13px] md:text-base text-red-900 mb-2">Previous Application Rejected</h3>
              <p className="text-[13px] md:text-sm text-red-800 mb-2">{existingRequest.admin_notes || 'Please review your documents and resubmit.'}</p>
            </div>
          )}
          
          <div className="text-center mb-6 md:mb-8">
            <div className="w-14 h-14 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 md:mb-4">
              <svg className="w-7 h-7 md:w-8 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {wasRejected ? 'Resubmit Verification' : 'Verify Your Identity'}
            </h1>
            <p className="text-[13px] md:text-base text-gray-600">
              To create events on EventHaiti, we need to verify your identity. This helps keep our community safe and trustworthy.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 md:mb-8">
            <h3 className="font-semibold text-[13px] md:text-base text-blue-900 mb-2">You&apos;ll need:</h3>
            <ul className="space-y-1 text-[13px] md:text-sm text-blue-800">
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Valid Haitian National ID Card
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Good lighting for clear photos
              </li>
              <li className="flex items-center">
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Camera access for facial verification
              </li>
            </ul>
          </div>

          <VerificationFlow userId={user.id} />
        </div>
      </div>

      <MobileNavWrapper user={user} />
    </div>
  )
}
