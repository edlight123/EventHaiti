/**
 * Filter types for event listing - matching web PWA
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
  
  // Category (support multi-select)
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

// All available categories
export const CATEGORIES = [
  'Music',
  'Sports',
  'Arts & Culture',
  'Business',
  'Food & Drink',
  'Education',
  'Technology',
  'Health & Wellness',
  'Party',
  'Religious',
  'Other'
]

// Haiti cities
export const CITIES = [
  'Port-au-Prince',
  'Cap-Haïtien',
  'Jacmel',
  'Gonaïves',
  'Les Cayes',
  'Saint-Marc',
  'Pétion-Ville',
  'Delmas',
  'Carrefour',
  'Port-de-Paix',
  'Jérémie',
  'Fort-Liberté'
]

// Price filter configurations
export const PRICE_FILTERS = [
  { value: 'any' as const, label: 'Any price' },
  { value: 'free' as const, label: 'Free' },
  { value: '<=500' as const, label: '≤ 500 HTG', min: 0, max: 500 },
  { value: '>500' as const, label: '> 500 HTG', min: 500, max: Infinity }
]

// Date filter options
export const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'any', label: 'Any date' },
  { value: 'today', label: 'Today' },
  { value: 'tomorrow', label: 'Tomorrow' },
  { value: 'this-week', label: 'This week' },
  { value: 'this-weekend', label: 'This weekend' },
  { value: 'pick-date', label: 'Pick a date' }
]

// Event type options
export const EVENT_TYPE_OPTIONS: { value: EventTypeFilter; label: string }[] = [
  { value: 'all', label: 'All events' },
  { value: 'in-person', label: 'In-person' },
  { value: 'online', label: 'Online' }
]
