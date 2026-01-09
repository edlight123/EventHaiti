'use client'

import { useTranslation } from 'react-i18next'
import Link from 'next/link'
import { useState } from 'react'

type OrganizerDetailsProps = {
  organizerDetails: {
    id: string
    user: any
    organizer: any
    payoutConfig: any
    verificationRequest: any
    verificationDocs: any[]
    stats: {
      totalEvents: number
      publishedEvents: number
      ticketsSold: number
    }
  }
}

export default function OrganizerDetailsClient({ organizerDetails }: OrganizerDetailsProps) {
  const { t } = useTranslation('admin')
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const { id, user, organizer, payoutConfig, verificationRequest, verificationDocs, stats } = organizerDetails

  const handleToggleStatus = async (action: 'ban' | 'unban' | 'disable_posting' | 'enable_posting') => {
    if (!confirm(`Are you sure you want to ${action.replace('_', ' ')} this organizer?`)) {
      return
    }

    setIsUpdating(true)
    setMessage(null)

    try {
      const response = await fetch('/api/admin/organizer-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizerId: id, action })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update organizer')
      }

      setMessage({ type: 'success', text: data.message })
      // Refresh page to show updated data
      window.location.reload()
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setIsUpdating(false)
    }
  }

  const isBanned = user.status === 'banned'
  const canPost = user.can_create_events !== false

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
      {/* Breadcrumb */}
      <div className="mb-4 sm:mb-6">
        <Link href="/admin/organizers" className="text-teal-600 hover:text-teal-700 text-[13px] sm:text-sm font-medium">
          ← Back to Organizers
        </Link>
      </div>

      {/* Message */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-8 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {user.full_name || 'No name'}
            </h1>
            <p className="text-gray-600 mb-2">{user.email}</p>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                {user.role}
              </span>
              {user.verification_status === 'approved' && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                  ✓ Verified
                </span>
              )}
              {isBanned && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  ✕ Banned
                </span>
              )}
              {!canPost && (
                <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                  ⚠ Posting Disabled
                </span>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2 sm:min-w-[200px]">
            {isBanned ? (
              <button
                onClick={() => handleToggleStatus('unban')}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Unban Organizer
              </button>
            ) : (
              <button
                onClick={() => handleToggleStatus('ban')}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Ban Organizer
              </button>
            )}
            
            {canPost ? (
              <button
                onClick={() => handleToggleStatus('disable_posting')}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              >
                Disable Event Posting
              </button>
            ) : (
              <button
                onClick={() => handleToggleStatus('enable_posting')}
                disabled={isUpdating}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Enable Event Posting
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Published Events</p>
              <p className="text-2xl font-bold text-gray-900">{stats.publishedEvents}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-600">Tickets Sold</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ticketsSold}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Account Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">User ID</dt>
              <dd className="text-sm text-gray-900 font-mono">{id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="text-sm text-gray-900">{user.phone_number || 'Not provided'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Account Status</dt>
              <dd className="text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {isBanned ? 'Banned' : 'Active'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Can Create Events</dt>
              <dd className="text-sm">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                  canPost ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {canPost ? 'Yes' : 'No'}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Joined</dt>
              <dd className="text-sm text-gray-900">
                {user.created_at ? new Date(user.created_at).toLocaleString() : 'Unknown'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="text-sm text-gray-900">
                {user.updated_at ? new Date(user.updated_at).toLocaleString() : 'Unknown'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Bank Account & Verification */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Bank Account & Payouts
          </h2>
          
          {payoutConfig ? (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {payoutConfig.accountHolderName || 'N/A'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Account Holder</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    payoutConfig.verificationStatus === 'verified' 
                      ? 'bg-green-100 text-green-800' 
                      : payoutConfig.verificationStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {payoutConfig.verificationStatus || 'unverified'}
                  </span>
                </div>
                
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Bank</dt>
                    <dd className="text-gray-900 font-medium">{payoutConfig.bankName || 'N/A'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Account Number</dt>
                    <dd className="text-gray-900 font-mono">
                      {payoutConfig.accountNumber ? `****${payoutConfig.accountNumber.slice(-4)}` : 'N/A'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Currency</dt>
                    <dd className="text-gray-900">{payoutConfig.currency || 'N/A'}</dd>
                  </div>
                  {payoutConfig.verifiedAt && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Verified At</dt>
                      <dd className="text-gray-900 text-xs">
                        {new Date(payoutConfig.verifiedAt).toLocaleDateString()}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {payoutConfig.notes && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs font-medium text-blue-900 mb-1">Admin Notes</p>
                  <p className="text-sm text-blue-800">{payoutConfig.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="w-12 h-12 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-500">No bank account configured</p>
            </div>
          )}
        </div>

        {/* Verification Request */}
        {verificationRequest && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Verification Request
            </h2>
            
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="text-sm mt-1">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                    verificationRequest.status === 'approved' ? 'bg-green-100 text-green-800' :
                    verificationRequest.status === 'rejected' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {verificationRequest.status}
                  </span>
                </dd>
              </div>
              
              {verificationRequest.business_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Name</dt>
                  <dd className="text-sm text-gray-900">{verificationRequest.business_name}</dd>
                </div>
              )}
              
              {verificationRequest.business_type && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                  <dd className="text-sm text-gray-900">{verificationRequest.business_type}</dd>
                </div>
              )}
              
              <div>
                <dt className="text-sm font-medium text-gray-500">Submitted</dt>
                <dd className="text-sm text-gray-900">
                  {verificationRequest.submitted_at 
                    ? new Date(verificationRequest.submitted_at).toLocaleString()
                    : 'Unknown'}
                </dd>
              </div>
              
              {verificationRequest.reviewed_at && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Reviewed</dt>
                  <dd className="text-sm text-gray-900">
                    {new Date(verificationRequest.reviewed_at).toLocaleString()}
                  </dd>
                </div>
              )}
              
              {verificationRequest.rejection_reason && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rejection Reason</dt>
                  <dd className="text-sm text-red-800 bg-red-50 p-2 rounded">
                    {verificationRequest.rejection_reason}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        )}

        {/* Verification Documents */}
        {verificationDocs.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Verification Documents
            </h2>
            
            <div className="space-y-3">
              {verificationDocs.map((doc) => (
                <div key={doc.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{doc.type || doc.id}</p>
                      {doc.uploadedAt && (
                        <p className="text-xs text-gray-500 mt-1">
                          Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    {doc.url && (
                      <a 
                        href={doc.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                      >
                        View
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Organization Profile */}
        {organizer && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Organization Profile</h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {organizer.organization_name && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Organization Name</dt>
                  <dd className="text-sm text-gray-900 mt-1">{organizer.organization_name}</dd>
                </div>
              )}
              
              {organizer.business_type && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Business Type</dt>
                  <dd className="text-sm text-gray-900 mt-1">{organizer.business_type}</dd>
                </div>
              )}
              
              {organizer.website && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="text-sm text-gray-900 mt-1">
                    <a href={organizer.website} target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline">
                      {organizer.website}
                    </a>
                  </dd>
                </div>
              )}
              
              {organizer.description && (
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="text-sm text-gray-900 mt-1">{organizer.description}</dd>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
