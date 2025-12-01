import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import EventFormPremium from '../EventFormPremium'
import { createClient } from '@/lib/firebase-db/server'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { isAdmin } from '@/lib/admin'

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

  // Check verification_requests collection where document ID is the userId
  let verificationStatus = userData?.verification_status
  if (userData && userData.is_verified !== true && userData.verification_status !== 'approved') {
    const { data: verificationRequest } = await supabase
      .from('verification_requests')
      .select('*')
      .eq('userId', user.id)
      .single()
    
    console.log('Verification request:', verificationRequest)
    
    // Update status from request if exists
    if (verificationRequest) {
      verificationStatus = verificationRequest.status
      console.log('Updated verification status to:', verificationStatus)
    }
  }

  // If not verified and not pending/in_review, redirect to verification page
  const isPendingOrInReview = verificationStatus === 'pending_review' || verificationStatus === 'in_review'
  if (userData?.is_verified !== true && userData?.verification_status !== 'approved' && !isPendingOrInReview) {
    return (
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-yellow-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                {verificationStatus === 'rejected' || verificationStatus === 'changes_requested' ? '🔒 Verification Required' : '🔒 Verification Required'}
              </h1>
              
              {verificationStatus === 'rejected' || verificationStatus === 'changes_requested' ? (
                <>
                  <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
                    Unfortunately, your verification request was not approved. Please try again with clearer photos of your ID.
                  </p>
                  <Link
                    href="/organizer/verify"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
                  >
                    Try Again
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
                    To create events on EventHaiti, you need to verify your identity first. This helps keep our community safe and trustworthy.
                  </p>
                  <Link
                    href="/organizer/verify"
                    className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
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
      </div>
    )
  }

  // If pending/in_review, show pending message
  if (isPendingOrInReview) {
    return (
      <div className="min-h-screen bg-gray-50 pb-mobile-nav">
        <Navbar user={user} isAdmin={isAdmin(user?.email)} />
        <div className="max-w-3xl mx-auto px-4 py-8 md:py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 md:w-10 md:h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                ⏳ Verification Pending
              </h1>
              
              <p className="text-base text-gray-600 mb-8 max-w-xl mx-auto">
                Your verification request is being reviewed by our team. This usually takes 24-48 hours. You&apos;ll receive an email once your account is verified.
              </p>
              
              <Link
                href="/organizer"
                className="inline-flex items-center gap-2 px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-bold transition-all shadow-md hover:shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return <EventFormPremium userId={user.id} />
}
