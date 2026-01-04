import {
  getPromoExpiresAt,
  getPromoStartAt,
  getPromoUsesCount,
  isPromoActive,
  promoDiscountFields,
} from '@/lib/promo-code-shared'

describe('promo-code-shared utilities', () => {
  it('computes percentage discount fields', () => {
    const promo = { discount_type: 'percentage', discount_value: 15 }
    expect(promoDiscountFields(promo)).toEqual({
      discountType: 'percentage',
      discountValue: 15,
      discount_percentage: 15,
    })
  })

  it('computes fixed discount fields', () => {
    const promo = { discount_type: 'fixed', discount_value: 50 }
    expect(promoDiscountFields(promo)).toEqual({
      discountType: 'fixed',
      discountValue: 50,
      discount_amount: 50,
    })
  })

  it('treats missing is_active as active', () => {
    expect(isPromoActive({})).toBe(true)
    expect(isPromoActive({ is_active: true })).toBe(true)
    expect(isPromoActive({ is_active: false })).toBe(false)
  })

  it('prefers expires_at over valid_until', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')
    const exp1 = new Date('2026-02-01T00:00:00.000Z')
    const exp2 = new Date('2026-03-01T00:00:00.000Z')

    expect(getPromoExpiresAt({ expires_at: exp1.toISOString(), valid_until: exp2.toISOString() })?.toISOString()).toBe(
      exp1.toISOString()
    )
    expect(getPromoExpiresAt({ valid_until: exp2.toISOString() })?.toISOString()).toBe(exp2.toISOString())

    // sanity: startAt
    expect(getPromoStartAt({ valid_from: now.toISOString() })?.toISOString()).toBe(now.toISOString())
  })

  it('normalizes uses_count and times_used', () => {
    expect(getPromoUsesCount({ uses_count: 3 })).toBe(3)
    expect(getPromoUsesCount({ times_used: 4 })).toBe(4)
    expect(getPromoUsesCount({})).toBe(0)
  })
})
