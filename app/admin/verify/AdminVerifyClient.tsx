'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import VerificationRequestReview from './VerificationRequestReview'
import VerifyOrganizerForm from './VerifyOrganizerForm'

type AdminVerifyClientProps = {
  requestsWithUsers: any[]
  organizers: any[]
}

export default function AdminVerifyClient({ requestsWithUsers, organizers }: AdminVerifyClientProps) {
  const { t } = useTranslation('admin')

  const pendingRequests = requestsWithUsers.filter((r: any) => 
    r.status === 'pending' || r.status === 'pending_review' || r.status === 'in_review'
  )

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6">
        <Link href="/admin" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          {t('verify.back_to_dashboard')}
        </Link>
      </div>

      {/* Verification Requests Section */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8 mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
          {t('verify.title')}
        </h1>
        <p className="text-[13px] sm:text-base text-gray-600 mb-6 sm:mb-8">
          {t('verify.subtitle')}
        </p>

        {pendingRequests.length === 0 ? (
          <p className="text-[13px] sm:text-base text-gray-500 text-center py-6 sm:py-8">
            {t('verify.no_pending')}
          </p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {pendingRequests.map((request: any) => (
              <VerificationRequestReview
                key={request.id}
                request={request}
                user={request.user}
              />
            ))}
          </div>
        )}
      </div>

      {/* Quick Verification Toggle */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-8">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">
          {t('verify.quick_toggle_title')}
        </h2>
        <p className="text-[13px] sm:text-base text-gray-600 mb-6 sm:mb-8">
          {t('verify.quick_toggle_subtitle')}
        </p>

        <VerifyOrganizerForm organizers={organizers} />
      </div>
    </div>
  )
}
