'use server'

import { adminDb } from '@/lib/firebase/admin'
import { revalidatePath } from 'next/cache'

export async function resendTicketEmail(ticketId: string, eventId: string) {
  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()
    
    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    // TODO: Integrate with email service to resend ticket
    // For now, just mark as action taken
    await ticketDoc.ref.update({
      last_email_sent: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error resending ticket:', error)
    return { success: false, error: 'Failed to resend ticket' }
  }
}

export async function refundTicket(ticketId: string, eventId: string) {
  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()
    
    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()
    
    // Check if already refunded
    if (ticketData?.status === 'refunded') {
      return { success: false, error: 'Ticket already refunded' }
    }

    // Check if checked in (can't refund checked-in tickets)
    if (ticketData?.checked_in_at) {
      return { success: false, error: 'Cannot refund checked-in ticket' }
    }

    // Update ticket status
    await ticketDoc.ref.update({
      status: 'refunded',
      refunded_at: new Date(),
      updated_at: new Date(),
    })

    // TODO: Integrate with payment processor to issue refund
    // For now, just update the status

    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error refunding ticket:', error)
    return { success: false, error: 'Failed to refund ticket' }
  }
}

export async function cancelTicket(ticketId: string, eventId: string) {
  try {
    const ticketDoc = await adminDb.collection('tickets').doc(ticketId).get()
    
    if (!ticketDoc.exists) {
      return { success: false, error: 'Ticket not found' }
    }

    await ticketDoc.ref.update({
      status: 'cancelled',
      cancelled_at: new Date(),
      updated_at: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/attendees`)
    return { success: true }
  } catch (error) {
    console.error('Error cancelling ticket:', error)
    return { success: false, error: 'Failed to cancel ticket' }
  }
}
