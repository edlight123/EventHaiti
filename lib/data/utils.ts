/**
 * Data Layer Utilities
 * 
 * Shared utility functions for data access operations.
 */

/**
 * Debounce function to limit how often a function can fire.
 * Useful for search inputs, scroll handlers, etc.
 * 
 * @param func - The function to debounce
 * @param wait - The delay in milliseconds (default: 300ms)
 * @returns Debounced function
 * 
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query)
 * }, 300)
 * 
 * // Call it multiple times - only the last call within 300ms will execute
 * debouncedSearch('a')
 * debouncedSearch('ab')
 * debouncedSearch('abc') // Only this one fires
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number = 300
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}

/**
 * Throttle function to ensure a function is called at most once per specified time period.
 * Different from debounce - this ensures the function is called regularly during continuous events.
 * 
 * @param func - The function to throttle
 * @param limit - The time period in milliseconds
 * @returns Throttled function
 * 
 * @example
 * const throttledScroll = throttle(() => {
 *   console.log('Scroll event')
 * }, 100)
 * 
 * window.addEventListener('scroll', throttledScroll)
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

/**
 * Format a Firestore timestamp to ISO string safely
 * Handles both Firestore Timestamp objects and already-converted strings
 */
export function formatTimestamp(timestamp: any): string | null {
  if (!timestamp) return null
  
  if (typeof timestamp === 'string') {
    return timestamp
  }
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString()
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString()
  }
  
  return null
}

/**
 * Batch process items in chunks
 * Useful for Firestore 'in' queries (max 10 items) or rate limiting
 * 
 * @example
 * const userIds = ['id1', 'id2', ..., 'id50']
 * await batchProcess(userIds, 10, async (batch) => {
 *   const query = db.collection('users').where('id', 'in', batch)
 *   return query.get()
 * })
 */
export async function batchProcess<T, R>(
  items: T[],
  batchSize: number,
  processor: (batch: T[]) => Promise<R>
): Promise<R[]> {
  const results: R[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const result = await processor(batch)
    results.push(result)
  }
  
  return results
}
