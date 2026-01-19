# Platform Settings Configuration

## Overview

This system allows administrators to configure platform fees and settlement times dynamically through the admin panel instead of having them hardcoded. Different fee structures can be set for Haiti events vs US/Canada events.

## Architecture

### Files Created/Modified

1. **`/types/platform-settings.ts`**
   - Defines TypeScript interfaces for platform settings
   - Includes `PlatformSettings`, `LocationFeeConfig`, and `EventLocation` types
   - Provides default settings and helper functions

2. **`/lib/admin/platform-settings.ts`**
   - Service layer for managing platform settings in Firestore
   - Functions to get, update, and initialize platform settings
   - Stored in `platform_settings` collection with document ID `global`

3. **`/lib/fees.ts`** (Modified)
   - Added async versions of fee calculation functions
   - `calculatePlatformFeeAsync()` - uses dynamic settings based on location
   - `calculateFeesAsync()` - complete fee breakdown with dynamic rates
   - `calculateSettlementDateAsync()` - uses dynamic settlement hold days
   - Original functions remain for backward compatibility

4. **`/lib/earnings.ts`** (Modified)
   - Updated `deriveEventEarningsFromTickets()` to fetch and use dynamic settings
   - Updated `addTicketToEarnings()` to use location-based fee percentages
   - Modified `calculateEventCurrencyFees()` to accept optional `platformFeePercentage`

5. **`/app/api/admin/settings/route.ts`**
   - API endpoint for managing platform settings
   - GET: Retrieve current settings
   - PATCH: Update settings with validation

6. **`/app/admin/settings/page.tsx`**
   - Admin page for configuring platform settings
   - Server component that handles authentication

7. **`/app/admin/settings/PlatformSettingsForm.tsx`**
   - Client component with form UI for editing settings
   - Real-time validation and feedback
   - Displays current settings summary

8. **`/components/admin/AdminCommandBar.tsx`** (Modified)
   - Added "Settings" link to admin navigation

## Configuration Options

### Haiti Events
- **Platform Fee Percentage**: Default 5% (configurable)
- **Settlement Hold Days**: Default 0 days (configurable)

### US/Canada Events
- **Platform Fee Percentage**: Default 10% (configurable)
- **Settlement Hold Days**: Default 7 days (configurable)

### Global Settings
- **Minimum Payout Amount**: Default $50.00 (configurable)

## Usage

### Admin Interface

1. Navigate to `/admin/settings`
2. Adjust platform fees and settlement times for each region
3. Set minimum payout amount
4. Click "Save Settings" to apply changes

### For Developers

#### Get Current Settings
```typescript
import { getPlatformSettings } from '@/lib/admin/platform-settings'

const settings = await getPlatformSettings()
console.log('Haiti fee:', settings.haiti.platformFeePercentage * 100, '%')
```

#### Calculate Fees with Dynamic Settings
```typescript
import { calculateFeesAsync } from '@/lib/fees'
import { getEventLocation } from '@/types/platform-settings'

const eventCountry = 'HT' // or 'US', 'CA'
const location = getEventLocation(eventCountry)
const fees = await calculateFeesAsync(10000, location) // 10000 cents = $100

console.log('Platform fee:', fees.platformFee)
console.log('Net amount:', fees.netAmount)
```

#### Calculate Settlement Date
```typescript
import { calculateSettlementDateAsync } from '@/lib/fees'
import { getEventLocation } from '@/types/platform-settings'

const eventEndDate = new Date('2026-02-01')
const location = getEventLocation('HT')
const settlementDate = await calculateSettlementDateAsync(eventEndDate, location)

console.log('Settlement ready:', settlementDate)
```

## Firestore Structure

### Collection: `platform_settings`
### Document: `global`

```typescript
{
  haiti: {
    platformFeePercentage: 0.05,  // 5%
    settlementHoldDays: 0
  },
  usCanada: {
    platformFeePercentage: 0.10,  // 10%
    settlementHoldDays: 7
  },
  minimumPayoutAmount: 5000,  // $50.00 in cents
  updatedAt: Timestamp,
  updatedBy: "user_id"
}
```

## Migration & Backward Compatibility

- **Existing code continues to work**: Original fee calculation functions remain unchanged
- **Gradual migration**: New features use async functions, old code can be migrated gradually
- **Default values**: If settings don't exist in Firestore, defaults are used automatically
- **No breaking changes**: All existing functionality preserved

## Security

- **Admin-only access**: Settings page requires admin role
- **API validation**: All updates validated before saving
- **Audit trail**: Settings track who last updated them and when

## Testing

To initialize default settings:

```typescript
import { initializePlatformSettings } from '@/lib/admin/platform-settings'

await initializePlatformSettings()
```

## Benefits

1. **Flexibility**: Change fees without code deployment
2. **Regional pricing**: Different rates for different markets
3. **Business control**: Non-technical admins can adjust rates
4. **Experimentation**: A/B test different fee structures
5. **Compliance**: Quickly adjust to regulatory changes
6. **Transparency**: Settings visible and auditable

## Future Enhancements

Potential additions:
- Per-event category fee overrides
- Tiered pricing based on ticket volume
- Promotional periods with reduced fees
- Currency-specific fee structures
- Dynamic processing fee rates
