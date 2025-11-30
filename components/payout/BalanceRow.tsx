'use client'

import { DollarSign, Clock, Calendar } from 'lucide-react'

interface BalanceRowProps {
  availableBalance: number
  pendingBalance: number
  nextPayoutDate: string | null
}

export function BalanceRow({ availableBalance, pendingBalance, nextPayoutDate }: BalanceRowProps) {
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Manual payout'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Available Balance */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide">Available</h3>
        </div>
        <p className="text-3xl font-bold text-green-700">{formatCurrency(availableBalance)}</p>
        <p className="text-sm text-green-600 mt-1">Ready to withdraw</p>
      </div>

      {/* Pending Balance */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border-2 border-yellow-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-yellow-900 uppercase tracking-wide">Pending</h3>
        </div>
        <p className="text-3xl font-bold text-yellow-700">{formatCurrency(pendingBalance)}</p>
        <p className="text-sm text-yellow-600 mt-1">Processing</p>
      </div>

      {/* Next Payout */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">Next Payout</h3>
        </div>
        <p className="text-3xl font-bold text-blue-700">
          {nextPayoutDate ? formatDate(nextPayoutDate).split(',')[0] : '—'}
        </p>
        <p className="text-sm text-blue-600 mt-1">{formatDate(nextPayoutDate)}</p>
      </div>
    </div>
  )
}
