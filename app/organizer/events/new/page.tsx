import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import { redirect } from 'next/navigation'
import EventForm from '../EventForm'
import { createClient } from '@/lib/firebase-db/server'
import Link from 'next/link'

export default async function NewEventPage() {
  const { user, error } = await requireAuth()

  if (error || !user) {
    redirect('/auth/login')
  }

  // Check verification status
  const supabase = await createClient()
  const allUsers = await supabase.from('users').select('*')
  const userData = allUsers.data?.find((u: any) => u.id === user.id)

  console.log('New event page - User data:', userData)
  console.log('Is verified:', userData?.is_verified)
  console.log('Verification status:', userData?.verification_status)

  // Check for pending verification request - simplified query without ordering
  let verificationStatus = userData?.verification_status
  if (userData && !userData.is_verified) {
    const { data: verificationRequests } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('user_id', user.id)
    
    // Sort in memory instead of in query to avoid index requirement
    const sortedRequests = verificationRequests?.sort((a: any, b: any) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    const verificationRequest = sortedRequests?.[0]
    
    console.log('Verification request:', verificationRequest)
    
    // Update status from request if exists
    if (verificationRequest) {
      verificationStatus = verificationRequest.status
      console.log('Updated verification status to:', verificationStatus)
    }
  }

  // If not verified, redirect to verification page
  if (!userData?.is_verified) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar user={user} />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {verificationStatus === 'pending' ? 'Verification Pending' : 'Verification Required'}
              </h1>
              
              {verificationStatus === 'pending' ? (
                <>
                  <p className="text-gray-600 mb-6">
                    Your verification request is being reviewed. This usually takes 24-48 hours.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                      You&apos;ll receive an email once your account is verified. Thank you for your patience!
                    </p>
                  </div>
                  <Link
                    href="/organizer/events"
                    className="inline-block px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium"
                  >
                    Back to Dashboard
                  </Link>
                </>
              ) : verificationStatus === 'rejected' ? (
                <>
                  <p className="text-gray-600 mb-6">
                    Unfortunately, your verification request was not approved. Please try again with clearer photos.
                  </p>
                  <Link
                    href="/organizer/verify"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Verify Your Account
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-gray-600 mb-6">
                    To create events on EventHaiti, you need to verify your identity first. This helps keep our community safe and trustworthy.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                    <h3 className="font-semibold text-blue-900 mb-2">What you&apos;ll need:</h3>
                    <ul className="space-y-1 text-sm text-blue-800">
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
                        Camera access for photos
                      </li>
                      <li className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        5 minutes of your time
                      </li>
                    </ul>
                  </div>
                  <Link
                    href="/organizer/verify"
                    className="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
                  >
                    Start Verification
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Create New Event</h1>
        <EventForm userId={user.id} />
      </div>
    </div>
  )
}
