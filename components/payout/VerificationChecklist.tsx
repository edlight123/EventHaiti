'use client'

import { useState } from 'react'
import { Check, Clock, AlertCircle, User, CreditCard, Smartphone } from 'lucide-react'
import type { PayoutConfig } from '@/lib/firestore/payout'
import { IdentityVerificationModal } from './IdentityVerificationModal'
import { BankVerificationModal } from './BankVerificationModal'
import { PhoneVerificationModal } from './PhoneVerificationModal'

interface VerificationChecklistProps {
  config: PayoutConfig | null
}

type VerificationItemStatus = 'pending' | 'verified' | 'failed'

interface VerificationItem {
  id: string
  label: string
  description: string
  status: VerificationItemStatus
  icon: typeof User
  action?: {
    label: string
    onClick: () => void
  }
}

export function VerificationChecklist({ config }: VerificationChecklistProps) {
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [showBankModal, setShowBankModal] = useState(false)
  const [showPhoneModal, setShowPhoneModal] = useState(false)
  
  const identityStatus = config?.verificationStatus?.identity || 'pending'
  const bankStatus = config?.verificationStatus?.bank || 'pending'
  const phoneStatus = config?.verificationStatus?.phone || 'pending'

  const items: VerificationItem[] = [
    {
      id: 'identity',
      label: 'Identity Verification',
      description: 'Government-issued ID and personal information',
      status: identityStatus,
      icon: User,
      action: identityStatus === 'pending' ? {
        label: 'Verify Identity',
        onClick: () => setShowIdentityModal(true),
      } : undefined,
    },
    {
      id: 'bank',
      label: 'Bank Account Verification',
      description: 'Confirm your bank account ownership',
      status: config?.method === 'bank_transfer' ? bankStatus : 'verified',
      icon: CreditCard,
      action: config?.method === 'bank_transfer' && bankStatus === 'pending' ? {
        label: 'Verify Account',
        onClick: () => setShowBankModal(true),
      } : undefined,
    },
    {
      id: 'phone',
      label: 'Phone Number Verification',
      description: 'Verify your mobile money account',
      status: config?.method === 'mobile_money' ? phoneStatus : 'verified',
      icon: Smartphone,
      action: config?.method === 'mobile_money' && phoneStatus === 'pending' ? {
        label: 'Verify Phone',
        onClick: () => setShowPhoneModal(true),
      } : undefined,
    },
  ]

  const allVerified = items.every(item => item.status === 'verified')
  const hasFailures = items.some(item => item.status === 'failed')

  const getStatusIcon = (status: VerificationItemStatus) => {
    switch (status) {
      case 'verified':
        return <Check className="w-5 h-5 text-green-600" />
      case 'failed':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Clock className="w-5 h-5 text-yellow-600" />
    }
  }

  const getStatusBadge = (status: VerificationItemStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
            Verified
          </span>
        )
      case 'failed':
        return (
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
            Failed
          </span>
        )
      default:
        return (
          <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
            Pending
          </span>
        )
    }
  }

  const getStatusColor = (status: VerificationItemStatus) => {
    switch (status) {
      case 'verified':
        return 'border-green-200 bg-green-50'
      case 'failed':
        return 'border-red-200 bg-red-50'
      default:
        return 'border-yellow-200 bg-yellow-50'
    }
  }

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900">Verification Status</h3>
        {allVerified && (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 rounded-full">
            <Check className="w-4 h-4 text-green-600" />
            <span className="text-sm font-semibold text-green-700">All Verified</span>
          </div>
        )}
      </div>

      {/* Overall Status Message */}
      {!allVerified && !hasFailures && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-900">
            <strong>Action required:</strong> Complete verification steps below to activate payouts.
          </p>
        </div>
      )}

      {hasFailures && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-900">
            <p className="font-semibold mb-1">Verification Issues</p>
            <p>Some verification steps failed. Please retry or contact support for assistance.</p>
          </div>
        </div>
      )}

      {/* Verification Items */}
      <div className="space-y-4">
        {items.map((item, index) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className={`p-4 border-2 rounded-xl transition-all ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start gap-4">
                {/* Step Number & Icon */}
                <div className="relative">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    item.status === 'verified' ? 'bg-green-100' :
                    item.status === 'failed' ? 'bg-red-100' : 'bg-yellow-100'
                  }`}>
                    <Icon className={`w-6 h-6 ${
                      item.status === 'verified' ? 'text-green-600' :
                      item.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                    }`} />
                  </div>
                  <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-sm">
                    {getStatusIcon(item.status)}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">{item.label}</h4>
                    {getStatusBadge(item.status)}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>

                  {/* Action Button */}
                  {item.action && (
                    <button
                      onClick={item.action.onClick}
                      className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                        item.status === 'failed'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-yellow-600 hover:bg-yellow-700 text-white'
                      }`}
                    >
                      {item.action.label}
                    </button>
                  )}
                </div>
              </div>

              {/* Connector Line */}
              {index < items.length - 1 && (
                <div className="ml-6 mt-2 mb-2 h-8 border-l-2 border-dashed border-gray-300" />
              )}
            </div>
          )
        })}
      </div>

      {/* Info Footer */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <p className="text-xs text-gray-600">
          <strong>Why verification?</strong> We verify your identity and payment details to protect 
          you and comply with financial regulations. All information is encrypted and secure.
        </p>
      </div>

      {showIdentityModal && (
        <IdentityVerificationModal
          onClose={() => setShowIdentityModal(false)}
          onComplete={() => {
            // Optionally refresh data
            window.location.reload()
          }}
        />
      )}

      {showBankModal && (
        <BankVerificationModal
          onClose={() => setShowBankModal(false)}
          onComplete={() => {
            window.location.reload()
          }}
        />
      )}

      {showPhoneModal && (
        <PhoneVerificationModal
          onClose={() => setShowPhoneModal(false)}
          onComplete={() => {
            window.location.reload()
          }}
        />
      )}
    </div>
  )
}
