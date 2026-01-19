/**
 * Platform Settings Configuration
 * 
 * Defines configurable platform-wide settings including fees and settlement times
 */

/**
 * Location-based fee configuration
 */
export interface LocationFeeConfig {
  /**
   * Platform fee percentage (e.g., 0.10 for 10%)
   */
  platformFeePercentage: number
  
  /**
   * Settlement hold days after event before funds are available
   */
  settlementHoldDays: number
}

/**
 * Platform settings stored in Firestore
 */
export interface PlatformSettings {
  id?: string
  
  /**
   * Fee configuration for Haiti events
   */
  haiti: LocationFeeConfig
  
  /**
   * Fee configuration for US/Canada events
   */
  usCanada: LocationFeeConfig
  
  /**
   * Minimum payout amount in cents
   */
  minimumPayoutAmount: number
  
  /**
   * Last updated timestamp
   */
  updatedAt?: Date | FirebaseFirestore.Timestamp
  
  /**
   * Admin who last updated
   */
  updatedBy?: string
}

/**
 * Default platform settings
 */
export const DEFAULT_PLATFORM_SETTINGS: Omit<PlatformSettings, 'id' | 'updatedAt' | 'updatedBy'> = {
  haiti: {
    platformFeePercentage: 0.05,  // 5% for Haiti events
    settlementHoldDays: 0,         // No hold for Haiti events
  },
  usCanada: {
    platformFeePercentage: 0.10,  // 10% for US/Canada events
    settlementHoldDays: 7,         // 7 days hold for US/Canada events
  },
  minimumPayoutAmount: 5000,      // $50.00 in cents
}

/**
 * Location type for fee calculations
 */
export type EventLocation = 'haiti' | 'us-canada'

/**
 * Determine event location from country code
 */
export function getEventLocation(countryCode: string): EventLocation {
  const normalized = countryCode.toUpperCase().trim()
  if (normalized === 'HT' || normalized === 'HAITI') {
    return 'haiti'
  }
  return 'us-canada'
}
