import { getCurrentUser } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'

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

    // Check if already favorited
    const favoritesRef = adminDb.collection('event_favorites')
    const existingQuery = await favoritesRef
      .where('user_id', '==', user.id)
      .where('event_id', '==', eventId)
      .limit(1)
      .get()

    if (!existingQuery.empty) {
      // Remove favorite
      const favoriteDoc = existingQuery.docs[0]
      await favoriteDoc.ref.delete()

      return Response.json({ isFavorite: false })
    } else {
      // Add favorite
      await favoritesRef.add({
        user_id: user.id,
        event_id: eventId,
        created_at: new Date()
      })

      return Response.json({ isFavorite: true })
    }
  } catch (error) {
    console.error('Error toggling favorite:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
