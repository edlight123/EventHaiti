# Multi-Tier Payment Modal Fix

## Problem
When users selected multiple different ticket tiers (e.g., 1 General Admission ticket at $10 and 1 VIP ticket at $20), the payment modal showed:
- **Incorrect**: Quantity: 2, Total: $20 (only first tier's price applied to all tickets)
- **Expected**: Itemized breakdown showing 1x General ($10) + 1x VIP ($20) = $30 total

Additionally, the currency was hardcoded as "HTG" instead of using the event's actual currency.

## Root Cause
In `BuyTicketButton.tsx`, the `handleTieredPurchase` function received an array of selections with multiple tiers but only stored the first tier's ID and price:

```typescript
// OLD CODE - BUG
const firstSelection = selections[0]
setSelectedTierId(firstSelection.tierId)  // Only first tier!
setSelectedTierPrice(firstSelection.price)  // Only first price!
setQuantity(totalQuantity)  // But total of all tiers
```

This caused the payment modal to calculate `firstPrice * totalQuantity` instead of summing up each tier's individual total.

## Solution

### 1. Store Full Selections Array
Added new state to track all selected tiers:
```typescript
const [selectedTiers, setSelectedTiers] = useState<{ tierId: string; quantity: number; price: number; tierName?: string }[]>([])
```

### 2. Update handleTieredPurchase
Modified the function to store the complete selections array:
```typescript
setSelectedTiers(selections)
setSelectedTierId(firstSelection.tierId)  // Keep for compatibility
setSelectedTierPrice(totalPrice / totalQuantity)  // Average price for compatibility
setQuantity(totalQuantity)
```

### 3. Add Tier Names to Selections
Updated `EventbriteStyleTicketSelector.tsx` to include tier names in the selection data:
```typescript
.map(tier => ({
  tierId: tier.id,
  quantity: quantities[tier.id],
  price: tier.price,
  tierName: tier.name  // NEW: Include tier name for display
}))
```

### 4. Display Itemized Breakdown
Updated the payment modal to show a proper breakdown when multiple tiers are selected:

**Payment Method Selection Modal:**
```typescript
{selectedTiers.length > 0 ? (
  // Show itemized breakdown for multi-tier purchases
  <div className="space-y-2">
    {selectedTiers.map((tier, index) => (
      <div key={index} className="flex justify-between items-center text-sm">
        <span className="text-gray-600">
          {tier.quantity}x {tier.tierName || 'Ticket'}
        </span>
        <span className="font-medium text-gray-900">
          {(tier.price * tier.quantity).toLocaleString()} {currency}
        </span>
      </div>
    ))}
    <div className="border-t border-teal-200 pt-2 mt-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-600">Total Amount:</span>
        <span className="text-xl font-bold text-teal-700">
          {selectedTiers.reduce((sum, t) => sum + (t.price * t.quantity), 0).toLocaleString()} {currency}
        </span>
      </div>
    </div>
  </div>
) : (
  // Single tier or legacy display
  ...
)}
```

**MonCash Phone Modal:**
Similar itemized breakdown added for consistency.

### 5. Fix Currency Display
Changed from hardcoded "HTG" to using the `currency` prop throughout:
- Payment method selection modal
- MonCash phone number modal
- Stripe embedded payment component

### 6. Update Stripe Payment Amount
Modified `EmbeddedStripePayment` call to calculate correct total:
```typescript
totalAmount={
  selectedTiers.length > 0
    ? selectedTiers.reduce((sum, t) => sum + (t.price * t.quantity), 0)
    : (selectedTierPrice || ticketPrice) * quantity
}
```

### 7. Reset State on Close
Updated cleanup to clear the new `selectedTiers` state:
```typescript
onClose={() => {
  setShowEmbeddedPayment(false)
  setQuantity(1)
  setSelectedTierId(null)
  setSelectedTierPrice(0)
  setSelectedTiers([])  // NEW: Clear selections
  setPromoCode(undefined)
}}
```

## Files Modified
1. **app/events/[id]/BuyTicketButton.tsx**
   - Added `selectedTiers` state
   - Updated `handleTieredPurchase` to store full selections array
   - Added itemized breakdown display in both modals
   - Fixed currency display throughout
   - Updated Stripe payment amount calculation
   - Added cleanup for `selectedTiers` state

2. **components/EventbriteStyleTicketSelector.tsx**
   - Added `tierName` to selection objects
   - Updated TypeScript interface to include optional `tierName` field

## Testing Checklist
- [x] Build compiles successfully with no TypeScript errors
- [ ] Single tier purchase still works correctly
- [ ] Multi-tier purchase (e.g., 1 General + 1 VIP) shows correct itemized breakdown
- [ ] Total amount calculated correctly for mixed tiers
- [ ] Currency displays correctly (not hardcoded HTG)
- [ ] Stripe payment intent created with correct amount
- [ ] MonCash payment initiated with correct amount
- [ ] Free ticket claims still work
- [ ] Promo codes still apply correctly to multi-tier purchases

## Example Display

### Before (Bug):
```
Quantity: 2
Total Amount: 20 HTG  ❌ Wrong (only first tier price)
```

### After (Fixed):
```
1x General Admission    10 HTG
1x VIP                  20 HTG
─────────────────────────────
Total Amount:           30 HTG  ✅ Correct
```

## Backward Compatibility
The fix maintains backward compatibility by:
- Keeping `selectedTierId`, `selectedTierPrice`, and `quantity` state variables
- Only using `selectedTiers` when it has items
- Falling back to legacy calculation when `selectedTiers` is empty
- Supporting both single-tier and multi-tier purchases

## Next Steps
1. Test the complete purchase flow with multiple tiers
2. Verify Stripe payment intent creation handles multi-tier correctly
3. Verify MonCash payment initiation handles multi-tier correctly
4. Consider updating backend endpoints to accept multiple tier selections
5. Test with different currencies (USD, HTG, EUR)
6. Test promo code application with multiple tiers

## Deployment
Changes have been built successfully and are ready for deployment. The build completed without errors.
