/**
 * Serialization utility for Server Components
 * Recursively converts all Firestore Timestamp objects to ISO strings
 * to prevent "Only plain objects can be passed to Client Components" errors
 */

/**
 * Recursively serialize data to remove Firestore Timestamps and other non-serializable objects
 */
export function serializeData<T = any>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj
  
  // Check if it's a Firestore Timestamp
  if (obj && typeof obj === 'object' && 'toDate' in obj && typeof (obj as any).toDate === 'function') {
    return (obj as any).toDate().toISOString() as T
  }
  
  // Handle Date objects
  if (obj instanceof Date) {
    return obj.toISOString() as T
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => serializeData(item)) as T
  }
  
  // Handle plain objects
  const serialized: any = {}
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      serialized[key] = serializeData((obj as any)[key])
    }
  }
  return serialized as T
}

/**
 * Serialize multiple values at once
 * Useful for pages that pass multiple data props to client components
 */
export function serializeAll<T extends Record<string, any>>(data: T): T {
  const serialized: any = {}
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      serialized[key] = serializeData(data[key])
    }
  }
  return serialized as T
}
