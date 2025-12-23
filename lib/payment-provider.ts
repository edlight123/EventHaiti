export type PaymentProvider = 'sogepay' | 'stripe_connect' | 'stripe'

export function normalizeCountryCode(raw: unknown): string {
  const value = String(raw || '').trim()
  if (!value) return ''

  const upper = value.toUpperCase()
  if (upper === 'HT' || upper === 'HAITI') return 'HT'
  if (upper === 'US' || upper === 'USA' || upper === 'UNITED STATES' || upper === 'UNITED_STATES') return 'US'
  if (upper === 'CA' || upper === 'CAN' || upper === 'CANADA') return 'CA'

  return upper
}

export function getPaymentProviderForEventCountry(country: unknown): PaymentProvider {
  const code = normalizeCountryCode(country)
  if (code === 'HT') return 'sogepay'
  if (code === 'US' || code === 'CA') return 'stripe_connect'
  return 'stripe'
}
