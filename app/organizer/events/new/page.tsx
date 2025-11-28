import { requireAuth } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import PullToRefresh from '@/components/PullToRefresh'
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
  // If is_verified is undefined or false, check for verification requests
  if (userData && userData.is_verified !== true && userData.verification_status !== 'approved') {
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

  // If not verified (check both is_verified and verification_status), redirect to verification page
  if (userData?.is_verified !== true && userData?.verification_status !== 'approved') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-yellow-50 pb-mobile-nav">
        <Navbar user={user} />

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-16">
          <div className="bg-white rounded-xl md:rounded-3xl shadow-medium border border-yellow-200 p-6 md:p-10">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl md:rounded-2xl flex items-center justify-center mx-auto mb-4 md:mb-6 shadow-soft">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 md:mb-3">
                {verificationStatus === 'pending' ? '⏳ Verification Pending' : '🔒 Verification Required'}
              </h1>
              
              {verificationStatus === 'pending' ? (
                <>
                  <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 max-w-xl mx-auto">
                    Your verification request is being reviewed by our team. This usually takes 24-48 hours.
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl md:rounded-2xl p-5 md:p-6 mb-6 md:mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-blue-900 mb-1">What happens next?</p>
                        <p className="text-[13px] md:text-sm text-blue-800">
                          You&apos;ll receive an email once your account is verified. Thank you for your patience!
                        </p>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/organizer/events"
                    className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-soft hover:shadow-medium"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Dashboard
                  </Link>
                </>
              ) : verificationStatus === 'rejected' ? (
                <>
                  <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 max-w-xl mx-auto">
                    Unfortunately, your verification request was not approved. Please try again with clearer photos of your ID.
                  </p>
                  <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl md:rounded-2xl p-5 md:p-6 mb-6 md:mb-8">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 bg-red-500 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-red-900 mb-1">Common reasons for rejection:</p>
                        <ul className="text-[13px] md:text-sm text-red-800 space-y-1">
                          <li>• Photos are blurry or unclear</li>
                          <li>• ID card is not fully visible</li>
                          <li>• Selfie doesn&apos;t match ID photo</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/organizer/verify"
                    className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white rounded-xl font-bold transition-all shadow-soft hover:shadow-glow"
                  >
                    Try Again
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-base md:text-lg text-gray-600 mb-6 md:mb-8 max-w-xl mx-auto">
                    To create events on EventHaiti, you need to verify your identity first. This helps keep our community safe and trustworthy.
                  </p>
                  <div className="bg-gradient-to-r from-brand-50 to-accent-50 border border-brand-200 rounded-xl md:rounded-2xl p-6 md:p-8 mb-6 md:mb-8 text-left max-w-lg mx-auto">
                    <h3 className="font-bold text-brand-900 mb-4 text-lg flex items-center gap-2">
                      <svg className="w-6 h-6 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      What you&apos;ll need:
                    </h3>
                    <ul className="space-y-3 text-[13px] md:text-sm text-brand-800">
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Valid Haitian National ID Card</p>
                          <p className="text-gray-600">Make sure it&apos;s not expired</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">Camera Access</p>
                          <p className="text-gray-600">To take photos of your ID</p>
                        </div>
                      </li>
                      <li className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">5 Minutes</p>
                          <p className="text-gray-600">Quick and easy process</p>
                        </div>
                      </li>
                    </ul>
                  </div>
                  <Link
                    href="/organizer/verify"
                    className="inline-flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-brand-600 to-accent-600 hover:from-brand-700 hover:to-accent-700 text-white rounded-xl font-bold transition-all shadow-soft hover:shadow-glow text-base md:text-lg"
                  >
                    Start Verification
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        <MobileNavWrapper user={user} />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-brand-50 pb-mobile-nav">
      <Navbar user={user} />

      <PullToRefresh onRefresh={async () => {
        'use server'
        const { revalidatePath } = await import('next/cache')
        revalidatePath('/organizer/events/new')
      }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Header Section */}
          <div className="mb-6 md:mb-8">
            <div className="flex items-center gap-3 mb-2 md:mb-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-brand-500 to-accent-500 rounded-lg md:rounded-xl flex items-center justify-center shadow-glow">
                <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-brand-700 to-accent-700 bg-clip-text text-transparent">
                  Create New Event
                </h1>
                <p className="text-[13px] md:text-base text-gray-600 mt-1">Share your amazing event with the world</p>
              </div>
            </div>
          </div>

          <EventForm userId={user.id} />
        </div>
      </PullToRefresh>

      <MobileNavWrapper user={user} />
    </div>
  )
}
