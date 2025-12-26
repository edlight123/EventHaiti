import { NextResponse } from 'next/server'
import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'
import { isAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user || !isAdmin(user.email || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get all tickets for this user
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .eq('attendee_id', user.id)

    // Get all events
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('*')

    // Get total counts
    const { data: allTickets } = await supabase
      .from('tickets')
      .select('*')

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name
      },
      myTickets: {
        count: tickets?.length || 0,
        data: tickets,
        error: ticketsError
      },
      allEvents: {
        count: events?.length || 0,
        data: events?.map((e: any) => ({ id: e.id, title: e.title, organizer_id: e.organizer_id })),
        error: eventsError
      },
      allTicketsInDb: {
        count: allTickets?.length || 0,
        data: allTickets?.map((t: any) => ({ 
          id: t.id, 
          event_id: t.event_id, 
          attendee_id: t.attendee_id,
          status: t.status,
          purchased_at: t.purchased_at
        }))
      }
    })
  } catch (error: any) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
