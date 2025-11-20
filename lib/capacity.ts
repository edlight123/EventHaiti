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
  const { data: tickets } = await supabase
    .from('tickets')
    .select('*')
    .eq('event_id', eventId)
    .not('status', 'in', '(refunded,cancelled)')

  const soldTickets = tickets?.length || 0
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

      // Send email notification
      try {
        const { sendEmail, getWaitlistNotificationEmail } = await import('@/lib/email')
        const { data: event } = await supabase
          .from('events')
          .select('title, start_datetime')
          .eq('id', eventId)
          .single()

        if (event) {
          await sendEmail({
            to: entry.email,
            subject: `Tickets Available: ${event.title}`,
            html: getWaitlistNotificationEmail({
              eventTitle: event.title,
              eventDate: event.start_datetime,
              quantity: entry.quantity,
              eventId: eventId
            })
          })

          // Also send SMS if phone number available
          if (entry.phone) {
            try {
              const { sendSms, getWaitlistAvailableSms } = await import('@/lib/sms')
              await sendSms({
                to: entry.phone,
                message: getWaitlistAvailableSms({
                  eventTitle: event.title,
                  quantity: entry.quantity,
                  eventUrl: `${process.env.NEXT_PUBLIC_APP_URL}/events/${eventId}`
                })
              })
            } catch (smsError) {
              console.error('Failed to send SMS notification:', smsError)
              // Continue - email was sent
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send waitlist notification:', emailError)
      }
      
      remainingSlots -= entry.quantity
      notified++
    }
  }

  return notified
}
