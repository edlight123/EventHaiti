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
  | 'custom'

export type EventTypeFilter = 'all' | 'in-person' | 'online'

export type SortOption = 'relevance' | 'date'

export interface EventFilters {
  // Date
  date: DateFilter
  pickedDate?: string // ISO date string when date === 'pick-date'
  
  // Location
  country?: string // Country code (HT, US, CA, FR, DO)
  city: string
  commune?: string // Populated based on city selection
  
  // Category (support multi-select)
  categories: string[]
  
  // Price
  price: PriceFilter
  customPriceRange?: { min: number; max: number }
  
  // Event type
  eventType: EventTypeFilter
  
  // Sort
  sortBy: SortOption
}

export const DEFAULT_FILTERS: EventFilters = {
  date: 'any',
  country: 'HT',
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

// Countries
export const COUNTRIES = [
  { code: 'HT', name: 'Haiti' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'FR', name: 'France' },
  { code: 'DO', name: 'Dominican Republic' }
]

// Cities by country
export const CITIES_BY_COUNTRY: Record<string, string[]> = {
  'HT': [
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
  ],
  'US': [
    'New York, NY',
    'Los Angeles, CA',
    'Miami, FL',
    'Houston, TX',
    'Chicago, IL',
    'Atlanta, GA',
    'Boston, MA',
    'Orlando, FL'
  ],
  'CA': [
    'Toronto, ON',
    'Montreal, QC',
    'Vancouver, BC',
    'Calgary, AB',
    'Ottawa, ON'
  ],
  'FR': [
    'Paris',
    'Lyon',
    'Marseille',
    'Nice',
    'Toulouse',
    'Bordeaux'
  ],
  'DO': [
    'Santo Domingo',
    'Santiago',
    'Punta Cana',
    'La Romana',
    'Puerto Plata'
  ]
}

// Backward compatibility: Haiti cities as default
export const CITIES = CITIES_BY_COUNTRY['HT']

// Price filter configurations
export const PRICE_FILTERS = [
  { value: 'any' as const, label: 'Any price' },
  { value: 'free' as const, label: 'Free' },
  { value: '<=500' as const, label: '≤ 500 HTG', min: 0, max: 500 },
  { value: '>500' as const, label: '> 500 HTG', min: 500, max: Infinity },
  { value: 'custom' as const, label: 'Custom range' }
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
