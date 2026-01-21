'use client'

import { useState } from 'react'
import { FileText, TrendingUp, Wallet } from 'lucide-react'
import { AdminBreadcrumbs } from './AdminBreadcrumbs'

interface PayoutOperationsClientProps {
  pendingPayoutsContent: React.ReactNode
  eventSettlementsContent: React.ReactNode
  withdrawalsContent: React.ReactNode
}

type TabId = 'pending' | 'settlements' | 'withdrawals'

interface Tab {
  id: TabId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export function PayoutOperationsClient({
  pendingPayoutsContent,
  eventSettlementsContent,
  withdrawalsContent,
}: PayoutOperationsClientProps) {
  const [activeTab, setActiveTab] = useState<TabId>('settlements')

  const tabs: Tab[] = [
    {
      id: 'pending',
      label: 'Pending Requests',
      icon: FileText,
    },
    {
      id: 'settlements',
      label: 'Event Settlements',
      icon: TrendingUp,
    },
    {
      id: 'withdrawals',
      label: 'Withdrawal History',
      icon: Wallet,
    },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <AdminBreadcrumbs items={[{ label: 'Payout Operations' }]} />
      
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payout Operations</h1>
        <p className="mt-2 text-gray-600">
          Manage event disbursements, pending requests, and withdrawal history
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm
                  transition-colors
                  ${isActive
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-teal-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
                <span>{tab.label}</span>
                {tab.badge && tab.badge > 0 && (
                  <span className="ml-2 py-0.5 px-2 rounded-full text-xs font-medium bg-red-100 text-red-600">
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'pending' && (
          <div>
            {pendingPayoutsContent}
          </div>
        )}
        
        {activeTab === 'settlements' && (
          <div>
            {eventSettlementsContent}
          </div>
        )}
        
        {activeTab === 'withdrawals' && (
          <div>
            {withdrawalsContent}
          </div>
        )}
      </div>
    </div>
  )
}
