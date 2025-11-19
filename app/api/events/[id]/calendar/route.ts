import { generateICSFile } from '@/lib/calendar'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Fetch event details
    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !event) {
      return new Response('Event not found', { status: 404 })
    }

    // Generate ICS file
    const icsContent = generateICSFile(event)

    // Return as downloadable file
    return new Response(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${event.title.replace(/[^a-z0-9]/gi, '_')}.ics"`
      }
    })
  } catch (error) {
    console.error('Calendar download error:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
