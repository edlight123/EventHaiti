/**
 * IP-based geolocation utilities
 * 
 * PRIMARY: Uses Vercel's built-in geolocation headers (FREE, no setup)
 * FALLBACK: Uses ip-api.com for local development only
 */

export interface GeoLocation {
  country: string
  countryCode: string
  city: string
  region: string
}

// Map detected country codes to our supported countries
const SUPPORTED_COUNTRIES: Record<string, string> = {
  'HT': 'HT', // Haiti
  'US': 'US', // United States
  'CA': 'CA', // Canada
  'FR': 'FR', // France
  'DO': 'DO', // Dominican Republic
}

const COUNTRY_NAMES: Record<string, string> = {
  'HT': 'Haiti',
  'US': 'United States',
  'CA': 'Canada',
  'FR': 'France',
  'DO': 'Dominican Republic'
}

// Map common cities to our city names in the config
const CITY_MAPPING: Record<string, Record<string, string>> = {
  'US': {
    'New York': 'New York, NY',
    'New York City': 'New York, NY',
    'Brooklyn': 'New York, NY',
    'Manhattan': 'New York, NY',
    'Queens': 'New York, NY',
    'Los Angeles': 'Los Angeles, CA',
    'Miami': 'Miami, FL',
    'Houston': 'Houston, TX',
    'Chicago': 'Chicago, IL',
    'Atlanta': 'Atlanta, GA',
    'Boston': 'Boston, MA',
    'Orlando': 'Orlando, FL',
  },
  'CA': {
    'Toronto': 'Toronto, ON',
    'Montreal': 'Montreal, QC',
    'Montréal': 'Montreal, QC',
    'Vancouver': 'Vancouver, BC',
    'Calgary': 'Calgary, AB',
    'Ottawa': 'Ottawa, ON',
  },
  'HT': {
    'Port-au-Prince': 'Port-au-Prince',
    'Cap-Haïtien': 'Cap-Haïtien',
    'Cap-Haitien': 'Cap-Haïtien',
    'Gonaïves': 'Gonaïves',
    'Les Cayes': 'Les Cayes',
    'Jacmel': 'Jacmel',
    'Port-de-Paix': 'Port-de-Paix',
    'Jérémie': 'Jérémie',
    'Saint-Marc': 'Saint-Marc',
  },
  'FR': {
    'Paris': 'Paris',
    'Lyon': 'Lyon',
    'Marseille': 'Marseille',
    'Nice': 'Nice',
    'Toulouse': 'Toulouse',
    'Bordeaux': 'Bordeaux',
  },
  'DO': {
    'Santo Domingo': 'Santo Domingo',
    'Santiago': 'Santiago',
    'Punta Cana': 'Punta Cana',
    'La Romana': 'La Romana',
    'Puerto Plata': 'Puerto Plata',
  }
}

/**
 * Extract geolocation from Vercel's automatic headers
 * 
 * Vercel automatically adds these headers at the edge - FREE, no setup required:
 * - x-vercel-ip-country: Country code (US, HT, CA, etc.)
 * - x-vercel-ip-city: City name (URL encoded)
 * - x-vercel-ip-country-region: State/province code
 * 
 * @see https://vercel.com/docs/edge-network/headers#x-vercel-ip-country
 */
export function getLocationFromVercelHeaders(headers: Headers): GeoLocation | null {
  const countryCode = headers.get('x-vercel-ip-country')
  const city = headers.get('x-vercel-ip-city')
  const region = headers.get('x-vercel-ip-country-region')
  
  if (!countryCode) {
    return null
  }
  
  return {
    countryCode,
    country: COUNTRY_NAMES[countryCode] || countryCode,
    city: city ? decodeURIComponent(city) : '',
    region: region || ''
  }
}

/**
 * Fallback for local development - uses ip-api.com
 * Only called when Vercel headers aren't available (localhost)
 */
export async function detectLocationFromIP(ip?: string): Promise<GeoLocation | null> {
  try {
    const url = ip 
      ? `http://ip-api.com/json/${ip}?fields=status,country,countryCode,city,regionName`
      : `http://ip-api.com/json/?fields=status,country,countryCode,city,regionName`
    
    const response = await fetch(url, {
      next: { revalidate: 3600 } // Cache for 1 hour
    })
    
    if (!response.ok) {
      return null
    }
    
    const data = await response.json()
    
    if (data.status !== 'success') {
      return null
    }
    
    return {
      country: data.country,
      countryCode: data.countryCode,
      city: data.city,
      region: data.regionName
    }
  } catch (error) {
    console.error('Failed to detect location from IP:', error)
    return null
  }
}

/**
 * Map detected location to our supported countries/cities
 */
export function mapToSupportedLocation(geo: GeoLocation): {
  countryCode: string
  countryName: string
  city: string | null
  isSupported: boolean
} {
  const countryCode = SUPPORTED_COUNTRIES[geo.countryCode]
  
  if (!countryCode) {
    // Country not supported, default to Haiti
    return {
      countryCode: 'HT',
      countryName: 'Haiti',
      city: null,
      isSupported: false
    }
  }
  
  // Try to map the city
  const cityMapping = CITY_MAPPING[countryCode] || {}
  const mappedCity = cityMapping[geo.city] || null
  
  return {
    countryCode,
    countryName: COUNTRY_NAMES[countryCode] || geo.country,
    city: mappedCity,
    isSupported: true
  }
}

/**
 * Get display name for detected location
 */
export function getLocationDisplayName(geo: GeoLocation, mapped: ReturnType<typeof mapToSupportedLocation>): string {
  if (mapped.city) {
    return mapped.city
  }
  
  // If city not mapped but in supported country, show original city + country
  if (mapped.isSupported && geo.city) {
    return `${geo.city}, ${mapped.countryName}`
  }
  
  // Just show country
  return mapped.countryName
}
