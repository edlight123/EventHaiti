import Link from 'next/link'
import { CreditCard, AlertCircle, CheckCircle, Clock, DollarSign } from 'lucide-react'

interface PayoutsWidgetProps {
  status: 'not-setup' | 'setup' | 'pending' | 'active'
  pendingBalance?: number
  lastPayout?: {
    amount: number
    date: string
  }
  nextPayout?: {
    amount: number
    estimatedDate: string
  }
}

export function PayoutsWidget({ status, pendingBalance = 0, lastPayout, nextPayout }: PayoutsWidgetProps) {
  const getStatusInfo = () => {
    switch (status) {
      case 'not-setup':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          iconBg: 'bg-red-50',
          iconColor: 'text-red-600',
          title: 'Payouts not set up',
          description: 'Connect your bank account to receive payments',
          ctaText: 'Setup Payouts',
          ctaHref: '/organizer/settings/payouts',
          ctaColor: 'bg-red-600 hover:bg-red-700'
        }
      case 'setup':
        return {
          icon: <CheckCircle className="w-5 h-5" />,
          iconBg: 'bg-green-50',
          iconColor: 'text-green-600',
          title: 'Payouts ready',
          description: 'Your account is set up and ready to receive payments',
          ctaText: 'View Settings',
          ctaHref: '/organizer/settings/payouts',
          ctaColor: 'bg-green-600 hover:bg-green-700'
        }
      case 'pending':
        return {
          icon: <Clock className="w-5 h-5" />,
          iconBg: 'bg-yellow-50',
          iconColor: 'text-yellow-600',
          title: 'Payout pending',
          description: 'Your payout is being processed',
          ctaText: 'View Details',
          ctaHref: '/organizer/payouts',
          ctaColor: 'bg-yellow-600 hover:bg-yellow-700'
        }
      case 'active':
        return {
          icon: <DollarSign className="w-5 h-5" />,
          iconBg: 'bg-blue-50',
          iconColor: 'text-blue-600',
          title: 'Payouts active',
          description: 'Regular payouts are being processed',
          ctaText: 'View History',
          ctaHref: '/organizer/payouts',
          ctaColor: 'bg-blue-600 hover:bg-blue-700'
        }
    }
  }

  const statusInfo = getStatusInfo()

  return (
    <div className="bg-white rounded-2xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className={`w-12 h-12 ${statusInfo.iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <div className={statusInfo.iconColor}>
            {statusInfo.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 text-lg mb-1">{statusInfo.title}</h3>
          <p className="text-sm text-gray-600">{statusInfo.description}</p>
        </div>
      </div>

      {/* Payout Details */}
      {status !== 'not-setup' && (
        <div className="space-y-4 mb-6">
          {/* Pending Balance */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Pending Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              ${(pendingBalance / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          {/* Last Payout */}
          {lastPayout && (
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div>
                <p className="text-sm font-semibold text-gray-900">Last Payout</p>
                <p className="text-xs text-gray-600">
                  {new Date(lastPayout.date).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <p className="text-lg font-bold text-green-600">
                +${(lastPayout.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}

          {/* Next Payout Estimate */}
          {nextPayout && nextPayout.amount > 0 && (
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-gray-900">Next Payout (Est.)</p>
                <p className="text-xs text-gray-600">
                  {new Date(nextPayout.estimatedDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <p className="text-lg font-bold text-blue-600">
                ${(nextPayout.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* CTA Button */}
      <Link
        href={statusInfo.ctaHref}
        className={`block w-full text-center px-4 py-3 ${statusInfo.ctaColor} text-white rounded-xl font-semibold transition-colors`}
      >
        {statusInfo.ctaText}
      </Link>

      {status !== 'not-setup' && (
        <p className="text-xs text-gray-500 text-center mt-3">
          Payouts are processed within 2-5 business days
        </p>
      )}
    </div>
  )
}
