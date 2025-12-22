/**
 * Organizer Verification Page
 * Premium step-by-step verification flow
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import Navbar from '@/components/Navbar'
import MobileNavWrapper from '@/components/MobileNavWrapper'
import Link from 'next/link'
import VerificationStatusHero from '@/components/organizer/verification/VerificationStatusHero'
import VerificationStepper from '@/components/organizer/verification/VerificationStepper'
import ReviewSubmitPanel from '@/components/organizer/verification/ReviewSubmitPanel'
import OrganizerInfoForm from '@/components/organizer/verification/forms/OrganizerInfoForm'
import GovernmentIDForm from '@/components/organizer/verification/forms/GovernmentIDForm'
import SelfieForm from '@/components/organizer/verification/forms/SelfieForm'
import BusinessDetailsForm from '@/components/organizer/verification/forms/BusinessDetailsForm'
import {
  getVerificationRequest,
  initializeVerificationRequest,
  updateVerificationStep,
  submitVerificationForReview,
  restartVerification,
  calculateCompletionPercentage,
  canSubmitForReview,
  type VerificationRequest
} from '@/lib/verification'

type ViewMode = 'overview' | 'organizerInfo' | 'governmentId' | 'selfie' | 'businessDetails' | 'review'

export default function VerifyOrganizerPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [restarting, setRestarting] = useState(false)
  const [request, setRequest] = useState<VerificationRequest | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [error, setError] = useState('')

  // Load verification request
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        router.push('/auth/login?redirect=/organizer/verify')
        return
      }

      setUser({
        id: authUser.uid,
        full_name: authUser.displayName || '',
        email: authUser.email || '',
        role: 'organizer' as const
      })

      try {
        let verificationRequest = await getVerificationRequest(authUser.uid)
        
        // Initialize if doesn't exist
        if (!verificationRequest) {
          verificationRequest = await initializeVerificationRequest(authUser.uid)
        } else {
          // Migrate old payout step to optional (persisted so submit validation won't be blocked).
          if (verificationRequest.steps.payoutSetup?.required === true) {
            await updateVerificationStep(authUser.uid, 'payoutSetup', {
              required: false,
              missingFields: [],
              description: 'Configure how you receive payments (can be set up later)'
            })
            verificationRequest = (await getVerificationRequest(authUser.uid)) || verificationRequest
          }
        }

        setRequest(verificationRequest)
      } catch (err: any) {
        console.error('Error loading verification:', err)
        setError(err.message || 'Failed to load verification data')
      } finally {
        setLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  // Reload verification data
  const reloadRequest = async () => {
    if (!user) return
    
    try {
      const freshRequest = await getVerificationRequest(user.id)
      if (freshRequest) {
        setRequest(freshRequest)
      }
    } catch (err: any) {
      console.error('Error reloading verification:', err)
    }
  }

  const dismissError = () => setError('')

  // Handle step completion
  const handleSaveOrganizerInfo = async (data: Record<string, any>) => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'organizerInfo', {
      status: 'complete',
      fields: data,
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveGovernmentID = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'governmentId', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveSelfie = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'selfie', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSaveBusinessDetails = async (data: Record<string, any>) => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'businessDetails', {
      status: 'complete',
      fields: data,
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSkipBusinessDetails = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'businessDetails', {
      status: 'complete',
      fields: {},
      missingFields: []
    })

    await reloadRequest()
    setViewMode('overview')
  }

  const handleSkipPayoutSetup = async () => {
    if (!user || !request) return

    await updateVerificationStep(user.id, 'payoutSetup', {
      status: 'complete',
      fields: { skipped: true },
      missingFields: []
    })

    await reloadRequest()
  }

  const handleSubmit = async () => {
    if (!user || !request) return

    try {
      setError('')
      await submitVerificationForReview(user.id)
      await reloadRequest()
      setViewMode('overview')
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification')
    }
  }

  const handleRestart = async () => {
    if (!user || !request) return

    try {
      setRestarting(true)
      setError('')
      await restartVerification(user.id)
      await reloadRequest()
      setViewMode('overview')
    } catch (err: any) {
      setError(err.message || 'Failed to restart verification')
    } finally {
      setRestarting(false)
    }
  }

  const handleEditStep = (stepId: keyof VerificationRequest['steps']) => {
    // During pending/review, keep the flow read-only and show the submitted details instead.
    if (['pending', 'in_review'].includes(request?.status || '')) {
      setViewMode('review')
      return
    }

    const viewModes: Record<string, ViewMode> = {
      organizerInfo: 'organizerInfo',
      governmentId: 'governmentId',
      selfie: 'selfie',
      businessDetails: 'businessDetails',
      payoutSetup: 'overview' // Links to /organizer/settings/payouts
    }

    setViewMode(viewModes[stepId] || 'overview')
  }

  if (loading || restarting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">
            {restarting ? 'Resetting verification...' : 'Loading verification...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && !request) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-lg font-bold text-red-900 mb-2">Error Loading Verification</h2>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!request || !user) {
    return null
  }

  const completionPercentage = calculateCompletionPercentage(request)
  const isReadOnly = ['pending', 'in_review'].includes(request.status)
  const canSubmit = canSubmitForReview(request)

  return (
    <div className="min-h-screen bg-gray-50 pb-mobile-nav">
      <Navbar user={user} />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <Link href="/organizer" className="hover:text-gray-900">
              Organizer
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-gray-900 font-medium">Verification</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Verification</h1>
          <p className="text-gray-600 mt-1">
            Verify your identity to publish paid events and receive payouts.
          </p>
        </div>

        {/* Status Hero */}
        <VerificationStatusHero
          status={request.status}
          completionPercentage={completionPercentage}
          reviewNotes={request.reviewNotes}
          onContinue={() => setViewMode('overview')}
          onRestart={handleRestart}
          isRestarting={restarting}
        />

        {error ? (
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-red-900">Something went wrong</div>
                <div className="text-sm text-red-700 mt-1">{error}</div>
              </div>
              <button
                onClick={dismissError}
                className="text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {/* Main Content */}
        {viewMode === 'overview' && (
          <div className="space-y-6">
            <VerificationStepper
              request={request}
              onEditStep={handleEditStep}
              onSkipPayoutSetup={handleSkipPayoutSetup}
              isReadOnly={isReadOnly}
            />

            {!isReadOnly && canSubmit && (
              <div className="text-center">
                <button
                  onClick={() => setViewMode('review')}
                  className="px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-lg font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                >
                  Review & Submit →
                </button>
              </div>
            )}
          </div>
        )}

        {viewMode === 'organizerInfo' && (
          <OrganizerInfoForm
            initialData={request.steps.organizerInfo.fields}
            onSave={handleSaveOrganizerInfo}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'governmentId' && (
          <GovernmentIDForm
            userId={user.id}
            initialData={{
              frontPath: request.files.governmentId?.front,
              backPath: request.files.governmentId?.back
            }}
            onSave={handleSaveGovernmentID}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'selfie' && (
          <SelfieForm
            userId={user.id}
            initialData={{
              selfiePath: request.files.selfie?.path
            }}
            onSave={handleSaveSelfie}
            onCancel={() => setViewMode('overview')}
          />
        )}

        {viewMode === 'businessDetails' && (
          <BusinessDetailsForm
            initialData={request.steps.businessDetails.fields}
            onSave={handleSaveBusinessDetails}
            onCancel={() => setViewMode('overview')}
            onSkip={handleSkipBusinessDetails}
          />
        )}

        {viewMode === 'review' && (
          <ReviewSubmitPanel
            request={request}
            onSubmit={handleSubmit}
            onBack={() => setViewMode('overview')}
            isReadOnly={isReadOnly}
          />
        )}
      </div>

      <MobileNavWrapper user={user} />
    </div>
  )
}
