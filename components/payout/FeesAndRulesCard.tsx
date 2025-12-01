'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'

export function FeesAndRulesCard() {
  const [currency, setCurrency] = useState<'USD' | 'HTG'>('USD')
  const [location, setLocation] = useState<'haiti' | 'abroad'>('haiti')

  // Fee structures based on currency and location
  const getFeeStructure = () => {
    if (currency === 'USD' && location === 'haiti') {
      return {
        platformFee: '5%',
        processingFee: '2.9% + $0.30',
        ticketPrice: '$100.00',
        platformFeeAmount: '-$5.00',
        processingFeeAmount: '-$3.20',
        payout: '$91.80',
      }
    } else if (currency === 'USD' && location === 'abroad') {
      return {
        platformFee: '7%',
        processingFee: '3.9% + $0.50',
        ticketPrice: '$100.00',
        platformFeeAmount: '-$7.00',
        processingFeeAmount: '-$4.40',
        payout: '$88.60',
      }
    } else if (currency === 'HTG' && location === 'haiti') {
      return {
        platformFee: '5%',
        processingFee: '2.5% + 15 HTG',
        ticketPrice: '5,000 HTG',
        platformFeeAmount: '-250 HTG',
        processingFeeAmount: '-140 HTG',
        payout: '4,610 HTG',
      }
    } else {
      // HTG abroad
      return {
        platformFee: '7%',
        processingFee: '3.5% + 20 HTG',
        ticketPrice: '5,000 HTG',
        platformFeeAmount: '-350 HTG',
        processingFeeAmount: '-195 HTG',
        payout: '4,455 HTG',
      }
    }
  }

  const fees = getFeeStructure()

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Info className="w-6 h-6 text-teal-600" />
        <h3 className="text-xl font-bold text-gray-900">Fees & Rules</h3>
      </div>

      {/* Currency and Location Selector */}
      <div className="mb-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrency('USD')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                currency === 'USD'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              USD
            </button>
            <button
              onClick={() => setCurrency('HTG')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                currency === 'HTG'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              HTG
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Account Location</label>
          <div className="flex gap-2">
            <button
              onClick={() => setLocation('haiti')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                location === 'haiti'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Haiti
            </button>
            <button
              onClick={() => setLocation('abroad')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold text-sm transition-colors ${
                location === 'abroad'
                  ? 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Abroad
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Platform Fee */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-teal-900">Platform Fee</h4>
            <span className="text-2xl font-bold text-teal-700">{fees.platformFee}</span>
          </div>
          <p className="text-sm text-teal-800">
            {location === 'abroad' 
              ? 'Higher fee for international accounts. Includes payment processing, hosting, and platform features.'
              : 'Charged on each ticket sale. Includes payment processing, hosting, and platform features.'}
          </p>
        </div>

        {/* Processing Fee */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Payment Processing Fee</h4>
            <span className="text-lg font-bold text-gray-700">{fees.processingFee}</span>
          </div>
          <p className="text-sm text-gray-600">
            Charged by payment processor on each transaction. Deducted before payout.
          </p>
        </div>

        {/* Payout Rules */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Payout Schedule</h4>
          <ul className="space-y-2">
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-teal-600 font-bold mt-0.5">•</span>
              <span>Payouts are processed every <strong>Friday at 5:00 PM</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-teal-600 font-bold mt-0.5">•</span>
              <span>Minimum payout amount: <strong>{currency === 'USD' ? '$50.00' : '2,500 HTG'}</strong></span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-teal-600 font-bold mt-0.5">•</span>
              <span>Bank transfers take <strong>1-3 business days</strong> to arrive</span>
            </li>
            <li className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-teal-600 font-bold mt-0.5">•</span>
              <span>Mobile money payouts are typically <strong>instant to 24 hours</strong></span>
            </li>
          </ul>
        </div>

        {/* Example Calculation */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <h4 className="font-semibold text-blue-900 mb-3">Example Calculation</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-blue-800">
              <span>Ticket price:</span>
              <span className="font-mono">{fees.ticketPrice}</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>Platform fee ({fees.platformFee}):</span>
              <span className="font-mono">{fees.platformFeeAmount}</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>Processing fee ({fees.processingFee}):</span>
              <span className="font-mono">{fees.processingFeeAmount}</span>
            </div>
            <div className="h-px bg-blue-300 my-2" />
            <div className="flex justify-between text-blue-900 font-bold">
              <span>Your payout:</span>
              <span className="font-mono">{fees.payout}</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Note:</strong> Fees vary based on payment method and location. International accounts 
            have higher fees due to cross-border processing costs. Refunds are deducted from your next payout. 
            Contact support for questions about specific transactions or fee structures.
          </p>
        </div>
      </div>
    </div>
  )
}
