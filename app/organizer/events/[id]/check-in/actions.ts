'use server'

import { adminDb } from '@/lib/firebase/admin'
import { revalidatePath } from 'next/cache'

export async function checkInTicket(
  eventId: string,
  qrCode: string,
  entryPoint: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find ticket by QR code or ticket ID
    const ticketsSnapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get()

    const ticketDoc = ticketsSnapshot.docs.find(
      (doc: any) => doc.data().qr_code === qrCode || doc.id === qrCode
    )

    if (!ticketDoc) {
      return { success: false, error: 'Ticket not found' }
    }

    const ticketData = ticketDoc.data()

    // Check if already checked in
    if (ticketData.checked_in) {
      return { success: false, error: 'Already checked in' }
    }

    // Check ticket status
    if (ticketData.status !== 'valid' && ticketData.status !== 'confirmed') {
      return { success: false, error: `Ticket is ${ticketData.status}` }
    }

    // Update ticket
    await adminDb.collection('tickets').doc(ticketDoc.id).update({
      checked_in: true,
      checked_in_at: new Date(),
      entry_point: entryPoint,
      updated_at: new Date(),
    })

    revalidatePath(`/organizer/events/${eventId}/check-in`)
    revalidatePath(`/organizer/events/${eventId}/attendees`)

    return { success: true }
  } catch (error) {
    console.error('Check-in error:', error)
    return { success: false, error: 'Check-in failed' }
  }
}
