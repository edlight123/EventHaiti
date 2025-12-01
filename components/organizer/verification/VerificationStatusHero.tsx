/**
 * VerificationStatusHero Component
 * Displays the current verification status with appropriate messaging and CTAs
 */

import { type VerificationStatus } from '@/lib/verification'
import Link from 'next/link'

interface Props {
  status: VerificationStatus
  completionPercentage: number
  reviewNotes?: string
  onContinue?: () => void
  onRestart?: () => void
  isRestarting?: boolean
}

export default function VerificationStatusHero({
  status,
  completionPercentage,
  reviewNotes,
  onContinue,
  onRestart,
  isRestarting = false
}: Props) {
  // Status configuration
  const statusConfig: Record<VerificationStatus, {
    icon: string
    bgColor: string
    borderColor: string
    iconBgColor: string
    iconColor: string
    title: string
    description: string
    ctaText: string
    ctaColor: string
    readonly?: boolean
    ctaHref?: string
    actionType?: 'continue' | 'restart' | 'link'
  }> = {
    not_started: {
      icon: '📝',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconBgColor: 'bg-blue-100',
      iconColor: 'text-blue-600',
      title: 'Start Verification',
      description: 'Complete your verification to start creating events on EventHaiti',
      ctaText: 'Begin Verification',
      ctaColor: 'bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700',
      actionType: 'continue'
    },
    in_progress: {
      icon: '⏳',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      iconBgColor: 'bg-amber-100',
      iconColor: 'text-amber-600',
      title: 'Complete Your Verification',
      description: `You're ${completionPercentage}% complete. Finish all required steps to submit for review.`,
      ctaText: 'Continue',
      ctaColor: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700',
      actionType: 'continue'
    },
    pending_review: {
      icon: '⏰',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconBgColor: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      title: 'Verification Submitted',
      description: 'Your verification is pending review. Our team will review within 24-48 hours.',
      ctaText: 'View Submission',
      ctaColor: 'bg-gray-600 hover:bg-gray-700',
      readonly: true,
      actionType: 'continue'
    },
    in_review: {
      icon: '👀',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      iconBgColor: 'bg-purple-100',
      iconColor: 'text-purple-600',
      title: 'Under Review',
      description: 'Our team is currently reviewing your verification documents.',
      ctaText: 'View Status',
      ctaColor: 'bg-gray-600 hover:bg-gray-700',
      readonly: true,
      actionType: 'continue'
    },
    approved: {
      icon: '✅',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconBgColor: 'bg-green-100',
      iconColor: 'text-green-600',
      title: 'Verification Approved!',
      description: 'Your account has been verified. You can now create and publish events.',
      ctaText: 'Create Event',
      ctaColor: 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700',
      ctaHref: '/organizer/events/new',
      actionType: 'link'
    },
    changes_requested: {
      icon: '⚠️',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      iconBgColor: 'bg-orange-100',
      iconColor: 'text-orange-600',
      title: 'Changes Requested',
      description: 'We need some additional information. Please review the notes below and update your submission.',
      ctaText: 'Review & Update',
      ctaColor: 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700',
      actionType: 'continue'
    },
    rejected: {
      icon: '❌',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconBgColor: 'bg-red-100',
      iconColor: 'text-red-600',
      title: 'Verification Declined',
      description: 'Your verification was not approved. Click below to start a fresh application with all fields cleared.',
      ctaText: 'Start Fresh Application',
      ctaColor: 'bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700',
      actionType: 'restart'
    }
  }

  const config = statusConfig[status]

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-xl p-6 md:p-8 mb-6`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`${config.iconBgColor} rounded-full p-3 md:p-4 flex-shrink-0`}>
          <span className="text-2xl md:text-3xl" role="img" aria-label="Status icon">
            {config.icon}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
            {config.title}
          </h1>
          <p className="text-sm md:text-base text-gray-700 mb-4">
            {config.description}
          </p>

          {/* Progress bar for in_progress status */}
          {status === 'in_progress' && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs md:text-sm font-medium text-gray-700">
                  Progress
                </span>
                <span className="text-xs md:text-sm font-semibold text-amber-600">
                  {completionPercentage}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Review notes for changes_requested or rejected */}
          {(status === 'changes_requested' || status === 'rejected') && reviewNotes && (
            <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-4`}>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Feedback from our team:
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {reviewNotes}
              </p>
            </div>
          )}

          {/* CTA Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            {config.ctaHref ? (
              <Link
                href={config.ctaHref}
                className={`${config.ctaColor} text-white px-6 py-3 rounded-lg font-semibold text-sm md:text-base text-center transition-all shadow-md hover:shadow-lg`}
              >
                {config.ctaText}
              </Link>
            ) : (
              <button
                onClick={config.actionType === 'restart' ? onRestart : (config.readonly ? undefined : onContinue)}
                disabled={config.readonly || isRestarting}
                className={`${config.ctaColor} ${
                  config.readonly || isRestarting ? 'opacity-50 cursor-not-allowed' : ''
                } text-white px-6 py-3 rounded-lg font-semibold text-sm md:text-base transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2`}
              >
                {isRestarting && config.actionType === 'restart' && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {config.ctaText}
              </button>
            )}

            {status === 'pending_review' || status === 'in_review' ? (
              <Link
                href="/organizer/events"
                className="text-gray-700 hover:text-gray-900 px-6 py-3 rounded-lg font-medium text-sm md:text-base text-center border-2 border-gray-300 hover:border-gray-400 transition-all"
              >
                Go to Events
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {/* Timeline for pending/review status */}
      {(status === 'pending_review' || status === 'in_review') && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">What happens next?</h3>
          <div className="space-y-3">
            <TimelineStep
              completed={true}
              text="Verification submitted"
            />
            <TimelineStep
              completed={status === 'in_review'}
              text="Documents under review"
            />
            <TimelineStep
              completed={false}
              text="Decision within 24-48 hours"
            />
            <TimelineStep
              completed={false}
              text="Email notification sent"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Timeline step sub-component
function TimelineStep({ completed, text }: { completed: boolean; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
          completed ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        {completed && (
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`text-sm ${completed ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
        {text}
      </span>
    </div>
  )
}
