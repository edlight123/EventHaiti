/**
 * Recurring Events Logic
 * Handles generation of event instances from recurrence rules
 */

export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  pattern: RecurrencePattern
  interval: number // Every N days/weeks/months
  daysOfWeek?: number[] // 0-6 (Sunday-Saturday) for weekly events
  dayOfMonth?: number // 1-31 for monthly events
  endDate?: string // ISO date string
  occurrences?: number // Alternative to endDate
}

export interface EventInstance {
  id: string
  parent_event_id: string
  instance_date: string
  instance_time: string
  status: 'scheduled' | 'cancelled' | 'rescheduled'
  capacity_override?: number
  price_override?: number
  created_at: string
}

/**
 * Generate event instances from recurrence rule
 */
export function generateEventInstances(
  parentEventId: string,
  startDate: Date,
  startTime: string,
  rule: RecurrenceRule,
  maxInstances: number = 100
): EventInstance[] {
  const instances: EventInstance[] = []
  
  if (rule.pattern === 'none') {
    return instances
  }

  let currentDate = new Date(startDate)
  const endDate = rule.endDate ? new Date(rule.endDate) : null
  const maxOccurrences = rule.occurrences || maxInstances

  let count = 0
  
  while (count < maxOccurrences) {
    // Check if we've passed the end date
    if (endDate && currentDate > endDate) {
      break
    }

    // For weekly events, check if current day matches required days
    if (rule.pattern === 'weekly' && rule.daysOfWeek) {
      const dayOfWeek = currentDate.getDay()
      
      if (rule.daysOfWeek.includes(dayOfWeek)) {
        instances.push(createInstance(parentEventId, currentDate, startTime, count))
        count++
      }
      
      // Move to next day
      currentDate = addDays(currentDate, 1)
    } 
    // For monthly events
    else if (rule.pattern === 'monthly') {
      const targetDay = rule.dayOfMonth || startDate.getDate()
      
      // Set to target day of month (or last day if target > days in month)
      const year = currentDate.getFullYear()
      const month = currentDate.getMonth()
      const lastDay = new Date(year, month + 1, 0).getDate()
      const actualDay = Math.min(targetDay, lastDay)
      
      currentDate = new Date(year, month, actualDay)
      
      instances.push(createInstance(parentEventId, currentDate, startTime, count))
      count++
      
      // Move to next month
      currentDate = new Date(year, month + rule.interval, actualDay)
    }
    // For daily events
    else if (rule.pattern === 'daily') {
      instances.push(createInstance(parentEventId, currentDate, startTime, count))
      count++
      
      // Move to next occurrence
      currentDate = addDays(currentDate, rule.interval)
    }
    
    // Safety check to prevent infinite loops
    if (instances.length > 1000) {
      console.warn('Generated maximum 1000 instances, stopping')
      break
    }
  }

  return instances
}

/**
 * Create a single event instance
 */
function createInstance(
  parentEventId: string,
  date: Date,
  time: string,
  index: number
): EventInstance {
  const instanceId = `${parentEventId}_instance_${index}_${date.getTime()}`
  
  return {
    id: instanceId,
    parent_event_id: parentEventId,
    instance_date: date.toISOString().split('T')[0],
    instance_time: time,
    status: 'scheduled',
    created_at: new Date().toISOString(),
  }
}

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Get next occurrence date for a recurring event
 */
export function getNextOccurrence(
  lastDate: Date,
  rule: RecurrenceRule
): Date | null {
  if (rule.pattern === 'none') {
    return null
  }

  const nextDate = new Date(lastDate)

  switch (rule.pattern) {
    case 'daily':
      return addDays(nextDate, rule.interval)
    
    case 'weekly':
      // Find next matching day of week
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        let daysToAdd = 1
        const currentDay = nextDate.getDay()
        
        // Sort days and find next occurrence
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b)
        const nextDay = sortedDays.find(day => day > currentDay)
        
        if (nextDay !== undefined) {
          daysToAdd = nextDay - currentDay
        } else {
          // Wrap to next week
          daysToAdd = 7 - currentDay + sortedDays[0]
        }
        
        return addDays(nextDate, daysToAdd)
      }
      return addDays(nextDate, 7 * rule.interval)
    
    case 'monthly':
      const targetDay = rule.dayOfMonth || lastDate.getDate()
      const newMonth = nextDate.getMonth() + rule.interval
      const year = nextDate.getFullYear() + Math.floor(newMonth / 12)
      const month = newMonth % 12
      
      // Handle day overflow (e.g., Jan 31 -> Feb 28)
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const actualDay = Math.min(targetDay, lastDayOfMonth)
      
      return new Date(year, month, actualDay)
    
    default:
      return null
  }
}

/**
 * Check if a date matches a recurrence rule
 */
export function matchesRecurrenceRule(
  date: Date,
  startDate: Date,
  rule: RecurrenceRule
): boolean {
  if (rule.pattern === 'none') {
    return false
  }

  // Check if before start date
  if (date < startDate) {
    return false
  }

  // Check if after end date
  if (rule.endDate && date > new Date(rule.endDate)) {
    return false
  }

  const daysDiff = Math.floor((date.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  switch (rule.pattern) {
    case 'daily':
      return daysDiff % rule.interval === 0
    
    case 'weekly':
      if (rule.daysOfWeek) {
        const dayOfWeek = date.getDay()
        const weeksDiff = Math.floor(daysDiff / 7)
        return rule.daysOfWeek.includes(dayOfWeek) && weeksDiff % rule.interval === 0
      }
      return false
    
    case 'monthly':
      const targetDay = rule.dayOfMonth || startDate.getDate()
      const monthsDiff = 
        (date.getFullYear() - startDate.getFullYear()) * 12 +
        (date.getMonth() - startDate.getMonth())
      
      return date.getDate() === targetDay && monthsDiff % rule.interval === 0
    
    default:
      return false
  }
}

/**
 * Format recurrence rule as human-readable text
 */
export function formatRecurrenceRule(rule: RecurrenceRule): string {
  if (rule.pattern === 'none') {
    return 'Does not repeat'
  }

  const intervalText = rule.interval > 1 ? `every ${rule.interval}` : 'every'
  
  switch (rule.pattern) {
    case 'daily':
      return `Repeats ${intervalText} day${rule.interval > 1 ? 's' : ''}`
    
    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const dayNames = rule.daysOfWeek.map(d => days[d]).join(', ')
        return `Repeats ${intervalText} week${rule.interval > 1 ? 's' : ''} on ${dayNames}`
      }
      return `Repeats ${intervalText} week${rule.interval > 1 ? 's' : ''}`
    
    case 'monthly':
      const dayText = rule.dayOfMonth ? `on day ${rule.dayOfMonth}` : 'on the same day'
      return `Repeats ${intervalText} month${rule.interval > 1 ? 's' : ''} ${dayText}`
    
    default:
      return 'Custom recurrence'
  }
}
