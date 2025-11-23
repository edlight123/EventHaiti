import { createClient } from '@/lib/firebase-db/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { eventId, rating, reviewText } = await request.json()

    if (!eventId || !rating) {
      return Response.json({ error: 'Event ID and rating required' }, { status: 400 })
    }

    if (rating < 1 || rating > 5) {
      return Response.json({ error: 'Rating must be between 1 and 5' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if user has attended this event
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id')
      .eq('attendee_id', user.id)
      .eq('event_id', eventId)
      .single()

    if (!ticket) {
      return Response.json({ error: 'You must have attended this event to review it' }, { status: 403 })
    }

    // Check if already reviewed
    const { data: existing } = await supabase
      .from('event_reviews')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_id', eventId)
      .single()

    if (existing) {
      // Update existing review
      await supabase
        .from('event_reviews')
        .update({
          rating,
          review_text: reviewText || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
    } else {
      // Create new review
      await supabase
        .from('event_reviews')
        .insert({
          user_id: user.id,
          event_id: eventId,
          rating,
          review_text: reviewText || null
        })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error('Error submitting review:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    if (!eventId) {
      return Response.json({ error: 'Event ID required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all reviews for this event
    const { data: reviews, error } = await supabase
      .from('event_reviews')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get user data separately
    const userIds = reviews?.map((r: any) => r.user_id) || []
    const { data: users } = await supabase
      .from('users')
      .select('id, full_name')
      .in('id', userIds)

    const usersMap = new Map(users?.map((u: any) => [u.id, u]) || [])

    // Join reviews with user data
    const reviewsWithUsers = reviews?.map((review: any) => ({
      ...review,
      user: usersMap.get(review.user_id)
    }))

    // Calculate average rating
    const avgRating = reviews && reviews.length > 0
      ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
      : 0

    return Response.json({
      reviews: reviewsWithUsers,
      avgRating,
      totalReviews: reviews?.length || 0
    })
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return Response.json({ error: 'Internal server error' }, { status: 500 })
  }
}
