import { adminDb } from '@/lib/firebase/admin'

export interface AttendeeTicket {
  id: string
  ticketId: string
  eventId: string
  userId: string
  orderId: string
  userName: string
  userEmail: string
  ticketType: string
  price: number
  status: 'valid' | 'used' | 'cancelled' | 'refunded'
  purchasedAt: string
  checkedInAt?: string
  checkedInBy?: string
  qrCode: string
}

export interface AttendeeStats {
  totalTickets: number
  checkedIn: number
  notCheckedIn: number
  refunded: number
  cancelled: number
}

/**
 * Get all attendees for an event with optional filtering
 */
export async function getEventAttendees(
  eventId: string,
  filters?: {
    status?: AttendeeTicket['status']
    search?: string
    ticketType?: string
  }
): Promise<AttendeeTicket[]> {
  try {
    let query = adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)

    if (filters?.status) {
      query = query.where('status', '==', filters.status)
    }

    if (filters?.ticketType) {
      query = query.where('ticket_type', '==', filters.ticketType)
    }

    const snapshot = await query.get()
    let tickets = snapshot.docs.map((doc: any) => {
      const data = doc.data()
      return {
        id: doc.id,
        ticketId: doc.id,
        eventId: data.event_id,
        userId: data.user_id,
        orderId: data.order_id,
        userName: data.user_name || '',
        userEmail: data.user_email || '',
        ticketType: data.ticket_type || 'General Admission',
        price: data.price || 0,
        status: data.status || 'valid',
        purchasedAt: data.purchased_at?.toDate?.()?.toISOString() || data.purchased_at || new Date().toISOString(),
        checkedInAt: data.checked_in_at?.toDate?.()?.toISOString() || data.checked_in_at,
        checkedInBy: data.checked_in_by,
        qrCode: data.qr_code || doc.id,
      } as AttendeeTicket
    })

    // Client-side search filter
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      tickets = tickets.filter((t: any) =>
        t.userName.toLowerCase().includes(searchLower) ||
        t.userEmail.toLowerCase().includes(searchLower) ||
        t.ticketId.toLowerCase().includes(searchLower)
      )
    }

    return tickets.sort((a: any, b: any) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())
  } catch (error) {
    console.error('Error fetching attendees:', error)
    return []
  }
}

/**
 * Get attendee statistics for an event
 */
export async function getAttendeeStats(eventId: string): Promise<AttendeeStats> {
  try {
    const snapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get()

    const stats: AttendeeStats = {
      totalTickets: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      refunded: 0,
      cancelled: 0,
    }

    snapshot.docs.forEach((doc: any) => {
      const data = doc.data()
      stats.totalTickets++

      if (data.status === 'refunded') {
        stats.refunded++
      } else if (data.status === 'cancelled') {
        stats.cancelled++
      } else if (data.checked_in_at) {
        stats.checkedIn++
      } else {
        stats.notCheckedIn++
      }
    })

    return stats
  } catch (error) {
    console.error('Error fetching attendee stats:', error)
    return {
      totalTickets: 0,
      checkedIn: 0,
      notCheckedIn: 0,
      refunded: 0,
      cancelled: 0,
    }
  }
}

/**
 * Get unique ticket types for an event
 */
export async function getEventTicketTypes(eventId: string): Promise<string[]> {
  try {
    const snapshot = await adminDb
      .collection('tickets')
      .where('event_id', '==', eventId)
      .get()

    const types = new Set<string>()
    snapshot.docs.forEach((doc: any) => {
      const ticketType = doc.data().ticket_type || 'General Admission'
      types.add(ticketType)
    })

    return Array.from(types).sort()
  } catch (error) {
    console.error('Error fetching ticket types:', error)
    return []
  }
}

/**
 * Export attendees to CSV format
 */
export function exportAttendeesToCSV(attendees: AttendeeTicket[]): string {
  const headers = [
    'Ticket ID',
    'Name',
    'Email',
    'Ticket Type',
    'Price',
    'Status',
    'Purchased At',
    'Checked In At',
    'Checked In By'
  ]

  const rows = attendees.map(a => [
    a.ticketId,
    a.userName,
    a.userEmail,
    a.ticketType,
    `$${(a.price / 100).toFixed(2)}`,
    a.status,
    new Date(a.purchasedAt).toLocaleString(),
    a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : '',
    a.checkedInBy || ''
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}
