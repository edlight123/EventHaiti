'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

const CATEGORIES = [
  'Music',
  'Sports',
  'Arts & Culture',
  'Business',
  'Food & Drink',
  'Community',
  'Education',
  'Technology',
  'Health & Wellness',
  'Other'
]

const CITIES = [
  'Port-au-Prince',
  'Cap-Haïtien',
  'Gonaïves',
  'Les Cayes',
  'Port-de-Paix',
  'Pétion-Ville',
  'Jacmel',
  'Saint-Marc',
  'Carrefour',
  'Delmas'
]

interface SearchFiltersProps {
  onFilterChange?: (filters: SearchFilters) => void
}

export interface SearchFilters {
  query: string
  category: string
  city: string
  dateFrom: string
  dateTo: string
  priceMin: string
  priceMax: string
  sortBy: 'date' | 'price-low' | 'price-high' | 'popular'
}

export default function EventSearchFilters({ onFilterChange }: SearchFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [filters, setFilters] = useState<SearchFilters>({
    query: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    city: searchParams.get('city') || '',
    dateFrom: searchParams.get('from') || '',
    dateTo: searchParams.get('to') || '',
    priceMin: searchParams.get('min') || '',
    priceMax: searchParams.get('max') || '',
    sortBy: (searchParams.get('sort') as any) || 'date'
  })

  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (onFilterChange) {
      onFilterChange(filters)
    }
    
    // Update URL params
    const params = new URLSearchParams()
    if (filters.query) params.set('q', filters.query)
    if (filters.category) params.set('category', filters.category)
    if (filters.city) params.set('city', filters.city)
    if (filters.dateFrom) params.set('from', filters.dateFrom)
    if (filters.dateTo) params.set('to', filters.dateTo)
    if (filters.priceMin) params.set('min', filters.priceMin)
    if (filters.priceMax) params.set('max', filters.priceMax)
    if (filters.sortBy !== 'date') params.set('sort', filters.sortBy)
    
    const newUrl = params.toString() ? `?${params.toString()}` : ''
    router.replace(newUrl, { scroll: false })
  }, [filters, onFilterChange, router])

  const handleChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }))
  }

  const clearFilters = () => {
    setFilters({
      query: '',
      category: '',
      city: '',
      dateFrom: '',
      dateTo: '',
      priceMin: '',
      priceMax: '',
      sortBy: 'date'
    })
  }

  const activeFiltersCount = [
    filters.dateFrom,
    filters.dateTo,
    filters.priceMin,
    filters.priceMax
  ].filter(Boolean).length

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
      {/* Filter Controls */}
      <div className="flex gap-4 items-center">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-6 py-3 bg-white/90 hover:bg-white rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-5 h-5 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="font-medium text-gray-900">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-teal-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">
              {activeFiltersCount}
            </span>
          )}
        </button>

        <select
          value={filters.sortBy}
          onChange={(e) => handleChange('sortBy', e.target.value)}
          className="px-4 py-3 bg-white/90 hover:bg-white rounded-lg shadow-sm focus:ring-2 focus:ring-white focus:outline-none font-medium text-gray-900"
        >
          <option value="date">Sort: Date</option>
          <option value="price-low">Sort: Price Low to High</option>
          <option value="price-high">Sort: Price High to Low</option>
          <option value="popular">Sort: Most Popular</option>
        </select>

        {activeFiltersCount > 0 && (
          <button
            onClick={clearFilters}
            className="ml-auto text-sm text-white hover:text-teal-100 font-medium flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear filters
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <div className="border-t border-white/20 pt-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                From Date
              </label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleChange('dateFrom', e.target.value)}
                className="w-full px-4 py-2 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                To Date
              </label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleChange('dateTo', e.target.value)}
                className="w-full px-4 py-2 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:outline-none"
              />
            </div>

            {/* Price Min */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Min Price ($)
              </label>
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => handleChange('priceMin', e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:outline-none"
              />
            </div>

            {/* Price Max */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Max Price ($)
              </label>
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => handleChange('priceMax', e.target.value)}
                placeholder="1000"
                className="w-full px-4 py-2 bg-white/90 rounded-lg focus:ring-2 focus:ring-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
