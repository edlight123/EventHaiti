'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Props {
  request: any
  user: any
}

export default function VerificationRequestReview({ request, user }: Props) {
  const router = useRouter()
  const [reviewing, setReviewing] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  // Normalize data format (handle both old and new formats)
  const getImageUrl = (path: string) => {
    if (!path) return null
    // If it's already a full URL, return it
    if (path.startsWith('http')) return path
    // Otherwise, construct Firebase Storage URL with proper encoding
    // Split by / and encode each segment
    const segments = path.split('/').map(segment => encodeURIComponent(segment))
    const encodedPath = segments.join('%2F')
    return `https://firebasestorage.googleapis.com/v0/b/event-haiti.firebasestorage.app/o/${encodedPath}?alt=media`
  }

  const idFrontUrl = request.id_front_url || getImageUrl(request.files?.governmentId?.front)
  const idBackUrl = request.id_back_url || getImageUrl(request.files?.governmentId?.back)
  const facePhotoUrl = request.face_photo_url || getImageUrl(request.files?.selfie?.path)

  console.log('Verification images:', { idFrontUrl, idBackUrl, facePhotoUrl })
  console.log('Request files:', request.files)

  // Normalize date
  const submittedDate = request.submittedAt?._seconds 
    ? new Date(request.submittedAt._seconds * 1000)
    : request.createdAt?._seconds
    ? new Date(request.createdAt._seconds * 1000)
    : request.created_at 
    ? new Date(request.created_at)
    : null

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this verification?')) return

    setReviewing(true)
    try {
      const response = await fetch('/api/admin/review-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          status: 'approved',
        }),
      })

      if (!response.ok) throw new Error('Failed to approve')

      alert('✅ Verification approved! Organizer has been notified.')
      router.refresh()
    } catch (error) {
      console.error('Error approving:', error)
      alert('Failed to approve verification')
    } finally {
      setReviewing(false)
    }
  }

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection')
      return
    }

    setReviewing(true)
    try {
      const response = await fetch('/api/admin/review-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      })

      if (!response.ok) throw new Error('Failed to reject')

      alert('Verification rejected. Organizer has been notified.')
      setShowRejectModal(false)
      router.refresh()
    } catch (error) {
      console.error('Error rejecting:', error)
      alert('Failed to reject verification')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <>
      <div className="border border-gray-200 rounded-lg p-4 sm:p-6 bg-white">
        <div className="flex items-start justify-between mb-3 sm:mb-4 gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900 text-base sm:text-lg truncate">
              {user?.full_name || 'Unknown User'}
            </h3>
            <p className="text-[13px] sm:text-sm text-gray-600 truncate">{user?.email}</p>
            <p className="text-[11px] sm:text-xs text-gray-500 mt-1">
              {submittedDate ? (
                <>
                  Submitted {submittedDate.toLocaleDateString()} at{' '}
                  {submittedDate.toLocaleTimeString()}
                </>
              ) : (
                'Submission date not available'
              )}
            </p>
          </div>
          <span className="px-2 sm:px-3 py-1 bg-yellow-100 text-yellow-800 text-[10px] sm:text-xs font-semibold rounded-full whitespace-nowrap">
            Pending Review
          </span>
        </div>

        {/* Verification Images */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* ID Front */}
          {idFrontUrl && (
            <div>
              <p className="text-[11px] sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">ID Card - Front</p>
              <div
                onClick={() => setSelectedImage(idFrontUrl)}
                className="relative aspect-[1.586/1] bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200"
              >
                <Image
                  src={idFrontUrl}
                  alt="ID Front"
                  fill
                  sizes="(max-width: 640px) 33vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity">
                  <svg className="w-8 h-8 text-white opacity-0 hover:opacity-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ID Back */}
          {idBackUrl && (
            <div>
              <p className="text-[11px] sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">ID Card - Back</p>
              <div
                onClick={() => setSelectedImage(idBackUrl)}
                className="relative aspect-[1.586/1] bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200"
              >
                <Image
                  src={idBackUrl}
                  alt="ID Back"
                  fill
                  sizes="(max-width: 640px) 33vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Face Photo */}
          {facePhotoUrl && (
            <div>
              <p className="text-[11px] sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Selfie Photo</p>
              <div
                onClick={() => setSelectedImage(facePhotoUrl)}
                className="relative aspect-[1.586/1] bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity border-2 border-gray-200"
              >
                <Image
                  src={facePhotoUrl}
                  alt="Face Photo"
                  fill
                  sizes="(max-width: 640px) 33vw, 33vw"
                  className="object-cover"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={handleApprove}
            disabled={reviewing}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            {reviewing ? 'Processing...' : '✅ Approve'}
          </button>
          <button
            onClick={() => setShowRejectModal(true)}
            disabled={reviewing}
            className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
          >
            ❌ Reject
          </button>
        </div>
      </div>

      {/* Image Lightbox */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
        >
          <div className="relative max-w-4xl max-h-full">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-white rounded-full p-2 hover:bg-gray-100"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative w-[90vw] max-w-4xl h-[80vh]">
              <Image
                src={selectedImage}
                alt="Verification document"
                fill
                className="object-contain rounded-lg"
                sizes="90vw"
                onClick={(e) => e.stopPropagation()}
                unoptimized
              />
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-4 sm:p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-3 sm:mb-4">Reject Verification</h3>
            <p className="text-[13px] sm:text-sm text-gray-600 mb-3 sm:mb-4">
              Please provide a reason for rejecting this verification. The organizer will receive this in an email.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g., ID card photo is blurry, face not clearly visible, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent mb-3 sm:mb-4 text-[15px] sm:text-base min-h-[44px]"
              rows={4}
            />
            <div className="flex gap-2 sm:gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false)
                  setRejectionReason('')
                }}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-[13px] sm:text-base font-medium text-gray-700 hover:bg-gray-50 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={reviewing || !rejectionReason.trim()}
                className="flex-1 px-3 sm:px-4 py-2 sm:py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[13px] sm:text-base font-medium disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
              >
                {reviewing ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
