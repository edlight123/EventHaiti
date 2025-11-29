'use client'

import { SlidersHorizontal } from 'lucide-react'
import { EventFilters } from '@/lib/filters/types'
import { countActiveFilters } from '@/lib/filters/utils'

interface EventSearchFiltersProps {
  filters: EventFilters
  onOpenFilters: () => void
}

export default function EventSearchFilters({ filters, onOpenFilters }: EventSearchFiltersProps) {
  const activeCount = countActiveFilters(filters)
  
  return (
    <div className="flex items-center justify-between gap-4">
      <button
        onClick={onOpenFilters}
        className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-gray-200 hover:border-brand-300 rounded-xl transition-all shadow-sm hover:shadow-md font-medium text-gray-700 hover:text-brand-700"
      >
        <SlidersHorizontal className="w-5 h-5" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-brand-500 text-white text-xs font-bold rounded-full">
            {activeCount}
          </span>
        )}
      </button>
      
      {activeCount > 0 && (
        <p className="text-sm text-gray-600">
          {activeCount} filter{activeCount !== 1 ? 's' : ''} active
        </p>
      )}
    </div>
  )
}
