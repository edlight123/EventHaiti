'use client'

import { useState } from 'react'

interface Organizer {
  id: string
  full_name: string
  email: string
  is_verified: boolean
  verification_status: 'none' | 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface Props {
  organizers: Organizer[]
}

export default function VerifyOrganizerForm({ organizers }: Props) {
  const [updating, setUpdating] = useState<string | null>(null)
  const [localOrganizers, setLocalOrganizers] = useState(organizers)

  const toggleVerification = async (organizerId: string, currentStatus: boolean) => {
    setUpdating(organizerId)

    try {
      const response = await fetch('/api/admin/verify-organizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerId,
          isVerified: !currentStatus,
        }),
      })

      if (!response.ok) throw new Error('Failed to update verification')

      // Update local state
      setLocalOrganizers(prev =>
        prev.map(org =>
          org.id === organizerId
            ? { 
                ...org, 
                is_verified: !currentStatus,
                verification_status: !currentStatus ? 'approved' : 'none'
              }
            : org
        )
      )
    } catch (error) {
      console.error('Error updating verification:', error)
      alert('Failed to update verification status')
    } finally {
      setUpdating(null)
    }
  }

  return (
    <div className="space-y-4">
      {localOrganizers.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No organizers found</p>
      ) : (
        localOrganizers.map(organizer => (
          <div
            key={organizer.id}
            className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{organizer.full_name}</h3>
                {organizer.verification_status === 'approved' && (
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <p className="text-sm text-gray-600">{organizer.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-gray-500">
                  Joined {new Date(organizer.created_at).toLocaleDateString()}
                </p>
                {organizer.verification_status && organizer.verification_status !== 'none' && (
                  <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                    organizer.verification_status === 'approved' ? 'bg-green-100 text-green-700' :
                    organizer.verification_status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    organizer.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {organizer.verification_status}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => toggleVerification(organizer.id, organizer.verification_status === 'approved')}
              disabled={updating === organizer.id}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                organizer.verification_status === 'approved'
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {updating === organizer.id
                ? 'Updating...'
                : organizer.verification_status === 'approved'
                ? 'Remove Verification'
                : 'Verify'}
            </button>
          </div>
        ))
      )}
    </div>
  )
}
