type AnyRecord = Record<string, any>

function toDate(value: any): Date | null {
  if (!value) return null
  if (value instanceof Date) return value

  // Firestore Timestamp-like
  if (typeof value?.toDate === 'function') {
    try {
      const d = value.toDate()
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null
    } catch {
      return null
    }
  }

  if (typeof value === 'string') {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? null : d
  }

  return null
}

export function getPromoStartAt(promo: AnyRecord): Date | null {
  return toDate(promo?.valid_from)
}

export function getPromoExpiresAt(promo: AnyRecord): Date | null {
  // Canonical field used in the organizer UI
  const exp = toDate(promo?.expires_at)
  if (exp) return exp

  // Legacy field used by some API routes
  return toDate(promo?.valid_until)
}

export function getPromoUsesCount(promo: AnyRecord): number {
  const uses = promo?.uses_count ?? promo?.times_used ?? 0
  const n = Number(uses)
  return Number.isFinite(n) ? n : 0
}

export function isPromoActive(promo: AnyRecord): boolean {
  // Treat missing field as active.
  const v = promo?.is_active
  if (v === undefined || v === null) return true
  return Boolean(v)
}

export function promoDiscountFields(promo: AnyRecord): {
  discount_percentage?: number
  discount_amount?: number
  discountType: 'percentage' | 'fixed'
  discountValue: number
} {
  const rawType = String(promo?.discount_type || '').toLowerCase()
  const rawValue = Number(promo?.discount_value)
  const discountValue = Number.isFinite(rawValue) ? rawValue : 0

  const normalizedType: 'percentage' | 'fixed' =
    rawType === 'percentage' ? 'percentage' : 'fixed'

  if (normalizedType === 'percentage') {
    return {
      discountType: 'percentage',
      discountValue,
      discount_percentage: discountValue,
    }
  }

  return {
    discountType: 'fixed',
    discountValue,
    discount_amount: discountValue,
  }
}
