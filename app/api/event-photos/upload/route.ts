import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { createClient } from '@/lib/firebase-db/server'

/**
 * Upload event photo
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string
    const caption = formData.get('caption') as string | null

    if (!file || !eventId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // In production, upload to cloud storage (Firebase Storage, Cloudinary, S3, etc.)
    // For now, using a placeholder URL
    // TODO: Implement actual file upload to storage service
    
    const photoUrl = `https://placehold.co/800x600/teal/white?text=${encodeURIComponent(file.name)}`
    
    const supabase = await createClient()

    // Verify event exists
    const { data: event } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .single()

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Create photo record
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const { error: insertError } = await supabase.from('event_photos').insert({
      id: photoId,
      event_id: eventId,
      uploaded_by: user.id,
      photo_url: photoUrl,
      caption: caption || null,
      created_at: new Date().toISOString(),
    })

    if (insertError) {
      console.error('Error creating photo record:', insertError)
      return NextResponse.json(
        { error: 'Failed to save photo' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, photoId, photoUrl })
  } catch (error) {
    console.error('Error uploading photo:', error)
    return NextResponse.json(
      { error: 'Failed to upload photo' },
      { status: 500 }
    )
  }
}
