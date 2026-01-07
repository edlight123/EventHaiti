import { normalizeCountryCode } from '@/lib/payment-provider'

export type EventCurrency = 'USD' | 'CAD' | 'HTG'

export function getAllowedEventCurrencies(country: unknown): EventCurrency[] {
  const code = normalizeCountryCode(country)
  if (code === 'CA') return ['CAD']
  if (code === 'US') return ['USD']
  if (code === 'HT') return ['USD', 'HTG']
  return ['USD']
}

export function normalizeEventCurrencyForCountry(country: unknown, currency: unknown): EventCurrency {
  const allowed = getAllowedEventCurrencies(country)
  const upper = String(currency || '').trim().toUpperCase() as EventCurrency
  if (allowed.includes(upper)) return upper
  return allowed[0]
}

export function isEventCurrencyAllowedForCountry(country: unknown, currency: unknown): boolean {
  const allowed = getAllowedEventCurrencies(country)
  const upper = String(currency || '').trim().toUpperCase() as EventCurrency
  return allowed.includes(upper)
}
