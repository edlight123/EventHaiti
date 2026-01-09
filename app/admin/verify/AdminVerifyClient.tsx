'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import VerificationRequestReview from './VerificationRequestReview'
import VerifyOrganizerForm from './VerifyOrganizerForm'

type AdminVerifyClientProps = {
  requestsWithUsers: any[]
  organizers: any[]
}

export default function AdminVerifyClient({ requestsWithUsers, organizers }: AdminVerifyClientProps) {
  const { t } = useTranslation('admin')
  const router = useRouter()
  const searchParams = useSearchParams()

  const requestedStatusRaw = (searchParams.get('status') || 'pending').toLowerCase()
  const supported = new Set(['pending', 'changes_requested', 'approved', 'all'])
  const requestedStatus = supported.has(requestedStatusRaw) ? requestedStatusRaw : 'pending'

  const filteredRequests = useMemo(() => {
    const isPendingLike = (status: string) => {
      const s = (status || '').toLowerCase()
      return s === 'pending' || s === 'pending_review' || s === 'in_review' || s === 'in_progress'
    }

    if (requestedStatus === 'all') return requestsWithUsers
    if (requestedStatus === 'pending') return requestsWithUsers.filter((r: any) => isPendingLike(r.status))
    return requestsWithUsers.filter((r: any) => String(r.status || '').toLowerCase() === requestedStatus)
  }, [requestedStatus, requestsWithUsers])

  const setStatus = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'pending') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    const query = params.toString()
    router.push(query ? `/admin/verify?${query}` : '/admin/verify')
  }

  const tabs: Array<{ key: string; label: string }> = [
    { key: 'pending', label: t('verify.pending_requests') },
    { key: 'changes_requested', label: t('verify.changes_requested') },
    { key: 'approved', label: t('verify.approved') },
    { key: 'all', label: t('verify.all') },
  ]

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

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => {
            const active = requestedStatus === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setStatus(tab.key)}
                className={
                  active
                    ? 'px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-semibold bg-teal-600 text-white'
                    : 'px-3 py-1.5 rounded-full text-[13px] sm:text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        {filteredRequests.length === 0 ? (
          <p className="text-[13px] sm:text-base text-gray-500 text-center py-6 sm:py-8">
            {requestedStatus === 'pending' ? t('verify.no_pending') : t('verify.all_caught_up')}
          </p>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {filteredRequests.map((request: any) => (
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
        <details>
          <summary className="cursor-pointer select-none">
            <h2 className="inline text-xl sm:text-2xl font-bold text-gray-900">
              {t('verify.quick_toggle_title')}
            </h2>
            <p className="text-[13px] sm:text-base text-gray-600 mt-1 sm:mt-2">
              {t('verify.quick_toggle_subtitle')}
            </p>
          </summary>

          <div className="mt-6 sm:mt-8">
            <VerifyOrganizerForm organizers={organizers} />
          </div>
        </details>
      </div>
    </div>
  )
}
