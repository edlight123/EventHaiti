'use client'

import { Info } from 'lucide-react'

export function FeesAndRulesCard() {
  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Info className="w-6 h-6 text-teal-600" />
        <h3 className="text-xl font-bold text-gray-900">Fees & Rules</h3>
      </div>

      <div className="space-y-6">
        {/* Platform Fee */}
        <div className="p-4 bg-teal-50 border border-teal-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-teal-900">Platform Fee</h4>
            <span className="text-2xl font-bold text-teal-700">5%</span>
          </div>
          <p className="text-sm text-teal-800">
            Charged on each ticket sale. Includes payment processing, hosting, and platform features.
          </p>
        </div>

        {/* Processing Fee */}
        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <div className="flex items-baseline justify-between mb-2">
            <h4 className="font-semibold text-gray-900">Payment Processing Fee</h4>
            <span className="text-lg font-bold text-gray-700">2.9% + $0.30</span>
          </div>
          <p className="text-sm text-gray-600">
            Charged by payment processor (Stripe) on each transaction. Deducted before payout.
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
              <span>Minimum payout amount: <strong>$50.00</strong></span>
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
              <span className="font-mono">$100.00</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>Platform fee (5%):</span>
              <span className="font-mono">-$5.00</span>
            </div>
            <div className="flex justify-between text-blue-700">
              <span>Processing fee (2.9% + $0.30):</span>
              <span className="font-mono">-$3.20</span>
            </div>
            <div className="h-px bg-blue-300 my-2" />
            <div className="flex justify-between text-blue-900 font-bold">
              <span>Your payout:</span>
              <span className="font-mono">$91.80</span>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-600 leading-relaxed">
            <strong>Note:</strong> Fees may vary based on payment method and location. Refunds are 
            deducted from your next payout. All amounts shown in USD. Contact support for questions 
            about specific transactions or fee structures.
          </p>
        </div>
      </div>
    </div>
  )
}
