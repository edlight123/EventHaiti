'use client'

import { useState, useEffect } from 'react'
import { PlatformSettings } from '@/types/platform-settings'

export function PlatformSettingsForm() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [haitiPlatformFee, setHaitiPlatformFee] = useState('')
  const [haitiSettlementDays, setHaitiSettlementDays] = useState('')
  const [usCanadaPlatformFee, setUsCanadaPlatformFee] = useState('')
  const [usCanadaSettlementDays, setUsCanadaSettlementDays] = useState('')
  const [minimumPayout, setMinimumPayout] = useState('')

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/settings')
      const data = await response.json()

      if (data.success && data.settings) {
        setSettings(data.settings)
        
        // Populate form fields
        setHaitiPlatformFee((data.settings.haiti.platformFeePercentage * 100).toFixed(2))
        setHaitiSettlementDays(String(data.settings.haiti.settlementHoldDays))
        setUsCanadaPlatformFee((data.settings.usCanada.platformFeePercentage * 100).toFixed(2))
        setUsCanadaSettlementDays(String(data.settings.usCanada.settlementHoldDays))
        setMinimumPayout((data.settings.minimumPayoutAmount / 100).toFixed(2))
      }
    } catch (error) {
      console.error('Error loading settings:', error)
      setMessage({ type: 'error', text: 'Failed to load settings' })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      // Validate inputs
      const haitiPlatformFeeNum = parseFloat(haitiPlatformFee)
      const haitiSettlementDaysNum = parseInt(haitiSettlementDays)
      const usCanadaPlatformFeeNum = parseFloat(usCanadaPlatformFee)
      const usCanadaSettlementDaysNum = parseInt(usCanadaSettlementDays)
      const minimumPayoutNum = parseFloat(minimumPayout)

      if (isNaN(haitiPlatformFeeNum) || haitiPlatformFeeNum < 0 || haitiPlatformFeeNum > 100) {
        setMessage({ type: 'error', text: 'Haiti platform fee must be between 0 and 100%' })
        setSaving(false)
        return
      }

      if (isNaN(haitiSettlementDaysNum) || haitiSettlementDaysNum < 0) {
        setMessage({ type: 'error', text: 'Haiti settlement days must be >= 0' })
        setSaving(false)
        return
      }

      if (isNaN(usCanadaPlatformFeeNum) || usCanadaPlatformFeeNum < 0 || usCanadaPlatformFeeNum > 100) {
        setMessage({ type: 'error', text: 'US/Canada platform fee must be between 0 and 100%' })
        setSaving(false)
        return
      }

      if (isNaN(usCanadaSettlementDaysNum) || usCanadaSettlementDaysNum < 0) {
        setMessage({ type: 'error', text: 'US/Canada settlement days must be >= 0' })
        setSaving(false)
        return
      }

      if (isNaN(minimumPayoutNum) || minimumPayoutNum < 0) {
        setMessage({ type: 'error', text: 'Minimum payout amount must be >= 0' })
        setSaving(false)
        return
      }

      // Send update request
      const response = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          haiti: {
            platformFeePercentage: haitiPlatformFeeNum / 100,
            settlementHoldDays: haitiSettlementDaysNum,
          },
          usCanada: {
            platformFeePercentage: usCanadaPlatformFeeNum / 100,
            settlementHoldDays: usCanadaSettlementDaysNum,
          },
          minimumPayoutAmount: Math.round(minimumPayoutNum * 100),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setSettings(data.settings)
        setMessage({ type: 'success', text: 'Settings updated successfully!' })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update settings' })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      setMessage({ type: 'error', text: 'Failed to update settings' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-8">
        {/* Message Banner */}
        {message && (
          <div
            className={`rounded-lg p-4 ${
              message.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Haiti Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">🇭🇹 Haiti Events</h2>
            <p className="mt-1 text-sm text-gray-600">
              Settings for events taking place in Haiti
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="haitiPlatformFee" className="block text-sm font-medium text-gray-700 mb-2">
                Platform Fee (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="haitiPlatformFee"
                  value={haitiPlatformFee}
                  onChange={(e) => setHaitiPlatformFee(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Example: 5.00 for 5% fee
              </p>
            </div>

            <div>
              <label htmlFor="haitiSettlementDays" className="block text-sm font-medium text-gray-700 mb-2">
                Settlement Hold Days
              </label>
              <input
                type="number"
                id="haitiSettlementDays"
                value={haitiSettlementDays}
                onChange={(e) => setHaitiSettlementDays(e.target.value)}
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Days after event before funds are available
              </p>
            </div>
          </div>
        </div>

        {/* US/Canada Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">🇺🇸🇨🇦 US & Canada Events</h2>
            <p className="mt-1 text-sm text-gray-600">
              Settings for events taking place in the United States or Canada
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="usCanadaPlatformFee" className="block text-sm font-medium text-gray-700 mb-2">
                Platform Fee (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  id="usCanadaPlatformFee"
                  value={usCanadaPlatformFee}
                  onChange={(e) => setUsCanadaPlatformFee(e.target.value)}
                  step="0.01"
                  min="0"
                  max="100"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  required
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Example: 10.00 for 10% fee
              </p>
            </div>

            <div>
              <label htmlFor="usCanadaSettlementDays" className="block text-sm font-medium text-gray-700 mb-2">
                Settlement Hold Days
              </label>
              <input
                type="number"
                id="usCanadaSettlementDays"
                value={usCanadaSettlementDays}
                onChange={(e) => setUsCanadaSettlementDays(e.target.value)}
                min="0"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                Days after event before funds are available
              </p>
            </div>
          </div>
        </div>

        {/* Global Settings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h2 className="text-xl font-semibold text-gray-900">🌍 Global Settings</h2>
            <p className="mt-1 text-sm text-gray-600">
              Settings that apply to all events
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="minimumPayout" className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Payout Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  id="minimumPayout"
                  value={minimumPayout}
                  onChange={(e) => setMinimumPayout(e.target.value)}
                  step="0.01"
                  min="0"
                  className="block w-full pl-7 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Minimum amount required for withdrawal (in USD)
              </p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>

        {/* Current Settings Display */}
        {settings && (
          <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Current Settings Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500">Haiti Fee</p>
                <p className="font-semibold text-gray-900">
                  {(settings.haiti.platformFeePercentage * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500">Haiti Settlement</p>
                <p className="font-semibold text-gray-900">
                  {settings.haiti.settlementHoldDays} days
                </p>
              </div>
              <div>
                <p className="text-gray-500">US/Canada Fee</p>
                <p className="font-semibold text-gray-900">
                  {(settings.usCanada.platformFeePercentage * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-500">US/Canada Settlement</p>
                <p className="font-semibold text-gray-900">
                  {settings.usCanada.settlementHoldDays} days
                </p>
              </div>
              <div>
                <p className="text-gray-500">Min Payout</p>
                <p className="font-semibold text-gray-900">
                  ${(settings.minimumPayoutAmount / 100).toFixed(2)}
                </p>
              </div>
              {settings.updatedBy && (
                <div>
                  <p className="text-gray-500">Last Updated By</p>
                  <p className="font-semibold text-gray-900 truncate">
                    {settings.updatedBy}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
