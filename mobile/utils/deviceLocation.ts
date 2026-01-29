/**
 * Device location detection utilities
 * Uses expo-localization to get device region (free, no permissions needed)
 */

import * as Localization from 'expo-localization';

// Supported countries
export const SUPPORTED_COUNTRIES = ['HT', 'US', 'CA', 'FR', 'DO'] as const;
export type SupportedCountry = typeof SUPPORTED_COUNTRIES[number];

// Country code to name mapping
export const COUNTRY_NAMES: Record<string, string> = {
  'HT': 'Haiti',
  'US': 'United States',
  'CA': 'Canada',
  'FR': 'France',
  'DO': 'Dominican Republic',
};

// Default cities by country
export const DEFAULT_CITIES: Record<string, string> = {
  'HT': 'Port-au-Prince',
  'US': 'Miami, FL',
  'CA': 'Montreal, QC',
  'FR': 'Paris',
  'DO': 'Santo Domingo',
};

/**
 * Get the device's region/country code from system settings
 * This is instant and requires no permissions
 */
export function getDeviceRegion(): string {
  try {
    // getLocales() returns array of locale objects with region info
    const locales = Localization.getLocales();
    
    if (locales && locales.length > 0) {
      // First locale's region is the device's primary region
      const region = locales[0]?.regionCode;
      if (region) {
        console.log('[DeviceLocation] Detected device region:', region);
        return region.toUpperCase();
      }
      
      // Fallback: try to extract from languageTag (e.g., "en-US" -> "US")
      const languageTag = locales[0]?.languageTag;
      if (languageTag && languageTag.includes('-')) {
        const parts = languageTag.split('-');
        if (parts.length >= 2) {
          const regionFromTag = parts[parts.length - 1].toUpperCase();
          console.log('[DeviceLocation] Extracted region from languageTag:', regionFromTag);
          return regionFromTag;
        }
      }
    }
    
    console.log('[DeviceLocation] Could not detect region, defaulting to HT');
    return 'HT';
  } catch (error) {
    console.error('[DeviceLocation] Error getting device region:', error);
    return 'HT';
  }
}

/**
 * Check if a country code is supported
 */
export function isSupportedCountry(code: string): code is SupportedCountry {
  return SUPPORTED_COUNTRIES.includes(code as SupportedCountry);
}

/**
 * Get a supported country code, defaulting to HT if not supported
 */
export function getSupportedCountry(code: string): SupportedCountry {
  const upperCode = code.toUpperCase();
  return isSupportedCountry(upperCode) ? upperCode : 'HT';
}

/**
 * Get device location info with supported country
 */
export function getDeviceLocationInfo(): {
  country: SupportedCountry;
  countryName: string;
  defaultCity: string;
  isSupported: boolean;
} {
  const detectedRegion = getDeviceRegion();
  const isSupported = isSupportedCountry(detectedRegion);
  const country = getSupportedCountry(detectedRegion);
  
  return {
    country,
    countryName: COUNTRY_NAMES[country] || 'Haiti',
    defaultCity: DEFAULT_CITIES[country] || 'Port-au-Prince',
    isSupported,
  };
}
