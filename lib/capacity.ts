import { createClient } from '@/lib/supabase/server'

interface CapacityCheck {
  available: boolean
  remaining: number
  isSoldOut: boolean
}

export async function checkEventCapacity(
  eventId: string,
  requestedQuantity: number = 1
): Promise<CapacityCheck> {
  const supabase = await createClient()

  // Get event details
  const { data: event } = await supabase
    .from('events')
    .select('max_tickets')
    .eq('id', eventId)
    .single()

  // If no max_tickets set, unlimited capacity
  if (!event || !event.max_tickets) {
    return {
      available: true,
      remaining: Infinity,
      isSoldOut: false
    }
  }

  // Count current tickets (excluding refunded/cancelled)
  const { count } = await supabase
    .from('tickets')
    .select('*', { count: 'exact', head: true })
    .eq('event_id', eventId)
    .not('status', 'in', '(refunded,cancelled)')

  const soldTickets = count || 0
  const remaining = event.max_tickets - soldTickets
  const available = remaining >= requestedQuantity

  return {
    available,
    remaining: Math.max(0, remaining),
    isSoldOut: remaining <= 0
  }
}

export async function addToWaitlist(
  eventId: string,
  userId: string,
  email: string,
  quantity: number = 1
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('waitlist')
    .insert({
      event_id: eventId,
      user_id: userId,
      email: email,
      quantity: quantity,
      status: 'pending'
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function notifyWaitlist(eventId: string, availableQuantity: number) {
  const supabase = await createClient()

  // Get waitlist entries in order
  const { data: waitlistEntries } = await supabase
    .from('waitlist')
    .select('*')
    .eq('event_id', eventId)
    .eq('status', 'pending')
    .is('notified_at', null)
    .order('created_at', { ascending: true })

  if (!waitlistEntries || waitlistEntries.length === 0) {
    return
  }

  let notified = 0
  let remainingSlots = availableQuantity

  for (const entry of waitlistEntries) {
    if (remainingSlots <= 0) break
    if (entry.quantity <= remainingSlots) {
      // Notify this person
      await supabase
        .from('waitlist')
        .update({
          status: 'notified',
          notified_at: new Date().toISOString()
        })
        .eq('id', entry.id)

      // TODO: Send email notification
      
      remainingSlots -= entry.quantity
      notified++
    }
  }

  return notified
}
