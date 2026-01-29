'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { EventFilters, DateFilter, EventTypeFilter, PriceFilter } from '@/lib/filters/types'
import { CATEGORIES, getCitiesForCountry, getPriceFiltersForCountry, getSubdivisions, getLocationTypeLabel, hasSubdivisions } from '@/lib/filters/config'
import { countActiveFilters, filtersEqual } from '@/lib/filters/utils'
import { FilterChip } from './FilterChip'

interface FiltersModalProps {
  isOpen: boolean
  draftFilters: EventFilters
  appliedFilters: EventFilters
  onClose: () => void
  onApply: () => void
  onReset: () => void
  onDraftChange: (filters: EventFilters) => void
  userCountry?: string
}

export function FiltersModal({
  isOpen,
  draftFilters,
  appliedFilters,
  onClose,
  onApply,
  onReset,
  onDraftChange,
  userCountry = 'HT'
}: FiltersModalProps) {
  const { t } = useTranslation('common')
  const [mounted, setMounted] = useState(false)
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Get country-specific options
  const cities = getCitiesForCountry(userCountry)
  const priceFilters = getPriceFiltersForCountry(userCountry)

  const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
    { value: 'any', label: t('filters.any_date') },
    { value: 'today', label: t('filters.today') },
    { value: 'tomorrow', label: t('filters.tomorrow') },
    { value: 'this-week', label: t('filters.this_week') },
    { value: 'this-weekend', label: t('filters.this_weekend') },
    { value: 'pick-date', label: t('filters.pick_date') }
  ]

  const EVENT_TYPE_OPTIONS: { value: EventTypeFilter; label: string }[] = [
    { value: 'all', label: t('filters.all') },
    { value: 'in-person', label: t('filters.in_person') },
    { value: 'online', label: t('filters.online') }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    setShowDatePicker(draftFilters.date === 'pick-date')
  }, [draftFilters.date])

  if (!mounted || !isOpen) return null

  const hasChanges = !filtersEqual(draftFilters, appliedFilters)
  const activeCount = countActiveFilters(draftFilters)
  const subdivisions = draftFilters.city ? getSubdivisions(draftFilters.city, userCountry) : []
  const locationLabel = draftFilters.city ? getLocationTypeLabel(draftFilters.city, userCountry) : 'Area'
  const hasLocation = hasSubdivisions(draftFilters.city, userCountry)

  const handleDateChange = (date: DateFilter) => {
    onDraftChange({ ...draftFilters, date, pickedDate: date === 'pick-date' ? draftFilters.pickedDate : undefined })
  }

  const handleCityChange = (city: string) => {
    onDraftChange({ ...draftFilters, city, commune: undefined })
  }

  const handleCommuneChange = (commune: string) => {
    onDraftChange({ ...draftFilters, commune })
  }

  const handleCategoryToggle = (category: string) => {
    const categories = draftFilters.categories.includes(category)
      ? draftFilters.categories.filter(c => c !== category)
      : [...draftFilters.categories, category]
    onDraftChange({ ...draftFilters, categories })
  }

  const content = (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal/Sheet */}
      <div className="fixed inset-0 z-50 flex items-end md:items-center md:justify-center p-0 md:p-4 pointer-events-none">
        <div 
          className="pointer-events-auto bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-[640px] md:rounded-2xl md:shadow-2xl md:border flex flex-col overflow-hidden animate-in slide-in-from-bottom md:slide-in-from-bottom-0 md:zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{t('filters.filters')}</h2>
              {activeCount > 0 && (
                <span className="text-sm text-gray-500">({activeCount} {t('filters.active')})</span>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Date Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">{t('filters.date')}</label>
              <div className="flex flex-wrap gap-2">
                {DATE_OPTIONS.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.date === option.value}
                    onClick={() => handleDateChange(option.value)}
                  />
                ))}
              </div>
              {showDatePicker && (
                <input
                  type="date"
                  value={draftFilters.pickedDate || ''}
                  onChange={(e) => onDraftChange({ ...draftFilters, pickedDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent"
                />
              )}
            </div>

            {/* Event Type - Segmented Control */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">{t('filters.event_type')}</label>
              <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-gray-50">
                {EVENT_TYPE_OPTIONS.map(option => (
                  <button
                    key={option.value}
                    onClick={() => onDraftChange({ ...draftFilters, eventType: option.value })}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all
                      ${draftFilters.eventType === option.value
                        ? 'bg-white text-black shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">{t('filters.price')}</label>
              <div className="flex flex-wrap gap-2">
                {priceFilters.map(option => (
                  <FilterChip
                    key={option.value}
                    label={option.label}
                    active={draftFilters.price === option.value}
                    onClick={() => onDraftChange({ ...draftFilters, price: option.value as PriceFilter })}
                  />
                ))}
              </div>
            </div>

            {/* Category Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">{t('filters.categories')}</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(category => (
                  <FilterChip
                    key={category}
                    label={category}
                    active={draftFilters.categories.includes(category)}
                    onClick={() => handleCategoryToggle(category)}
                  />
                ))}
              </div>
            </div>

            {/* Location Filter */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gray-700">{t('filters.location')}</label>
              <div className="space-y-3">
                {/* City Dropdown */}
                <select
                  value={draftFilters.city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                >
                  <option value="">{t('filters.all_cities')}</option>
                  {cities.map(city => (
                    <option key={city} value={city}>{city}</option>
                  ))}
                </select>

                {/* Commune/Neighborhood Dropdown */}
                {hasLocation && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-600">{locationLabel}</label>
                    <select
                      value={draftFilters.commune || ''}
                      onChange={(e) => handleCommuneChange(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                    >
                      <option value="">{t('filters.all_areas')} {locationLabel.toLowerCase()}s</option>
                      {subdivisions.map(subdivision => (
                        <option key={subdivision} value={subdivision}>{subdivision}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer - Sticky */}
          <div className="sticky bottom-0 bg-white/80 backdrop-blur border-t p-4 flex items-center justify-between gap-3">
            <button
              onClick={onReset}
              className="px-4 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {t('filters.reset')}
            </button>
            <button
              onClick={onApply}
              disabled={!hasChanges}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${hasChanges
                  ? 'bg-black text-white hover:bg-black/90 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
            >
              {t('filters.apply_filters')}
            </button>
          </div>
        </div>
      </div>
    </>
  )

  return createPortal(content, document.body)
}
