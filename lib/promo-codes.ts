/**
 * Promo code utilities for discount calculations
 */

interface PromoCode {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed_amount'
  discount_value: number
}

export function calculateDiscount(
  originalPrice: number,
  promoCode: PromoCode
): { discountedPrice: number; discountAmount: number } {
  let discountAmount = 0

  if (promoCode.discount_type === 'percentage') {
    discountAmount = (originalPrice * promoCode.discount_value) / 100
  } else {
    discountAmount = promoCode.discount_value
  }

  // Ensure discount doesn't exceed original price
  discountAmount = Math.min(discountAmount, originalPrice)

  const discountedPrice = Math.max(0, originalPrice - discountAmount)

  return {
    discountedPrice: Math.round(discountedPrice * 100) / 100, // Round to 2 decimals
    discountAmount: Math.round(discountAmount * 100) / 100,
  }
}

export function formatDiscount(promoCode: PromoCode): string {
  if (promoCode.discount_type === 'percentage') {
    return `${promoCode.discount_value}% off`
  } else {
    return `$${promoCode.discount_value} off`
  }
}

export async function trackPromoCodeUsage(
  promoCodeId: string,
  userId: string,
  ticketId: string,
  discountApplied: number,
  supabase: any
): Promise<void> {
  // Insert usage record
  await supabase.from('promo_code_usage').insert({
    promo_code_id: promoCodeId,
    user_id: userId,
    ticket_id: ticketId,
    discount_applied: discountApplied,
  })
  
  // Increment uses_count in promo_codes table
  const { data: promoCode } = await supabase
    .from('promo_codes')
    .select('uses_count')
    .eq('id', promoCodeId)
    .single()
  
  if (promoCode) {
    await supabase
      .from('promo_codes')
      .update({ uses_count: (promoCode.uses_count || 0) + 1 })
      .eq('id', promoCodeId)
  }
}
