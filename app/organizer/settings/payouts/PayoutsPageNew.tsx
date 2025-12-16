'use client'

import { useState } from 'react'
import { ChevronRight, AlertCircle, CheckCircle, Clock, Ban } from 'lucide-react'
import Link from 'next/link'
import { updatePayoutConfig } from './actions'
import { useRouter } from 'next/navigation'

// Types
interface PayoutConfig {
  country?: string
  method?: 'bank_transfer' | 'mobile_money'
  bankDetails?: {
    accountName: string
    accountNumber: string
    bankName: string
  }
  mobileMoneyDetails?: {
    provider: string
    phoneNumber: string
    accountName: string
  }
}

interface EventPayoutSummary {
  eventId: string
  name: string
  date: string
  ticketsSold: number
  grossSales: number
  fees: number
  netPayout: number
  payoutStatus: 'pending' | 'scheduled' | 'paid' | 'on_hold'
}

interface PayoutsPageProps {
  config?: PayoutConfig
  eventSummaries: EventPayoutSummary[]
  upcomingPayout?: {
    amount: number
    date: string
    eventCount: number
  }
  organizerId: string
}

export default function PayoutsPageNew({
  config,
  eventSummaries,
  upcomingPayout,
  organizerId
}: PayoutsPageProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(!config)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState<'this_month' | 'last_3_months' | 'all_time'>('this_month')
  const [formData, setFormData] = useState({
    country: config?.country || 'haiti',
    method: config?.method || 'bank_transfer',
    bankName: config?.bankDetails?.bankName || '',
    accountName: config?.bankDetails?.accountName || '',
    accountNumber: config?.bankDetails?.accountNumber || '',
    provider: config?.mobileMoneyDetails?.provider || 'moncash',
    phoneNumber: config?.mobileMoneyDetails?.phoneNumber || ''
  })

  const hasPayoutSetup = Boolean(config)

  const handleSavePayoutDetails = async () => {
    setIsSaving(true)
    setError(null)
    
    try {
      const updates: any = {
        method: formData.method as 'bank_transfer' | 'mobile_money'
      }

      if (formData.method === 'bank_transfer') {
        updates.bankDetails = {
          bankName: formData.bankName,
          accountName: formData.accountName,
          accountNumber: formData.accountNumber
        }
      } else {
        updates.mobileMoneyDetails = {
          provider: formData.provider,
          phoneNumber: formData.phoneNumber,
          accountName: formData.accountName || formData.phoneNumber
        }
      }

      await updatePayoutConfig(updates)
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      setError('Failed to save payout details. Please try again.')
      console.error('Error saving payout details:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'HTG',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const getStatusPill = (status: EventPayoutSummary['payoutStatus']) => {
    const styles = {
      paid: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      scheduled: 'bg-blue-100 text-blue-800 border-blue-200',
      on_hold: 'bg-red-100 text-red-800 border-red-200'
    }

    const icons = {
      paid: <CheckCircle className="w-3 h-3" />,
      pending: <Clock className="w-3 h-3" />,
      scheduled: <Clock className="w-3 h-3" />,
      on_hold: <Ban className="w-3 h-3" />
    }

    const labels = {
      paid: 'Paid',
      pending: 'Pending',
      scheduled: 'Scheduled',
      on_hold: 'On hold'
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${styles[status]}`}>
        {icons[status]}
        {labels[status]}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
            <Link href="/organizer/settings" className="hover:text-gray-900">
              Settings
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">Payouts</span>
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Payouts
          </h1>
          <p className="text-gray-600">
            Set up where your money goes and track earnings by event.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Left Column - Payout Setup + Fees */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Payout Setup Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payout setup
                </h2>

                {!isEditing && hasPayoutSetup ? (
                  // Summary View
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Location</div>
                      <div className="text-base text-gray-900 capitalize">{config?.country}</div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-gray-500 mb-1">Method</div>
                      <div className="text-base text-gray-900">
                        {config?.method === 'bank_transfer' ? (
                          <>
                            Bank transfer · {config?.bankDetails?.bankName} · 
                            <span className="font-mono">
                              ****{config?.bankDetails?.accountNumber?.slice(-4)}
                            </span>
                          </>
                        ) : (
                          <>
                            Mobile money · {config?.mobileMoneyDetails?.provider} · 
                            <span className="font-mono">
                              ****{config?.mobileMoneyDetails?.phoneNumber?.slice(-4)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 pt-2">
                      Your payouts will be sent to this account.
                    </p>

                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                    >
                      Edit payout details
                    </button>
                  </div>
                ) : (
                  // Form View
                  <div className="space-y-4">
                    {/* Account Location */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account location
                      </label>
                      <select
                        value={formData.country}
                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="haiti">Haiti</option>
                        <option value="abroad">Abroad</option>
                      </select>
                    </div>

                    {/* Payout Method */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Payout method
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="method"
                            value="bank_transfer"
                            checked={formData.method === 'bank_transfer'}
                            onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-sm font-medium text-gray-900">Bank transfer</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                          <input
                            type="radio"
                            name="method"
                            value="mobile_money"
                            checked={formData.method === 'mobile_money'}
                            onChange={(e) => setFormData({ ...formData, method: e.target.value as any })}
                            className="w-4 h-4 text-purple-600"
                          />
                          <span className="text-sm font-medium text-gray-900">Mobile money</span>
                        </label>
                      </div>
                    </div>

                    {/* Bank Transfer Fields */}
                    {formData.method === 'bank_transfer' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Bank name
                          </label>
                          <select
                            value={formData.bankName}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="">Select bank</option>
                            <option value="unibank">Unibank</option>
                            <option value="sogebank">Sogebank</option>
                            <option value="capital_bank">Capital Bank</option>
                            <option value="buh">BUH</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account holder name
                          </label>
                          <input
                            type="text"
                            value={formData.accountName}
                            onChange={(e) => setFormData({ ...formData, accountName: e.target.value })}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Account number
                          </label>
                          <input
                            type="text"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                            placeholder="1234567890"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                    {/* Mobile Money Fields */}
                    {formData.method === 'mobile_money' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Provider
                          </label>
                          <select
                            value={formData.provider}
                            onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          >
                            <option value="moncash">MonCash</option>
                            <option value="natcash">Natcash</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone number
                          </label>
                          <input
                            type="tel"
                            value={formData.phoneNumber}
                            onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                            placeholder="+509 1234 5678"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          />
                        </div>
                      </>
                    )}

                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleSavePayoutDetails}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save payout details'}
                      </button>
                      {hasPayoutSetup && (
                        <button
                          onClick={() => {
                            setIsEditing(false)
                            setError(null)
                          }}
                          disabled={isSaving}
                          className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fees & Rules Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <Link href="/organizer/settings/payouts/fees" className="block p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      Fees & rules
                    </h3>
                    <p className="text-sm text-gray-600">
                      Platform and processing fees, payout schedule.
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            </div>
          </div>

          {/* Right Column - Earnings + Payouts */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Earnings by Event Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Earnings by event
                  </h2>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value as any)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="this_month">This month</option>
                    <option value="last_3_months">Last 3 months</option>
                    <option value="all_time">All time</option>
                  </select>
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Event
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tickets
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Gross
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fees
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Net
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {eventSummaries.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No events found for this period
                        </td>
                      </tr>
                    ) : (
                      eventSummaries.map((event) => (
                        <tr key={event.eventId} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <Link
                              href={`/organizer/events/${event.eventId}/earnings`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-700"
                            >
                              {event.name}
                            </Link>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {formatDate(event.date)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {event.ticketsSold}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 text-right">
                            {formatCurrency(event.grossSales)}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 text-right">
                            {formatCurrency(event.fees)}
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                            {formatCurrency(event.netPayout)}
                          </td>
                          <td className="px-6 py-4">
                            {getStatusPill(event.payoutStatus)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-200">
                {eventSummaries.length === 0 ? (
                  <div className="px-6 py-12 text-center text-gray-500">
                    No events found for this period
                  </div>
                ) : (
                  eventSummaries.map((event) => (
                    <Link
                      key={event.eventId}
                      href={`/organizer/events/${event.eventId}/earnings`}
                      className="block p-6 hover:bg-gray-50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-medium text-purple-600">
                          {event.name}
                        </h3>
                        {getStatusPill(event.payoutStatus)}
                      </div>
                      <div className="text-sm text-gray-500 mb-3">
                        {formatDate(event.date)} · {event.ticketsSold} tickets
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs text-gray-500">Net payout</div>
                          <div className="text-lg font-semibold text-gray-900">
                            {formatCurrency(event.netPayout)}
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>

            {/* Payouts Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Payouts
                </h2>

                {upcomingPayout ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium text-blue-900">
                          Next payout: {formatCurrency(upcomingPayout.amount)} · {formatDate(upcomingPayout.date)}
                        </div>
                        <div className="text-xs text-blue-700 mt-0.5">
                          Includes {upcomingPayout.eventCount} {upcomingPayout.eventCount === 1 ? 'event' : 'events'}
                        </div>
                      </div>
                    </div>

                    <Link
                      href="/organizer/settings/payouts/history"
                      className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View payout history
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="text-sm text-gray-600">
                        No upcoming payouts yet.
                      </div>
                    </div>

                    <Link
                      href="/organizer/settings/payouts/history"
                      className="inline-flex items-center gap-2 text-sm font-medium text-purple-600 hover:text-purple-700"
                    >
                      View payout history
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
