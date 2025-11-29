/**
 * Filter types for event listing
 */

export type DateFilter = 
  | 'any' 
  | 'today' 
  | 'tomorrow' 
  | 'this-week' 
  | 'this-weekend' 
  | 'pick-date'

export type PriceFilter = 
  | 'any' 
  | 'free' 
  | '<=500' 
  | '>500'

export type EventTypeFilter = 'all' | 'in-person' | 'online'

export type SortOption = 'relevance' | 'date'

export interface EventFilters {
  // Date
  date: DateFilter
  pickedDate?: string // ISO date string when date === 'pick-date'
  
  // Location
  city: string
  commune?: string // Populated based on city selection
  
  // Category (support multi-select in future)
  categories: string[]
  
  // Price
  price: PriceFilter
  
  // Event type
  eventType: EventTypeFilter
  
  // Sort
  sortBy: SortOption
}

export const DEFAULT_FILTERS: EventFilters = {
  date: 'any',
  city: '',
  categories: [],
  price: 'any',
  eventType: 'all',
  sortBy: 'relevance'
}

export interface FilterState {
  // Draft filters (in-progress edits in panel)
  draft: EventFilters
  
  // Applied filters (what's actually filtering the list)
  applied: EventFilters
  
  // UI state
  isOpen: boolean
}
