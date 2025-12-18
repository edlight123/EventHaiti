'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { EarningsSummary } from '@/types/earnings'

interface EarningsViewProps {
  summary: EarningsSummary
  organizerId: string
}

export default function EarningsView({ summary, organizerId }: EarningsViewProps) {
  const [filter, setFilter] = useState<'all' | 'ready' | 'pending' | 'locked'>('all')

  const formatCurrency = (cents: number) => {
    const amount = (cents / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return summary.currency === 'HTG' ? `HTG ${amount}` : `$${amount}`
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      ready: 'bg-green-100 text-green-800',
      locked: 'bg-gray-100 text-gray-800',
    }
    return styles[status as keyof typeof styles] || styles.pending
  }

  const filteredEvents = filter === 'all' 
    ? summary.events 
    : summary.events.filter(e => e.settlementStatus === filter)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Total Earnings</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary.totalGrossSales)}
          </div>
          <div className="text-xs text-gray-500 mt-1">All time</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Net Amount</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary.totalNetAmount)}
          </div>
          <div className="text-xs text-gray-500 mt-1">After fees</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6 border-l-4 border-green-600">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Available</div>
          <div className="text-xl sm:text-2xl font-bold text-green-600 mt-2">
            {formatCurrency(summary.totalAvailableToWithdraw)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Ready to withdraw</div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="text-xs sm:text-sm text-gray-600 mb-1">Withdrawn</div>
          <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
            {formatCurrency(summary.totalWithdrawn)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Total paid out</div>
        </div>
      </div>

      {/* Fee Breakdown Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h3 className="text-sm font-medium text-blue-900 mb-1">Fee Structure</h3>
            <div className="text-xs sm:text-sm text-blue-800 space-y-1">
              <div className="flex justify-between">
                <span>Platform Fee:</span>
                <span className="font-medium">10% of ticket sales</span>
              </div>
              <div className="flex justify-between">
                <span>Processing Fee:</span>
                <span className="font-medium">2.9% + $0.30 per transaction</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-300">
                <span>Total Fees Paid:</span>
                <span className="font-semibold">
                  {formatCurrency(summary.totalPlatformFees + summary.totalProcessingFees)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h2 className="text-lg font-semibold text-gray-900">Earnings by Event</h2>
            
            <div className="flex gap-2 overflow-x-auto">
              {(['all', 'ready', 'pending', 'locked'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition whitespace-nowrap ${
                    filter === status
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile View - Cards */}
        <div className="sm:hidden divide-y divide-gray-200">
          {filteredEvents.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-500">No events found for this filter</p>
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div key={event.eventId} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{event.eventTitle}</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusBadge(
                      event.settlementStatus
                    )}`}
                  >
                    {event.settlementStatus}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-gray-500">Gross Sales</div>
                    <div className="font-medium">{formatCurrency(event.grossSales)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Net Amount</div>
                    <div className="font-medium">{formatCurrency(event.netAmount)}</div>
                  </div>
                  <div>
                    <div className="text-gray-500">Available</div>
                    <div className="font-semibold text-green-600">
                      {formatCurrency(event.availableToWithdraw)}
                    </div>
                  </div>
                  <div className="flex items-end justify-end">
                    <Link
                      href={`/organizer/events/${event.eventId}/earnings`}
                      className="text-teal-600 hover:text-teal-800 font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gross Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Net Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Available
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="mt-4 text-gray-500">No events found for this filter</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => (
                  <tr key={event.eventId} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{event.eventTitle}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                      {new Date(event.eventDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                      {formatCurrency(event.grossSales)}
                    </td>
                    <td className="px-6 py-4 text-right font-medium whitespace-nowrap">
                      {formatCurrency(event.netAmount)}
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-green-600 whitespace-nowrap">
                      {formatCurrency(event.availableToWithdraw)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(
                          event.settlementStatus
                        )}`}
                      >
                        {event.settlementStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link
                        href={`/organizer/events/${event.eventId}/earnings`}
                        className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Actions */}
      {summary.totalAvailableToWithdraw > 5000 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Ready to Withdraw</h3>
              <p className="text-sm text-gray-600 mt-1">
                You have {formatCurrency(summary.totalAvailableToWithdraw)} available to withdraw
              </p>
            </div>
            <Link
              href="/organizer/payouts"
              className="w-full sm:w-auto px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 transition text-center"
            >
              Request Payout
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
