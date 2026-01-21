'use client'

import { useState, useEffect } from 'react'
import { 
  Activity,
  User,
  Calendar,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ChevronRight,
  Filter,
  RefreshCw
} from 'lucide-react'
import Link from 'next/link'

interface AdminActivity {
  id: string
  type: 'user_action' | 'verification' | 'payment' | 'event' | 'security' | 'system'
  title: string
  description: string
  timestamp: string
  actor?: {
    name: string
    email?: string
    role: string
  }
  metadata?: {
    amount?: number
    currency?: string
    eventId?: string
    userId?: string
    severity?: 'low' | 'medium' | 'high' | 'critical'
  }
  link?: string
}

interface AdminActivityFeedProps {
  recentActivities?: any[]
  maxItems?: number
}

export function AdminActivityFeed({ 
  recentActivities = [], 
  maxItems = 20 
}: AdminActivityFeedProps) {
  const [activities, setActivities] = useState<AdminActivity[]>([])
  const [filteredActivities, setFilteredActivities] = useState<AdminActivity[]>([])
  const [filter, setFilter] = useState<string>('all')
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact')

  // Transform the incoming data into our AdminActivity format
  useEffect(() => {
    const transformedActivities: AdminActivity[] = [
      // Mock recent activities - in real implementation, these would come from the API
      {
        id: '1',
        type: 'verification',
        title: 'New organizer verification',
        description: 'John Doe submitted identity verification documents',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        actor: {
          name: 'John Doe',
          email: 'john@example.com',
          role: 'organizer'
        },
        link: '/admin/verify',
        metadata: {
          severity: 'medium'
        }
      },
      {
        id: '2', 
        type: 'payment',
        title: 'Payout request approved',
        description: 'Approved payout of 15,000 HTG for Event ABC',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        actor: {
          name: 'Admin User',
          role: 'admin'
        },
        metadata: {
          amount: 15000,
          currency: 'HTG',
          eventId: 'abc123'
        },
        link: '/admin/disbursements'
      },
      {
        id: '3',
        type: 'event',
        title: 'Event published',
        description: 'Music Festival 2024 was published and is now live',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        actor: {
          name: 'Marie Laurent',
          email: 'marie@events.com',
          role: 'organizer'
        },
        link: '/admin/events'
      },
      {
        id: '4',
        type: 'security',
        title: 'Suspicious login attempt',
        description: 'Multiple failed login attempts detected from IP 192.168.1.100',
        timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
        metadata: {
          severity: 'high'
        },
        link: '/admin/security'
      },
      {
        id: '5',
        type: 'user_action',
        title: 'User account deactivated',
        description: 'User account for spam violations was deactivated',
        timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        actor: {
          name: 'Admin User',
          role: 'admin'
        },
        link: '/admin/users'
      },
      {
        id: '6',
        type: 'system',
        title: 'Daily backup completed',
        description: 'Automated database backup completed successfully',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        metadata: {
          severity: 'low'
        }
      }
    ]

    // Add any real activities from props
    recentActivities.forEach((activity, index) => {
      if (activity && typeof activity === 'object') {
        transformedActivities.push({
          id: `real-${index}`,
          type: 'event',
          title: activity.action || 'Activity',
          description: activity.details || 'Recent platform activity',
          timestamp: activity.timestamp || new Date().toISOString(),
          actor: activity.actor ? {
            name: activity.actor.name || 'Unknown',
            email: activity.actor.email,
            role: activity.actor.role || 'user'
          } : undefined
        })
      }
    })

    setActivities(transformedActivities.slice(0, maxItems))
  }, [recentActivities, maxItems])

  useEffect(() => {
    if (filter === 'all') {
      setFilteredActivities(activities)
    } else {
      setFilteredActivities(activities.filter(activity => activity.type === filter))
    }
  }, [activities, filter])

  const getActivityIcon = (type: string, severity?: string) => {
    switch (type) {
      case 'verification':
        return Shield
      case 'payment':
        return DollarSign
      case 'event':
        return Calendar
      case 'security':
        return AlertTriangle
      case 'user_action':
        return User
      case 'system':
        return CheckCircle
      default:
        return Activity
    }
  }

  const getActivityColor = (type: string, severity?: string) => {
    if (severity === 'critical') return 'text-red-600 bg-red-50'
    if (severity === 'high') return 'text-orange-600 bg-orange-50'
    
    switch (type) {
      case 'verification':
        return 'text-blue-600 bg-blue-50'
      case 'payment':
        return 'text-green-600 bg-green-50'
      case 'event':
        return 'text-purple-600 bg-purple-50'
      case 'security':
        return 'text-red-600 bg-red-50'
      case 'user_action':
        return 'text-yellow-600 bg-yellow-50'
      case 'system':
        return 'text-gray-600 bg-gray-50'
      default:
        return 'text-blue-600 bg-blue-50'
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Just now'
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}h ago`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}d ago`
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }

  const filterOptions = [
    { value: 'all', label: 'All Activities', count: activities.length },
    { value: 'verification', label: 'Verifications', count: activities.filter(a => a.type === 'verification').length },
    { value: 'payment', label: 'Payments', count: activities.filter(a => a.type === 'payment').length },
    { value: 'security', label: 'Security', count: activities.filter(a => a.type === 'security').length },
    { value: 'event', label: 'Events', count: activities.filter(a => a.type === 'event').length },
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Admin Activity Feed
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Recent platform activities and admin actions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              title={`Switch to ${viewMode === 'compact' ? 'detailed' : 'compact'} view`}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50"
              title="Refresh activities"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2">
          {filterOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setFilter(option.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === option.value
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {option.label}
              {option.count > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-xs ${
                  filter === option.value ? 'bg-blue-200' : 'bg-gray-200'
                }`}>
                  {option.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Activities List */}
      <div className="flex-1 overflow-y-auto">
        {filteredActivities.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredActivities.map((activity) => {
              const Icon = getActivityIcon(activity.type, activity.metadata?.severity)
              const colorClasses = getActivityColor(activity.type, activity.metadata?.severity)
              
              return (
                <div
                  key={activity.id}
                  className="p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClasses}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTimeAgo(activity.timestamp)}
                          </span>
                          {activity.link && (
                            <Link
                              href={activity.link}
                              className="text-blue-500 hover:text-blue-600"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2">
                        {activity.description}
                      </p>
                      
                      {viewMode === 'detailed' && (
                        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                          {activity.actor && (
                            <span>
                              by {activity.actor.name} ({activity.actor.role})
                            </span>
                          )}
                          {activity.metadata?.amount && (
                            <span>
                              {activity.metadata.amount.toLocaleString()} {activity.metadata.currency}
                            </span>
                          )}
                          {activity.metadata?.severity && (
                            <span className={`px-2 py-0.5 rounded-full ${
                              activity.metadata.severity === 'critical' 
                                ? 'bg-red-100 text-red-700'
                                : activity.metadata.severity === 'high'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {activity.metadata.severity}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}