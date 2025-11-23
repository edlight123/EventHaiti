import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Verify user owns this event
    const allEventsQuery = await supabase.from('events').select('*')
    const allEvents = allEventsQuery.data || []
    const event = allEvents.find((e: any) => e.id === id && e.organizer_id === user.id)

    if (!event) {
      return NextResponse.json({ error: 'Event not found or unauthorized' }, { status: 404 })
    }

    // Fetch all tickets for this event
    const allTicketsQuery = await supabase.from('tickets').select('*')
    const allTickets = allTicketsQuery.data || []
    const eventTickets = allTickets.filter((t: any) => t.event_id === id)

    // Fetch all users
    const allUsersQuery = await supabase.from('users').select('*')
    const allUsers = allUsersQuery.data || []
    const usersMap = new Map()
    allUsers.forEach((u: any) => {
      usersMap.set(u.id, u)
    })

    // Build CSV
    const headers = ['Ticket ID', 'Attendee Name', 'Email', 'Phone', 'Purchase Date', 'Price', 'Payment Method', 'Status', 'Checked In', 'Check-in Time']
    
    const rows = eventTickets.map((ticket: any) => {
      const attendee = usersMap.get(ticket.attendee_id) || {}
      return [
        ticket.id || '',
        attendee.full_name || 'N/A',
        attendee.email || 'N/A',
        attendee.phone_number || 'N/A',
        ticket.purchased_at ? new Date(ticket.purchased_at).toLocaleString() : 'N/A',
        ticket.price_paid ? `$${ticket.price_paid.toFixed(2)}` : 'Free',
        ticket.payment_method || 'N/A',
        ticket.status || 'valid',
        ticket.checked_in_at ? 'Yes' : 'No',
        ticket.checked_in_at ? new Date(ticket.checked_in_at).toLocaleString() : 'N/A'
      ]
    })

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map((row: string[]) => row.map((cell: string) => `"${cell}"`).join(','))
    ].join('\n')

    // Return as downloadable file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="attendees-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.csv"`
      }
    })
  } catch (error: any) {
    console.error('Export attendees error:', error)
    return NextResponse.json({ error: 'Failed to export attendees' }, { status: 500 })
  }
}
