/**
 * Internationalization formatting utilities using Intl API
 */

/**
 * Format date based on current locale
 */
export function formatDate(date: Date | string, locale: string = 'en', options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }
  
  return new Intl.DateTimeFormat(locale, defaultOptions).format(d)
}

/**
 * Format short date (e.g., "Dec 4, 2025")
 */
export function formatShortDate(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

/**
 * Format time (e.g., "3:30 PM")
 */
export function formatTime(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Format date and time together
 */
export function formatDateTime(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(d)
}

/**
 * Format relative time (e.g., "in 2 days", "3 hours ago")
 */
export function formatRelativeTime(date: Date | string, locale: string = 'en'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((d.getTime() - now.getTime()) / 1000)
  
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  
  const units: { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
    { unit: 'year', seconds: 31536000 },
    { unit: 'month', seconds: 2592000 },
    { unit: 'week', seconds: 604800 },
    { unit: 'day', seconds: 86400 },
    { unit: 'hour', seconds: 3600 },
    { unit: 'minute', seconds: 60 },
    { unit: 'second', seconds: 1 },
  ]
  
  for (const { unit, seconds } of units) {
    if (Math.abs(diffInSeconds) >= seconds) {
      const value = Math.floor(diffInSeconds / seconds)
      return rtf.format(value, unit)
    }
  }
  
  return rtf.format(0, 'second')
}

/**
 * Format currency based on locale
 */
export function formatCurrency(
  amount: number,
  currency: string = 'HTG',
  locale: string = 'en'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format number with locale-specific separators
 */
export function formatNumber(value: number, locale: string = 'en'): string {
  return new Intl.NumberFormat(locale).format(value)
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, locale: string = 'en', decimals: number = 0): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100)
}

/**
 * Get day of week name
 */
export function getDayName(date: Date | string, locale: string = 'en', format: 'long' | 'short' | 'narrow' = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(d)
}

/**
 * Get month name
 */
export function getMonthName(date: Date | string, locale: string = 'en', format: 'long' | 'short' | 'narrow' = 'long'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  
  return new Intl.DateTimeFormat(locale, { month: format }).format(d)
}
