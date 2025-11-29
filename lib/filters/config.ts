/**
 * Configuration for city-specific location filters
 */

export type LocationType = 'commune' | 'neighborhood'

export interface CityConfig {
  name: string
  type: LocationType
  subdivisions: string[]
}

/**
 * City configuration map
 * - Commune: Administrative subdivision (e.g., Port-au-Prince has communes)
 * - Neighborhood: Informal/popular area names
 */
export const CITY_CONFIG: Record<string, CityConfig> = {
  'Port-au-Prince': {
    name: 'Port-au-Prince',
    type: 'commune',
    subdivisions: [
      'Pétion-Ville',
      'Delmas',
      'Tabarre',
      'Carrefour',
      'Cité Soleil',
      'Croix-des-Bouquets',
      'Kenscoff',
      'Gressier'
    ]
  },
  'Cap-Haïtien': {
    name: 'Cap-Haïtien',
    type: 'neighborhood',
    subdivisions: [
      'Centre-Ville',
      'Petite Anse',
      'Vertières',
      'Quartier Morin'
    ]
  },
  'Jacmel': {
    name: 'Jacmel',
    type: 'neighborhood',
    subdivisions: [
      'Centre-Ville',
      'La Gosseline',
      'Cayes-Jacmel',
      'Cyvadier'
    ]
  },
  'Gonaïves': {
    name: 'Gonaïves',
    type: 'neighborhood',
    subdivisions: [
      'Centre',
      'Raboteau',
      'Bigot',
      'Jubilée'
    ]
  },
  'Les Cayes': {
    name: 'Les Cayes',
    type: 'neighborhood',
    subdivisions: [
      'Centre-Ville',
      'Gelée',
      'Port-Salut'
    ]
  }
}

export const CITIES = Object.keys(CITY_CONFIG)

/**
 * Get subdivisions for a city
 */
export function getSubdivisions(city: string): string[] {
  return CITY_CONFIG[city]?.subdivisions || []
}

/**
 * Get location type label for a city
 */
export function getLocationTypeLabel(city: string): string {
  const type = CITY_CONFIG[city]?.type
  if (type === 'commune') return 'Commune'
  if (type === 'neighborhood') return 'Neighborhood'
  return 'Area'
}

/**
 * Check if city has subdivisions
 */
export function hasSubdivisions(city: string): boolean {
  return (CITY_CONFIG[city]?.subdivisions.length || 0) > 0
}

/**
 * All available categories
 */
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

/**
 * Price filter configurations
 * Can be extended by adding new entries
 */
export const PRICE_FILTERS = [
  { value: 'any', label: 'Any price' },
  { value: 'free', label: 'Free' },
  { value: '<=500', label: '≤ 500 HTG', min: 0, max: 500 },
  { value: '>500', label: '> 500 HTG', min: 500, max: Infinity }
] as const
