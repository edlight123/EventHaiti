'use client'

import { useState } from 'react'
import { DollarSign, Clock, Calendar, ArrowDownToLine } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface BalanceRowProps {
  availableBalance: number
  pendingBalance: number
  nextPayoutDate: string | null
}

export function BalanceRow({ availableBalance, pendingBalance, nextPayoutDate }: BalanceRowProps) {
  const { t } = useTranslation('organizer')
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleRequestPayout = async () => {
    if (availableBalance < 5000) {
      setError(t('settings.payout_settings.min_payout_error'))
      return
    }

    setRequesting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/organizer/request-payout', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || data.error || t('settings.payout_settings.failed_request'))
      }

      setSuccess(true)
      setTimeout(() => {
        window.location.reload()
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setRequesting(false)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Manual payout'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
          {error}
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
          {t('settings.payout_settings.request_success')}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Available Balance */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border-2 border-green-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-green-900 uppercase tracking-wide">{t('settings.payout_settings.available_balance')}</h3>
        </div>
        <p className="text-3xl font-bold text-green-700">{formatCurrency(availableBalance)}</p>
        <p className="text-sm text-green-600 mt-1">{t('settings.payout_settings.ready_to_withdraw')}</p>
      </div>

      {/* Pending Balance */}
      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border-2 border-yellow-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-yellow-900 uppercase tracking-wide">{t('settings.payout_settings.pending_balance')}</h3>
        </div>
        <p className="text-3xl font-bold text-yellow-700">{formatCurrency(pendingBalance)}</p>
        <p className="text-sm text-yellow-600 mt-1">{t('settings.payout_settings.processing')}</p>
      </div>

      {/* Next Payout */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border-2 border-blue-200 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-sm font-semibold text-blue-900 uppercase tracking-wide">{t('settings.payout_settings.next_payout')}</h3>
        </div>
        <p className="text-3xl font-bold text-blue-700">
          {nextPayoutDate ? formatDate(nextPayoutDate).split(',')[0] : '—'}
        </p>
        <p className="text-sm text-blue-600 mt-1">{formatDate(nextPayoutDate)}</p>
      </div>
    </div>

    {/* Request Payout Button */}
    {availableBalance >= 5000 && (
      <div className="mt-4">
        <button
          onClick={handleRequestPayout}
          disabled={requesting}
          className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-teal-600 to-teal-700 hover:from-teal-700 hover:to-teal-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-3"
        >
          <ArrowDownToLine className="w-5 h-5" />
          {requesting ? t('settings.payout_settings.requesting') : t('settings.payout_settings.request_payout')}
        </button>
        <p className="text-sm text-gray-600 mt-2">
          {t('settings.payout_settings.payout_scheduled')}
        </p>
      </div>
    )}
    </div>
  )
}
