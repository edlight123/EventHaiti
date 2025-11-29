/**
 * Utility functions for event filters
 */

import { EventFilters, DEFAULT_FILTERS, DateFilter } from './types'
import { PRICE_FILTERS } from './config'

/**
 * Calculate date range for a date filter option
 */
export function getDateRange(filter: DateFilter, pickedDate?: string): { start?: Date; end?: Date } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  switch (filter) {
    case 'any':
      return {}
    
    case 'today':
      const endOfToday = new Date(today)
      endOfToday.setHours(23, 59, 59, 999)
      return { start: today, end: endOfToday }
    
    case 'tomorrow':
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const endOfTomorrow = new Date(tomorrow)
      endOfTomorrow.setHours(23, 59, 59, 999)
      return { start: tomorrow, end: endOfTomorrow }
    
    case 'this-week':
      const weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() + 7)
      weekEnd.setHours(23, 59, 59, 999)
      return { start: today, end: weekEnd }
    
    case 'this-weekend':
      // Find next Saturday and Sunday
      const dayOfWeek = now.getDay()
      const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7 // If today is Saturday, get next Saturday
      const saturday = new Date(today)
      saturday.setDate(today.getDate() + daysUntilSaturday)
      
      const sunday = new Date(saturday)
      sunday.setDate(saturday.getDate() + 1)
      sunday.setHours(23, 59, 59, 999)
      
      return { start: saturday, end: sunday }
    
    case 'pick-date':
      if (!pickedDate) return {}
      const picked = new Date(pickedDate)
      const endOfPicked = new Date(picked)
      endOfPicked.setHours(23, 59, 59, 999)
      return { start: picked, end: endOfPicked }
    
    default:
      return {}
  }
}

/**
 * Get price range for a price filter
 */
export function getPriceRange(priceFilter: string): { min?: number; max?: number } {
  if (priceFilter === 'any') {
    return {}
  }
  
  if (priceFilter === 'free') {
    return { min: 0, max: 0 }
  }
  
  const config = PRICE_FILTERS.find(p => p.value === priceFilter)
  
  if (!config) {
    return {}
  }
  
  // Type guard to check if config has min/max properties
  if ('min' in config && 'max' in config) {
    return {
      min: config.min,
      max: config.max === Infinity ? undefined : config.max
    }
  }
  
  return {}
}

/**
 * Count active filters (excluding defaults)
 */
export function countActiveFilters(filters: EventFilters): number {
  let count = 0
  
  // Date filter
  if (filters.date !== DEFAULT_FILTERS.date) count++
  
  // Location filters
  if (filters.city) count++
  if (filters.commune) count++
  
  // Categories
  if (filters.categories.length > 0) count++
  
  // Price
  if (filters.price !== DEFAULT_FILTERS.price) count++
  
  // Event type
  if (filters.eventType !== DEFAULT_FILTERS.eventType) count++
  
  return count
}

/**
 * Check if filters have changed from defaults
 */
export function hasActiveFilters(filters: EventFilters): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * Serialize filters to URL query string
 */
export function serializeFilters(filters: EventFilters): URLSearchParams {
  const params = new URLSearchParams()
  
  // Date
  if (filters.date !== 'any') {
    params.set('date', filters.date)
    if (filters.date === 'pick-date' && filters.pickedDate) {
      params.set('pickedDate', filters.pickedDate)
    }
  }
  
  // Location
  if (filters.city) {
    params.set('city', filters.city)
    if (filters.commune) {
      params.set('commune', filters.commune)
    }
  }
  
  // Categories
  if (filters.categories.length > 0) {
    params.set('categories', filters.categories.join(','))
  }
  
  // Price
  if (filters.price !== 'any') {
    params.set('price', filters.price)
  }
  
  // Event type
  if (filters.eventType !== 'all') {
    params.set('eventType', filters.eventType)
  }
  
  // Sort
  if (filters.sortBy !== 'relevance') {
    params.set('sort', filters.sortBy)
  }
  
  return params
}

/**
 * Parse filters from URL query string
 */
export function parseFiltersFromURL(searchParams: URLSearchParams): EventFilters {
  return {
    date: (searchParams.get('date') as DateFilter) || DEFAULT_FILTERS.date,
    pickedDate: searchParams.get('pickedDate') || undefined,
    city: searchParams.get('city') || '',
    commune: searchParams.get('commune') || undefined,
    categories: searchParams.get('categories')?.split(',').filter(Boolean) || [],
    price: searchParams.get('price') || DEFAULT_FILTERS.price,
    eventType: searchParams.get('eventType') || DEFAULT_FILTERS.eventType,
    sortBy: searchParams.get('sort') || DEFAULT_FILTERS.sortBy,
  } as EventFilters
}

/**
 * Check if two filter sets are equal
 */
export function filtersEqual(a: EventFilters, b: EventFilters): boolean {
  return (
    a.date === b.date &&
    a.pickedDate === b.pickedDate &&
    a.city === b.city &&
    a.commune === b.commune &&
    a.categories.join(',') === b.categories.join(',') &&
    a.price === b.price &&
    a.eventType === b.eventType &&
    a.sortBy === b.sortBy
  )
}

/**
 * Reset filters to defaults
 */
export function resetFilters(): EventFilters {
  return { ...DEFAULT_FILTERS }
}
