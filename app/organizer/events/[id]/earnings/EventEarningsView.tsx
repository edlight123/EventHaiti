'use client'

import { useState } from 'react'
import Link from 'next/link'
import { calculateFees, formatCurrency, calculateSettlementDate } from '@/lib/fees'
import type { EventEarnings } from '@/types/earnings'

interface EventEarningsViewProps {
  event: any
  earnings: EventEarnings | null
  organizerId: string
}

export default function EventEarningsView({ event, earnings, organizerId }: EventEarningsViewProps) {
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawMethod, setWithdrawMethod] = useState<'moncash' | 'bank' | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [moncashNumber, setMoncashNumber] = useState('')
  const [bankDetails, setBankDetails] = useState({
    accountNumber: '',
    bankName: '',
    accountHolder: '',
    swiftCode: '',
    routingNumber: ''
  })

  if (!earnings) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link href="/organizer/earnings" className="text-teal-600 hover:underline mb-4 inline-block">
          ← Back to All Earnings
        </Link>
        
        <div className="bg-white rounded-xl p-8 text-center">
          <span className="text-6xl mb-4 block">💰</span>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Earnings Yet</h2>
          <p className="text-gray-600 mb-6">
            This event hasn&apos;t generated any earnings yet. Earnings are recorded when attendees purchase tickets.
          </p>
          <Link 
            href={`/events/${event.id}`}
            className="inline-block px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            View Event Page
          </Link>
        </div>
      </div>
    )
  }

  const { platformFee, processingFee } = calculateFees(earnings.grossSales)
  const eventDate = event.date_time ? new Date(event.date_time) : null
  const settlementDate = eventDate ? calculateSettlementDate(eventDate) : null
  const isSettled = settlementDate ? new Date() >= settlementDate : false
  const availableToWithdraw = earnings.settlementStatus === 'ready' ? earnings.netAmount - earnings.withdrawnAmount : 0

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">✓ Ready</span>
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">⏳ Pending</span>
      case 'locked':
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">🔒 Locked</span>
      default:
        return null
    }
  }

  const handleWithdraw = (method: 'moncash' | 'bank') => {
    setWithdrawMethod(method)
    setShowWithdrawModal(true)
    setError(null)
  }

  const submitWithdrawal = async () => {
    setIsSubmitting(true)
    setError(null)

    try {
      const endpoint = withdrawMethod === 'moncash' 
        ? '/api/organizer/withdraw-moncash'
        : '/api/organizer/withdraw-bank'

      // Convert availableToWithdraw from cents to dollars for API
      const amountInDollars = availableToWithdraw / 100

      const payload = withdrawMethod === 'moncash'
        ? { eventId: event.id, amount: amountInDollars, moncashNumber }
        : { eventId: event.id, amount: amountInDollars, bankDetails }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit withdrawal')
      }

      // Success - reload page to show updated balance
      alert(`✅ Withdrawal request submitted successfully! You'll receive your funds within ${withdrawMethod === 'moncash' ? '24 hours' : '3-5 business days'}.`)
      window.location.reload()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <Link href="/organizer/earnings" className="text-teal-600 hover:underline mb-4 inline-block">
        ← Back to All Earnings
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{event.title || 'Event'}</h1>
        <div className="flex items-center gap-2 text-gray-600">
          <span>📅 {eventDate ? eventDate.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
          }) : 'Date TBD'}</span>
          <span className="mx-2">•</span>
          {getStatusBadge(earnings.settlementStatus)}
        </div>
      </div>

      {/* Earnings Summary Card */}
      <div className="bg-gradient-to-br from-teal-500 to-purple-600 rounded-xl p-6 text-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-teal-100 text-sm font-medium mb-1">Gross Revenue</div>
            <div className="text-3xl font-bold">{formatCurrency(earnings.grossSales / 100)}</div>
            <div className="text-teal-100 text-sm mt-1">{earnings.ticketsSold} tickets sold</div>
          </div>
          
          <div>
            <div className="text-teal-100 text-sm font-medium mb-1">Total Fees</div>
            <div className="text-3xl font-bold">-{formatCurrency((platformFee + processingFee) / 100)}</div>
            <div className="text-teal-100 text-sm mt-1">Platform + Stripe</div>
          </div>
          
          <div>
            <div className="text-teal-100 text-sm font-medium mb-1">Your Earnings</div>
            <div className="text-3xl font-bold">{formatCurrency(earnings.netAmount / 100)}</div>
            <div className="text-teal-100 text-sm mt-1">
              {earnings.withdrawnAmount > 0 ? `${formatCurrency(earnings.withdrawnAmount / 100)} withdrawn` : 'Not withdrawn yet'}
            </div>
          </div>
        </div>
      </div>

      {/* Fee Breakdown */}
      <div className="bg-white rounded-xl p-6 mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">💳 Fee Breakdown</h2>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Gross Revenue</span>
            <span className="font-semibold text-gray-900">{formatCurrency(earnings.grossSales / 100)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <div>
              <div className="text-gray-600">Platform Fee (10%)</div>
              <div className="text-xs text-gray-400">Minimum $0.50 per ticket</div>
            </div>
            <span className="font-semibold text-red-600">-{formatCurrency(platformFee / 100)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <div>
              <div className="text-gray-600">Stripe Processing Fee</div>
              <div className="text-xs text-gray-400">2.9% + $0.30 per transaction</div>
            </div>
            <span className="font-semibold text-red-600">-{formatCurrency(processingFee / 100)}</span>
          </div>
          <div className="flex justify-between py-3 bg-teal-50 rounded-lg px-3">
            <span className="font-bold text-gray-900">Net Earnings</span>
            <span className="font-bold text-teal-600 text-lg">{formatCurrency(earnings.netAmount / 100)}</span>
          </div>
        </div>
      </div>

      {/* Settlement Status */}
      {earnings.settlementStatus !== 'ready' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-2xl">ℹ️</span>
            <div>
              <h3 className="font-bold text-blue-900 mb-1">
                {earnings.settlementStatus === 'pending' ? 'Settlement Pending' : 'Funds Locked'}
              </h3>
              <p className="text-blue-800 text-sm mb-2">
                {earnings.settlementStatus === 'pending'
                  ? 'Funds are held for 7 days after your event to allow for refunds and disputes.'
                  : 'Funds will become available 7 days after your event ends.'}
              </p>
              {settlementDate && (
                <p className="text-blue-700 text-sm font-medium">
                  Available for withdrawal: {settlementDate.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal Section */}
      {earnings.settlementStatus === 'ready' && availableToWithdraw > 0 && (
        <div className="bg-white rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">💸 Request Withdrawal</h2>
              <p className="text-gray-600 text-sm">Available: {formatCurrency(availableToWithdraw)}</p>
            </div>
          </div>

          {availableToWithdraw >= 5000 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleWithdraw('moncash')}
                className="border-2 border-teal-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                    <span className="text-2xl">📱</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">MonCash</div>
                    <div className="text-sm text-gray-500">Instant transfer</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">Processed within 24 hours</div>
              </button>

              <button
                onClick={() => handleWithdraw('bank')}
                className="border-2 border-teal-200 rounded-xl p-4 hover:border-teal-400 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                    <span className="text-2xl">🏦</span>
                  </div>
                  <div>
                    <div className="font-bold text-gray-900">Bank Transfer</div>
                    <div className="text-sm text-gray-500">Direct deposit</div>
                  </div>
                </div>
                <div className="text-xs text-gray-400">Processed within 3-5 business days</div>
              </button>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800 text-sm">
                ⚠️ Minimum withdrawal amount is $50.00. Current available balance: {formatCurrency(availableToWithdraw)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Withdrawal History */}
      {earnings.withdrawnAmount > 0 && (
        <div className="bg-white rounded-xl p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📋 Withdrawal History</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-3 border-b border-gray-100">
              <div>
                <div className="font-medium text-gray-900">Total Withdrawn</div>
                <div className="text-sm text-gray-500">From this event</div>
              </div>
              <span className="font-bold text-gray-900">{formatCurrency(earnings.withdrawnAmount / 100)}</span>
            </div>
            {earnings.netAmount - earnings.withdrawnAmount > 0 && (
              <div className="flex justify-between items-center py-3">
                <div>
                  <div className="font-medium text-gray-900">Remaining Balance</div>
                  <div className="text-sm text-gray-500">Available {earnings.settlementStatus === 'ready' ? 'now' : 'after settlement'}</div>
                </div>
                <span className="font-bold text-teal-600">{formatCurrency((earnings.netAmount - earnings.withdrawnAmount) / 100)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {showWithdrawModal && withdrawMethod && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Request {withdrawMethod === 'moncash' ? 'MonCash' : 'Bank'} Withdrawal
            </h3>
            
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Amount:</span>
                  <span className="font-bold text-gray-900">{formatCurrency(availableToWithdraw)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Method:</span>
                  <span className="font-medium text-gray-900">
                    {withdrawMethod === 'moncash' ? '📱 MonCash' : '🏦 Bank Transfer'}
                  </span>
                </div>
              </div>

              {/* MonCash Form */}
              {withdrawMethod === 'moncash' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      MonCash Phone Number
                    </label>
                    <input
                      type="tel"
                      value={moncashNumber}
                      onChange={(e) => setMoncashNumber(e.target.value)}
                      placeholder="+509 1234 5678"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Your withdrawal will be sent to your MonCash account within 24 hours.
                  </p>
                </div>
              )}

              {/* Bank Form */}
              {withdrawMethod === 'bank' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Holder Name
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountHolder}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountHolder: e.target.value })}
                      placeholder="Full name on account"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      placeholder="e.g., Unibank"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      placeholder="Account number"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Routing Number (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankDetails.routingNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, routingNumber: e.target.value })}
                      placeholder="For international transfers"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SWIFT Code (Optional)
                    </label>
                    <input
                      type="text"
                      value={bankDetails.swiftCode}
                      onChange={(e) => setBankDetails({ ...bankDetails, swiftCode: e.target.value })}
                      placeholder="For international transfers"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                  <p className="text-sm text-gray-600">
                    Your withdrawal will be deposited to your bank account within 3-5 business days.
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                  <p className="text-red-800 text-sm">❌ {error}</p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={submitWithdrawal}
                disabled={isSubmitting || (withdrawMethod === 'moncash' && !moncashNumber) || (withdrawMethod === 'bank' && (!bankDetails.accountHolder || !bankDetails.bankName || !bankDetails.accountNumber))}
                className="flex-1 px-4 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Confirm Withdrawal'}
              </button>
              <button
                onClick={() => {
                  setShowWithdrawModal(false)
                  setError(null)
                  setMoncashNumber('')
                  setBankDetails({
                    accountNumber: '',
                    bankName: '',
                    accountHolder: '',
                    swiftCode: '',
                    routingNumber: ''
                  })
                }}
                disabled={isSubmitting}
                className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
