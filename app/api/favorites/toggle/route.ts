import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId } = await request.json()

    if (!eventId) {
      return Response.json({ error: 'Event ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if already favorited
    const { data: existing } = await supabase
      .from('event_favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single()

    if (existing) {
      // Remove favorite
      await supabase
        .from('event_favorites')
        .delete()
        .eq('id', existing.id)

      return Response.json({ isFavorite: false })
    } else {
      // Add favorite
      await supabase
        .from('event_favorites')
        .insert({
          user_id: user.id,
          event_id: eventId
        })

      return Response.json({ isFavorite: true })
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
