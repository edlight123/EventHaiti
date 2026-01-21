'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  TrendingUp, 
  Users, 
  Calendar, 
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  Settings,
  Activity,
  Zap
} from 'lucide-react'

interface QuickAction {
  title: string
  description: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  urgent?: boolean
  badge?: number
}

interface AdminDashboardQuickActionsProps {
  pendingVerifications?: number
  pendingBankVerifications?: number
  pendingPayouts?: number
  urgentTasks?: number
}

export function AdminDashboardQuickActions({
  pendingVerifications = 0,
  pendingBankVerifications = 0,
  pendingPayouts = 0,
  urgentTasks = 0
}: AdminDashboardQuickActionsProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const quickActions: QuickAction[] = [
    {
      title: 'Review Verifications',
      description: 'Process organizer identity verifications',
      href: '/admin/verify',
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      badge: pendingVerifications,
      urgent: pendingVerifications > 0
    },
    {
      title: 'Bank Verifications',
      description: 'Review bank account verifications',
      href: '/admin/bank-verifications', 
      icon: CreditCard,
      color: 'from-blue-500 to-blue-600',
      badge: pendingBankVerifications,
      urgent: pendingBankVerifications > 5
    },
    {
      title: 'Payout Operations',
      description: 'Manage event settlements and withdrawals',
      href: '/admin/disbursements',
      icon: DollarSign,
      color: 'from-teal-500 to-teal-600',
      badge: pendingPayouts
    },
    {
      title: 'Revenue Analytics',
      description: 'View platform performance metrics',
      href: '/admin/analytics',
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600'
    },
    {
      title: 'User Management',
      description: 'Manage platform users and organizers',
      href: '/admin/users',
      icon: Users,
      color: 'from-orange-500 to-orange-600'
    },
    {
      title: 'Event Moderation',
      description: 'Review and moderate events',
      href: '/admin/events',
      icon: Calendar,
      color: 'from-pink-500 to-pink-600'
    },
    {
      title: 'Security Dashboard',
      description: 'Monitor platform security and threats',
      href: '/admin/security',
      icon: AlertTriangle,
      color: 'from-red-500 to-red-600'
    },
    {
      title: 'Platform Settings',
      description: 'Configure system settings',
      href: '/admin/settings',
      icon: Settings,
      color: 'from-gray-500 to-gray-600'
    }
  ]

  // Sort actions to put urgent ones first
  const sortedActions = [...quickActions].sort((a, b) => {
    if (a.urgent && !b.urgent) return -1
    if (!a.urgent && b.urgent) return 1
    if (a.badge && b.badge) return b.badge - a.badge
    if (a.badge && !b.badge) return -1
    if (!a.badge && b.badge) return 1
    return 0
  })

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Quick Actions
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Fast access to common admin tasks
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {urgentTasks > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
              <AlertTriangle className="w-3 h-3" />
              {urgentTasks} urgent
            </div>
          )}
          
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white text-gray-900 shadow-sm' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {sortedActions.map((action, index) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className={`group relative bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${
                  action.urgent ? 'ring-2 ring-red-200 ring-opacity-50' : ''
                }`}
              >
                {action.urgent && (
                  <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-pulse" />
                )}
                
                {action.badge !== undefined && action.badge > 0 && (
                  <div className="absolute -top-2 -right-2 min-w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-2">
                    {action.badge > 99 ? '99+' : action.badge}
                  </div>
                )}

                <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                
                <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  {action.title}
                </h3>
                
                <p className="text-sm text-gray-500 leading-relaxed">
                  {action.description}
                </p>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {sortedActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-4 p-4 hover:bg-gray-50 transition-colors"
              >
                <div className={`w-10 h-10 bg-gradient-to-br ${action.color} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                      {action.title}
                    </h3>
                    {action.urgent && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{action.description}</p>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                  {action.badge !== undefined && action.badge > 0 && (
                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      {action.badge}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-gray-400 group-hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}