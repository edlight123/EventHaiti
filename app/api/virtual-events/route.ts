import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Update event to support virtual/hybrid format
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      eventId,
      isVirtual,
      isHybrid,
      streamingUrl,
      meetingLink,
      platform,
      accessInstructions,
    } = body

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Verify event belongs to user
    const { data: event } = await supabase
      .from('events')
      .select('id, organizer_id')
      .eq('id', eventId)
      .single()

    if (!event || event.organizer_id !== user.id) {
      return NextResponse.json(
        { error: 'Event not found or unauthorized' },
        { status: 404 }
      )
    }

    // Update event with virtual/hybrid settings
    const { error: updateError } = await supabase
      .from('events')
      .update({
        is_virtual: isVirtual,
        is_hybrid: isHybrid,
        streaming_url: streamingUrl || null,
        meeting_link: meetingLink || null,
        virtual_platform: platform || null,
        virtual_access_instructions: accessInstructions || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId)

    if (updateError) {
      console.error('Error updating event:', updateError)
      return NextResponse.json(
        { error: 'Failed to update event' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in PATCH /api/virtual-events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Get virtual event details
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Check if user has ticket or is organizer
    const { data: event } = await supabase
      .from('events')
      .select('id, organizer_id, is_virtual, is_hybrid, streaming_url, meeting_link, virtual_platform, virtual_access_instructions')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    const isOrganizer = event.organizer_id === user.id

    // Check if user has a ticket
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (!isOrganizer && !ticket) {
      return NextResponse.json(
        { error: 'You must have a ticket to access virtual event details' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      isVirtual: event.is_virtual,
      isHybrid: event.is_hybrid,
      streamingUrl: event.streaming_url,
      meetingLink: event.meeting_link,
      platform: event.virtual_platform,
      accessInstructions: event.virtual_access_instructions,
    })
  } catch (error) {
    console.error('Error in GET /api/virtual-events:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
