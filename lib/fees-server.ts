/**
 * Server-only Fee Calculation Utilities
 * 
 * These functions use Firebase Admin and can only be used in server-side code.
 * For client components, use the functions from lib/fees.ts
 */

import { getPlatformSettings } from '@/lib/admin/platform-settings'
import { type EventLocation } from '@/types/platform-settings'
import { calculatePlatformFeeWithPercentage, calculateStripeFee, calculateSettlementDateWithHoldDays } from '@/lib/fees'
import { type FeeCalculation } from '@/types/earnings'

/**
 * Calculate platform fee asynchronously using dynamic settings
 * 
 * @param grossAmount - Total ticket sales in cents
 * @param location - Event location (haiti or us-canada)
 * @returns Platform fee in cents
 */
export async function calculatePlatformFeeAsync(
  grossAmount: number,
  location: EventLocation
): Promise<number> {
  const settings = await getPlatformSettings()
  const feePercentage = location === 'haiti' 
    ? settings.haiti.platformFeePercentage 
    : settings.usCanada.platformFeePercentage
  
  return calculatePlatformFeeWithPercentage(grossAmount, feePercentage)
}

/**
 * Calculate all fees asynchronously using dynamic settings
 * 
 * @param grossAmount - Total ticket sales in cents
 * @param location - Event location (haiti or us-canada)
 * @returns Complete fee breakdown
 */
export async function calculateFeesAsync(
  grossAmount: number,
  location: EventLocation
): Promise<FeeCalculation> {
  const platformFee = await calculatePlatformFeeAsync(grossAmount, location)
  const processingFee = calculateStripeFee(grossAmount)
  const netAmount = grossAmount - platformFee - processingFee

  return {
    grossAmount,
    platformFee,
    processingFee,
    netAmount,
  }
}

/**
 * Calculate settlement ready date asynchronously using dynamic settings
 * 
 * @param eventEndDate - Event end date/time
 * @param location - Event location (haiti or us-canada)
 * @returns Settlement ready date
 */
export async function calculateSettlementDateAsync(
  eventEndDate: Date,
  location: EventLocation
): Promise<Date> {
  const settings = await getPlatformSettings()
  const holdDays = location === 'haiti'
    ? settings.haiti.settlementHoldDays
    : settings.usCanada.settlementHoldDays
  
  return calculateSettlementDateWithHoldDays(eventEndDate, holdDays)
}
