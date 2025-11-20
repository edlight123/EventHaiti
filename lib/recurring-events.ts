import { createClient } from '@/lib/firebase-db/server'

interface RecurringEventParams {
  eventData: any
  recurrencePattern: 'daily' | 'weekly' | 'monthly'
  occurrences: number
  endDate?: string
}

export async function createRecurringEvents(params: RecurringEventParams) {
  const { eventData, recurrencePattern, occurrences, endDate } = params
  const supabase = await createClient()

  const events = []
  const startDate = new Date(eventData.start_datetime)
  const duration = eventData.end_datetime
    ? new Date(eventData.end_datetime).getTime() - startDate.getTime()
    : 2 * 60 * 60 * 1000 // Default 2 hours

  // Create parent event
  const { data: parentEvent, error: parentError } = await supabase
    .from('events')
    .insert({
      ...eventData,
      is_recurring: true,
      recurrence_pattern: recurrencePattern,
      recurrence_end_date: endDate || null
    })
    .select()
    .single()

  if (parentError || !parentEvent) {
    throw new Error('Failed to create parent event')
  }

  events.push(parentEvent)

  // Create child events
  let currentDate = new Date(startDate)
  const maxDate = endDate ? new Date(endDate) : null

  for (let i = 1; i < occurrences; i++) {
    // Calculate next occurrence
    switch (recurrencePattern) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + 1)
        break
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + 7)
        break
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1)
        break
    }

    // Check if we've exceeded the end date
    if (maxDate && currentDate > maxDate) {
      break
    }

    const childStartTime = new Date(currentDate)
    const childEndTime = new Date(childStartTime.getTime() + duration)

    const { data: childEvent, error: childError } = await supabase
      .from('events')
      .insert({
        ...eventData,
        start_datetime: childStartTime.toISOString(),
        end_datetime: childEndTime.toISOString(),
        is_recurring: true,
        recurrence_pattern: recurrencePattern,
        parent_event_id: parentEvent.id
      })
      .select()
      .single()

    if (!childError && childEvent) {
      events.push(childEvent)
    }
  }

  return events
}

export async function updateRecurringSeries(
  parentEventId: string,
  updates: any,
  applyToFutureOnly: boolean = false
) {
  const supabase = await createClient()

  if (applyToFutureOnly) {
    // Only update future events
    const { error } = await supabase
      .from('events')
      .update(updates)
      .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)
      .gte('start_datetime', new Date().toISOString())

    return !error
  } else {
    // Update all events in the series
    const { error } = await supabase
      .from('events')
      .update(updates)
      .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)

    return !error
  }
}

export async function deleteRecurringSeries(
  parentEventId: string,
  deleteFutureOnly: boolean = false
) {
  const supabase = await createClient()

  if (deleteFutureOnly) {
    // Only delete future events
    const { error } = await supabase
      .from('events')
      .delete()
      .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)
      .gte('start_datetime', new Date().toISOString())

    return !error
  } else {
    // Delete all events in the series
    const { error } = await supabase
      .from('events')
      .delete()
      .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)

    return !error
  }
}

export async function getRecurringSeries(parentEventId: string) {
  const supabase = await createClient()

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .or(`id.eq.${parentEventId},parent_event_id.eq.${parentEventId}`)
    .order('start_datetime', { ascending: true })

  return events || []
}
