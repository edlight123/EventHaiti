'use client'

import React from 'react'
import { EventFilters, DEFAULT_FILTERS } from '@/lib/filters/types'
import { CATEGORIES, PRICE_FILTERS, CITY_CONFIG } from '@/lib/filters/config'
import { FilterChip } from './FilterChip'
import { format } from 'date-fns'

interface FilterChipsRowProps {
  filters: EventFilters
  onRemoveFilter: (key: keyof EventFilters, value?: string) => void
  onClearAll: () => void
}

export function FilterChipsRow({ filters, onRemoveFilter, onClearAll }: FilterChipsRowProps) {
  const chips: Array<{ key: keyof EventFilters; label: string; value?: string }> = []

  // Date filter
  if (filters.date !== DEFAULT_FILTERS.date) {
    let dateLabel = ''
    switch (filters.date) {
      case 'today': dateLabel = 'Today'; break
      case 'tomorrow': dateLabel = 'Tomorrow'; break
      case 'this-week': dateLabel = 'This week'; break
      case 'this-weekend': dateLabel = 'This weekend'; break
      case 'pick-date': 
        dateLabel = filters.pickedDate ? format(new Date(filters.pickedDate), 'MMM d, yyyy') : 'Pick a date'
        break
    }
    if (dateLabel) {
      chips.push({ key: 'date', label: dateLabel })
    }
  }

  // City filter
  if (filters.city) {
    chips.push({ key: 'city', label: filters.city })
  }

  // Commune filter
  if (filters.commune) {
    const locationLabel = CITY_CONFIG[filters.city]?.type === 'commune' ? 'Commune' : 'Neighborhood'
    chips.push({ key: 'commune', label: `${locationLabel}: ${filters.commune}` })
  }

  // Category filters
  filters.categories.forEach(category => {
    chips.push({ key: 'categories', label: category, value: category })
  })

  // Price filter
  if (filters.price !== DEFAULT_FILTERS.price) {
    const priceConfig = PRICE_FILTERS.find(p => p.value === filters.price)
    if (priceConfig) {
      chips.push({ key: 'price', label: priceConfig.label })
    }
  }

  // Event type filter
  if (filters.eventType !== DEFAULT_FILTERS.eventType) {
    const typeLabel = filters.eventType === 'in-person' ? 'In-person' : 'Online'
    chips.push({ key: 'eventType', label: typeLabel })
  }

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <span className="text-sm font-medium text-gray-700">Active filters:</span>
      {chips.map((chip, index) => (
        <FilterChip
          key={`${chip.key}-${chip.value || index}`}
          label={chip.label}
          onRemove={() => onRemoveFilter(chip.key, chip.value)}
        />
      ))}
      <button
        onClick={onClearAll}
        className="text-sm text-gray-600 hover:text-gray-900 underline ml-2"
      >
        Clear all
      </button>
    </div>
  )
}
