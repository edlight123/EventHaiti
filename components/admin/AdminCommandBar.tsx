'use client'

import { useState } from 'react'
import { Search, Bell, Calendar, Users, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

interface AdminCommandBarProps {
  pendingVerifications: number
}

export function AdminCommandBar({ pendingVerifications }: AdminCommandBarProps) {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events, users, orders..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm"
              />
              {searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  <div className="p-4 text-sm text-gray-500 text-center">
                    Search functionality coming soon
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              href="/admin/verify"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify
            </Link>
            <Link
              href="/admin/events"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Events
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Users className="w-4 h-4" />
              Users
            </Link>
          </div>

          {/* Alerts Badge */}
          {pendingVerifications > 0 && (
            <Link
              href="/admin/verify"
              className="relative flex items-center gap-2 px-3 py-2 bg-yellow-50 text-yellow-800 rounded-lg hover:bg-yellow-100 transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {pendingVerifications > 9 ? '9+' : pendingVerifications}
              </span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
