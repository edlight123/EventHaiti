// Centralized event validation for create/edit forms

export interface EventFormData {
  title: string
  description: string
  category: string
  venue_name: string
  country?: string
  city: string
  commune: string
  address: string
  start_datetime: string
  end_datetime: string
  ticket_price: string | number
  total_tickets: string | number
  currency: string
  banner_image_url: string
  is_published: boolean
  is_online?: boolean
  join_url?: string
  tags?: string[]
}

export interface TicketTier {
  name: string
  price: string | number
  quantity: string | number
  description?: string
  salesStart?: string
  salesEnd?: string
}

export interface TabValidation {
  id: string
  title: string
  isComplete: boolean
  missingFields: string[]
  warnings: string[]
}

export interface EventCompletion {
  percentage: number
  completedSections: number
  totalSections: number
  tabs: TabValidation[]
  canPublish: boolean
  blockingIssues: string[]
}

const MIN_DESCRIPTION_LENGTH = 80
const MIN_TITLE_LENGTH = 5

/**
 * Validate Basic Info tab
 */
function validateBasicInfo(data: EventFormData): TabValidation {
  const missingFields: string[] = []
  const warnings: string[] = []

  if (!data.title || data.title.trim().length < MIN_TITLE_LENGTH) {
    missingFields.push(`Event title (min ${MIN_TITLE_LENGTH} characters)`)
  }
  
  if (!data.category || data.category.trim() === '') {
    missingFields.push('Event category')
  }
  
  if (!data.banner_image_url || data.banner_image_url.trim() === '') {
    missingFields.push('Cover/banner image')
  }

  if (data.title && data.title.length > 100) {
    warnings.push('Title is very long - consider shortening')
  }

  return {
    id: 'basic',
    title: 'Basic Info',
    isComplete: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Validate Location tab
 */
function validateLocation(data: EventFormData): TabValidation {
  const missingFields: string[] = []
  const warnings: string[] = []

  if (!data.country || data.country.trim() === '') {
    missingFields.push('Country')
  }

  if (!data.city || data.city.trim() === '') {
    missingFields.push('City')
  }
  
  if (!data.commune || data.commune.trim() === '') {
    missingFields.push('Commune/Subarea')
  }

  // Check if online or in-person
  if (data.is_online) {
    if (!data.join_url || data.join_url.trim() === '') {
      missingFields.push('Online event join URL/link')
    }
  } else {
    if (!data.venue_name || data.venue_name.trim() === '') {
      missingFields.push('Venue name')
    }
    if (!data.address || data.address.trim() === '') {
      missingFields.push('Full venue address')
    }
  }

  return {
    id: 'location',
    title: 'Location',
    isComplete: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Validate Schedule tab
 */
function validateSchedule(data: EventFormData): TabValidation {
  const missingFields: string[] = []
  const warnings: string[] = []

  if (!data.start_datetime || data.start_datetime.trim() === '') {
    missingFields.push('Start date and time')
  }

  // Validate start time is in the future
  if (data.start_datetime) {
    const startDate = new Date(data.start_datetime)
    const now = new Date()
    
    if (startDate < now) {
      warnings.push('Event start time is in the past')
    }
    
    // Check if end time is after start time
    if (data.end_datetime) {
      const endDate = new Date(data.end_datetime)
      if (endDate <= startDate) {
        warnings.push('End time must be after start time')
      }
      
      // Warn if event is very long
      const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60)
      if (durationHours > 168) { // 7 days
        warnings.push('Event duration is very long (over 7 days)')
      }
    }
  }

  return {
    id: 'schedule',
    title: 'Schedule',
    isComplete: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Validate Tickets tab
 */
function validateTickets(data: EventFormData, tiers?: TicketTier[]): TabValidation {
  const missingFields: string[] = []
  const warnings: string[] = []

  // Must have at least base ticket OR at least one tier
  const hasBaseTicket = data.total_tickets && parseInt(data.total_tickets.toString()) > 0
  const hasValidTiers = tiers && tiers.length > 0 && tiers.some(t => 
    t.name && t.price !== '' && parseInt(t.quantity.toString()) > 0
  )

  if (!hasBaseTicket && !hasValidTiers) {
    missingFields.push('At least one ticket tier with quantity')
  }

  // Price must be set (0 is valid for free)
  if (data.ticket_price === '' || data.ticket_price === null || data.ticket_price === undefined) {
    missingFields.push('Ticket price (use 0 for free events)')
  }

  if (!data.currency || data.currency.trim() === '') {
    missingFields.push('Currency')
  }

  // Warnings
  if (hasBaseTicket && parseInt(data.total_tickets.toString()) > 10000) {
    warnings.push('Very large ticket quantity - verify this is correct')
  }

  if (tiers && tiers.length > 0) {
    const incompleteTiers = tiers.filter(t => 
      !t.name || t.price === '' || !t.quantity || parseInt(t.quantity.toString()) === 0
    )
    if (incompleteTiers.length > 0) {
      warnings.push(`${incompleteTiers.length} incomplete ticket tier(s)`)
    }
  }

  return {
    id: 'tickets',
    title: 'Tickets',
    isComplete: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Validate Details tab
 */
function validateDetails(data: EventFormData): TabValidation {
  const missingFields: string[] = []
  const warnings: string[] = []

  if (!data.description || data.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    missingFields.push(`Event description (min ${MIN_DESCRIPTION_LENGTH} characters)`)
  }

  if (data.description && data.description.length > 5000) {
    warnings.push('Description is very long - consider condensing')
  }

  return {
    id: 'details',
    title: 'Details',
    isComplete: missingFields.length === 0,
    missingFields,
    warnings
  }
}

/**
 * Get complete event validation and completion status
 */
export function getEventCompletion(
  data: EventFormData,
  tiers?: TicketTier[]
): EventCompletion {
  const tabs: TabValidation[] = [
    validateBasicInfo(data),
    validateLocation(data),
    validateSchedule(data),
    validateTickets(data, tiers),
    validateDetails(data)
  ]

  const completedSections = tabs.filter(t => t.isComplete).length
  const totalSections = tabs.length
  const percentage = Math.round((completedSections / totalSections) * 100)

  // Gather all blocking issues for publish
  const blockingIssues: string[] = []
  tabs.forEach(tab => {
    if (tab.missingFields.length > 0) {
      blockingIssues.push(...tab.missingFields)
    }
  })

  const canPublish = blockingIssues.length === 0

  return {
    percentage,
    completedSections,
    totalSections,
    tabs,
    canPublish,
    blockingIssues
  }
}

/**
 * Get array of publish-blocking issues with tab references
 */
export function getPublishBlockingIssues(
  data: EventFormData,
  tiers?: TicketTier[]
): Array<{ tab: string; tabId: string; issue: string }> {
  const tabs = [
    validateBasicInfo(data),
    validateLocation(data),
    validateSchedule(data),
    validateTickets(data, tiers),
    validateDetails(data)
  ]

  const issues: Array<{ tab: string; tabId: string; issue: string }> = []

  tabs.forEach(tab => {
    tab.missingFields.forEach(field => {
      issues.push({
        tab: tab.title,
        tabId: tab.id,
        issue: field
      })
    })
  })

  return issues
}

/**
 * Get tab status emoji
 */
export function getTabStatusIcon(isComplete: boolean, hasWarnings: boolean): string {
  if (isComplete && !hasWarnings) return '✅'
  if (isComplete && hasWarnings) return '⚠️'
  return '⚠️'
}
