import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { organizerId } = await request.json()

    if (!organizerId) {
      return Response.json({ error: 'Organizer ID required' }, { status: 400 })
    }

    if (organizerId === user.id) {
      return Response.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if already following
    const { data: existing } = await supabase
      .from('organizer_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('organizer_id', organizerId)
      .single()

    if (existing) {
      // Unfollow
      await supabase
        .from('organizer_follows')
        .delete()
        .eq('id', existing.id)

      return Response.json({ isFollowing: false })
    } else {
      // Follow
      await supabase
        .from('organizer_follows')
        .insert({
          follower_id: user.id,
          organizer_id: organizerId
        })

      return Response.json({ isFollowing: true })
    }
  } catch (error) {
    console.error('Error toggling follow:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
