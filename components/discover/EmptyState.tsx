'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

interface EmptyStateProps {
  hasFilters: boolean
}

export function EmptyState({ hasFilters }: EmptyStateProps) {
  const router = useRouter()

  if (!hasFilters) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
        <div className="text-7xl mb-6">📭</div>
        <h3 className="text-2xl font-bold text-gray-900 mb-3">No events available</h3>
        <p className="text-gray-600">Check back soon for upcoming events!</p>
      </div>
    )
  }

  const handleSuggestion = (action: 'any-date' | 'expand-location' | 'online') => {
    const params = new URLSearchParams(window.location.search)
    
    switch (action) {
      case 'any-date':
        params.delete('date')
        params.delete('pickedDate')
        break
      case 'expand-location':
        params.delete('commune')
        break
      case 'online':
        params.set('eventType', 'online')
        break
    }
    
    router.push(`?${params.toString()}`)
  }

  return (
    <div className="text-center py-20 bg-white rounded-3xl shadow-sm">
      <div className="text-7xl mb-6">🔍</div>
      <h3 className="text-2xl font-bold text-gray-900 mb-3">No events found</h3>
      <p className="text-gray-600 mb-8">Try adjusting your filters or explore these suggestions:</p>
      
      <div className="flex flex-wrap justify-center gap-3 max-w-md mx-auto">
        <button
          onClick={() => handleSuggestion('any-date')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Show any date
        </button>
        <button
          onClick={() => handleSuggestion('expand-location')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Expand to city-level
        </button>
        <button
          onClick={() => handleSuggestion('online')}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
        >
          Show online events
        </button>
      </div>
      
      <button
        onClick={() => router.push('/discover')}
        className="mt-8 px-6 py-3 bg-black text-white rounded-lg hover:bg-black/90 transition-colors font-semibold"
      >
        Clear all filters
      </button>
    </div>
  )
}
